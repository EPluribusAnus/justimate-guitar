import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import SongNav from './components/SongNav';
import SongSheet from './components/SongSheet';
import NotesPanel from './components/NotesPanel';
import SongForm from './components/SongForm';
import FavoriteButton from './components/FavoriteButton';
import TransposerControls from './components/TransposerControls';
import { useLocalStorage } from './hooks/useLocalStorage';
import { defaultSongs } from './data/songs';
import type { Song } from './types';
import { transposeChord } from './utils/chords';
import { buildSongId } from './utils/songContent';
import './App.css';

const AUTOSCROLL_SPEED_STEPS: number[] = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

const normalizeAutoScrollSpeed = (value: number): number => {
  let closest = AUTOSCROLL_SPEED_STEPS[0];
  let smallestDiff = Math.abs(value - closest);
  AUTOSCROLL_SPEED_STEPS.forEach((step) => {
    const diff = Math.abs(value - step);
    if (diff < smallestDiff) {
      closest = step;
      smallestDiff = diff;
    }
  });
  return closest;
};

const App = () => {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('jg/theme/v1', 'light');
  const [customSongs, setCustomSongs] = useLocalStorage<Song[]>('jg/customSongs/v1', []);
  const [favoriteTranspositions, setFavoriteTranspositions] = useLocalStorage<Record<string, number>>(
    'jg/favorites/v1',
    {},
  );
  const [recentTranspositions, setRecentTranspositions] = useLocalStorage<Record<string, number>>(
    'jg/recentTranspose/v1',
    {},
  );
  const [hiddenDefaultSongs, setHiddenDefaultSongs] = useLocalStorage<string[]>('jg/hiddenDefaults/v1', []);
  const visibleDefaultSongs = useMemo(
    () => defaultSongs.filter((song) => !hiddenDefaultSongs.includes(song.id)),
    [hiddenDefaultSongs],
  );

  const songs = useMemo(() => [...visibleDefaultSongs, ...customSongs], [visibleDefaultSongs, customSongs]);

  const [selectedSongId, setSelectedSongId] = useState<string | null>(songs[0]?.id ?? null);
  const [transposeSteps, setTransposeSteps] = useState(0);
  const [formState, setFormState] = useState<{ mode: 'create' | 'edit' | 'copy'; song?: Song } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingFromUltimateGuitar, setIsImportingFromUltimateGuitar] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useLocalStorage<number>('jg/autoscroll/speed/v1', 50);
  const autoScrollFrame = useRef<number | null>(null);
  const autoScrollLast = useRef<number | null>(null);
  const [ugSearchOpen, setUgSearchOpen] = useState(false);
  const [ugSearchQuery, setUgSearchQuery] = useState('');
  const [ugSearchResults, setUgSearchResults] = useState<
    { tabId: number; title: string; artist: string; type: string; rating: number; votes: number; defaultKey?: string; url?: string }[]
  >([]);
  const [ugSearchError, setUgSearchError] = useState<string | null>(null);
  const [isSearchingUg, setIsSearchingUg] = useState(false);
  const [ugImportValue, setUgImportValue] = useState('');
  const [isSavingLibrary, setIsSavingLibrary] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const selectedSong = useMemo(() => songs.find((song) => song.id === selectedSongId) ?? null, [songs, selectedSongId]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!selectedSongId && songs.length) {
      setSelectedSongId(songs[0].id);
    }
    setAutoScrollEnabled(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  }, [selectedSongId, songs]);

  useEffect(() => {
    setAutoScrollSpeed((current) => normalizeAutoScrollSpeed(current));
  }, [setAutoScrollSpeed]);

  useEffect(() => {
    if (!selectedSongId) {
      return;
    }
    const storedFavorite = favoriteTranspositions[selectedSongId];
    const storedRecent = recentTranspositions[selectedSongId];
    const initial = storedFavorite ?? storedRecent ?? 0;
    setTransposeSteps(initial);
  }, [selectedSongId, favoriteTranspositions, recentTranspositions]);

  useEffect(() => {
    queueSaveLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customSongs, favoriteTranspositions, recentTranspositions, hiddenDefaultSongs]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleStorage = () => queueSaveLibrary();
    window.addEventListener('jg-local-storage', handleStorage);
    return () => window.removeEventListener('jg-local-storage', handleStorage);
  }, []);

  useEffect(() => {
    const loadFromServer = async () => {
      try {
        const response = await fetch('/api/library');
        const payload = await response.json().catch(() => ({}));
        const result = (payload as { result?: object | null }).result;
        if (result && typeof result === 'object') {
          applyImportedLibrary(result as object, false);
        }
      } catch (error) {
        console.warn('Unable to load shared library', error);
      }
    };
    void loadFromServer();
  }, []);

  const isFavorite = selectedSongId ? favoriteTranspositions[selectedSongId] === transposeSteps : false;
  const isCustomSong = selectedSong ? customSongs.some((song) => song.id === selectedSong.id) : false;
  const isDefaultSong = selectedSong ? visibleDefaultSongs.some((song) => song.id === selectedSong.id) : false;

  const ensureUniqueId = (candidate: string) => {
    const existing = new Set(songs.map((song) => song.id));
    if (!existing.has(candidate)) {
      return candidate;
    }
    let attempt = 2;
    let id = `${candidate}-${attempt}`;
    while (existing.has(id)) {
      attempt += 1;
      id = `${candidate}-${attempt}`;
    }
    return id;
  };

  const handleSaveSong = (song: Song) => {
    const id = ensureUniqueId(song.id);
    const songWithId = { ...song, id };
    setCustomSongs((current) => [...current, songWithId]);
    setSelectedSongId(songWithId.id);
    setFormState(null);
  };

  const handleRemoveSong = () => {
    if (!selectedSong) {
      return;
    }
    setCustomSongs((current) => {
      const next = current.filter((song) => song.id !== selectedSong.id);
      const combined = [...visibleDefaultSongs, ...next];
      setSelectedSongId((previous) => {
        if (previous === selectedSong.id) {
          return combined[0]?.id ?? null;
        }
        return previous;
      });
      return next;
    });
  };

  const handleUpdateSong = (updated: Song) => {
    setCustomSongs((current) => current.map((song) => (song.id === updated.id ? updated : song)));
    setSelectedSongId(updated.id);
    setFormState(null);
  };

  const handleTransposeChange = (value: number) => {
    if (!selectedSongId) {
      return;
    }
    setTransposeSteps(value);
    setRecentTranspositions((current) => ({ ...current, [selectedSongId]: value }));
  };

  const handleToggleFavorite = () => {
    if (!selectedSongId) {
      return;
    }
    setFavoriteTranspositions((current) => {
      const next = { ...current };
      if (isFavorite) {
        delete next[selectedSongId];
      } else {
        next[selectedSongId] = transposeSteps;
      }
      return next;
    });
  };

  const currentKey = selectedSong ? transposeChord(selectedSong.defaultKey, transposeSteps) : '';

  useEffect(() => {
    if (formState) {
      setAutoScrollEnabled(false);
    }
  }, [formState]);

  useEffect(() => {
    if (!autoScrollEnabled || typeof window === 'undefined') {
      if (autoScrollFrame.current !== null) {
        cancelAnimationFrame(autoScrollFrame.current);
        autoScrollFrame.current = null;
      }
      autoScrollLast.current = null;
      return;
    }

    const scrollElement = document.scrollingElement ?? document.documentElement;

    const step = (timestamp: number) => {
      if (!autoScrollEnabled) {
        return;
      }

      const last = autoScrollLast.current ?? timestamp;
      const deltaSeconds = (timestamp - last) / 1000;
      autoScrollLast.current = timestamp;

      const increment = autoScrollSpeed * deltaSeconds;
      const maxScroll = scrollElement.scrollHeight - window.innerHeight;
      const next = Math.min(scrollElement.scrollTop + increment, maxScroll);
      scrollElement.scrollTop = next;

      if (next >= maxScroll - 1) {
        setAutoScrollEnabled(false);
        return;
      }

      autoScrollFrame.current = requestAnimationFrame(step);
    };

    autoScrollFrame.current = requestAnimationFrame(step);

    const handleInterrupt = () => setAutoScrollEnabled(false);
    window.addEventListener('wheel', handleInterrupt, { passive: true });
    window.addEventListener('touchstart', handleInterrupt, { passive: true });
    window.addEventListener('keydown', handleInterrupt);

    return () => {
      if (autoScrollFrame.current !== null) {
        cancelAnimationFrame(autoScrollFrame.current);
        autoScrollFrame.current = null;
      }
      autoScrollLast.current = null;
      window.removeEventListener('wheel', handleInterrupt);
      window.removeEventListener('touchstart', handleInterrupt);
      window.removeEventListener('keydown', handleInterrupt);
    };
  }, [autoScrollEnabled, autoScrollSpeed]);

  const handleImportUltimateGuitarSource = async (source: string) => {
    if (isImportingFromUltimateGuitar || typeof window === 'undefined') {
      return;
    }

    setIsImportingFromUltimateGuitar(true);
    try {
      const response = await fetch('/api/ultimate-guitar/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? `Request failed with status ${response.status}`);
      }

      const result = (payload as { result?: { song?: Song } }).result;
      if (!result?.song) {
        throw new Error('Import did not return a song.');
      }

      const importedSong = result.song;
      const uniqueId = ensureUniqueId(importedSong.id);
      const preparedSong: Song = {
        ...importedSong,
        id: uniqueId,
      };

      setFormState({ mode: 'create', song: preparedSong });
    } catch (error) {
      window.alert(`Ultimate Guitar import failed: ${(error as Error).message}`);
    } finally {
      setIsImportingFromUltimateGuitar(false);
    }
  };

  const handleSearchUltimateGuitar = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    if (isSearchingUg) {
      return;
    }
    setUgSearchError(null);
    setIsSearchingUg(true);
    try {
      const response = await fetch('/api/ultimate-guitar/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ugSearchQuery.trim(), limit: 12 }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? `Search failed with status ${response.status}`);
      }
      setUgSearchResults(
        ((payload as { results?: typeof ugSearchResults }).results ?? []).map((result) => ({
          ...result,
        })),
      );
    } catch (error) {
      setUgSearchError((error as Error).message);
      setUgSearchResults([]);
    } finally {
      setIsSearchingUg(false);
    }
  };

  const saveLibraryToServer = async () => {
    if (isSavingLibrary) {
      return;
    }
    setIsSavingLibrary(true);
    try {
      const payload = {
        customSongs,
        favoriteTranspositions,
        recentTranspositions,
        hiddenDefaultSongs,
        notes: getLocalNotes(),
      };
      await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to save library to server', error);
    } finally {
      setIsSavingLibrary(false);
    }
  };

  const queueSaveLibrary = () => {
    if (typeof window === 'undefined') {
      return;
    }
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      saveLibraryToServer().catch(() => undefined);
    }, 800);
  };

  const handleHideDefaultSong = () => {
    if (!selectedSong || !isDefaultSong) {
      return;
    }

    const songId = selectedSong.id;
    setHiddenDefaultSongs((current) => {
      if (current.includes(songId)) {
        return current;
      }
      const next = [...current, songId];
      const remainingDefaults = defaultSongs.filter((song) => !next.includes(song.id));
      setSelectedSongId((previous) => {
        if (previous === songId) {
          const combined = [...remainingDefaults, ...customSongs];
          return combined[0]?.id ?? null;
        }
        return previous;
      });
      return next;
    });
  };

  const handleCreateEditableCopy = () => {
    if (!selectedSong) {
      return;
    }

    setFormState({ mode: 'copy', song: selectedSong });
  };

  const handleToggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const handleExport = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const notesPrefix = 'jg/notes/';
    const notes: Record<string, string> = {};

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(notesPrefix)) {
        continue;
      }

      const songId = key.slice(notesPrefix.length);
      try {
        const value = window.localStorage.getItem(key);
        if (value) {
          notes[songId] = JSON.parse(value) as string;
        }
      } catch (error) {
        console.warn('Unable to export notes for', songId, error);
      }
    }

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      customSongs,
      favoriteTranspositions,
      recentTranspositions,
      hiddenDefaultSongs,
      notes,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'justimate-library.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const getLocalNotes = () => {
    const notesPrefix = 'jg/notes/';
    const notes: Record<string, string> = {};
    if (typeof window === 'undefined') {
      return notes;
    }
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(notesPrefix)) {
        continue;
      }
      const songId = key.slice(notesPrefix.length);
      const value = window.localStorage.getItem(key);
      if (typeof value === 'string') {
        try {
          notes[songId] = JSON.parse(value) as string;
        } catch {
          notes[songId] = value;
        }
      }
    }
    return notes;
  };

  const applyImportedLibrary = (
    data: Partial<{
      customSongs: Song[];
      favoriteTranspositions: Record<string, number>;
      recentTranspositions: Record<string, number>;
      hiddenDefaultSongs: string[];
      notes: Record<string, unknown>;
    }>,
    showAlert = false,
  ) => {
    const sanitizedSongs: Song[] = Array.isArray(data.customSongs)
      ? data.customSongs
          .filter((song): song is Song => Boolean(song && song.title && song.artist && song.lines))
          .map((song) => ({
            ...song,
            id: typeof song.id === 'string' && song.id.trim() ? song.id : buildSongId(song.title, song.artist),
          }))
      : [];

    const importedHiddenDefaults = Array.isArray(data.hiddenDefaultSongs)
      ? data.hiddenDefaultSongs.filter((id): id is string => typeof id === 'string')
      : [];

    setCustomSongs(sanitizedSongs);
    setFavoriteTranspositions(data.favoriteTranspositions ?? {});
    setRecentTranspositions(data.recentTranspositions ?? {});
    setHiddenDefaultSongs(importedHiddenDefaults);

    if (typeof window !== 'undefined') {
      const prefix = 'jg/notes/';
      const keysToRemove: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));

      if (data.notes && typeof data.notes === 'object') {
        Object.entries(data.notes).forEach(([songId, stored]) => {
          let note = '';
          if (typeof stored === 'string') {
            note = stored;
          } else if (stored && typeof stored === 'object') {
            const first = Object.values(stored).find((value) => typeof value === 'string' && value.trim());
            if (first && typeof first === 'string') {
              note = first;
            }
          }
          window.localStorage.setItem(`${prefix}${songId}`, JSON.stringify(note));
        });
      }

      window.localStorage.setItem('jg/customSongs/v1', JSON.stringify(sanitizedSongs));
      window.localStorage.setItem('jg/favorites/v1', JSON.stringify(data.favoriteTranspositions ?? {}));
      window.localStorage.setItem('jg/recentTranspose/v1', JSON.stringify(data.recentTranspositions ?? {}));
      window.localStorage.setItem('jg/hiddenDefaults/v1', JSON.stringify(importedHiddenDefaults));
      window.dispatchEvent(new Event('jg-local-storage'));
    }

    const visibleAfterImport = defaultSongs.filter((song) => !importedHiddenDefaults.includes(song.id));
    const firstSongId = (sanitizedSongs[0]?.id ?? visibleAfterImport[0]?.id) ?? null;
    setSelectedSongId(firstSongId);

    if (showAlert && typeof window !== 'undefined') {
      window.alert(
        `Imported ${sanitizedSongs.length} custom song${sanitizedSongs.length === 1 ? '' : 's'} and ${
          Object.keys(data.favoriteTranspositions ?? {}).length
        } favorite${Object.keys(data.favoriteTranspositions ?? {}).length === 1 ? '' : 's'}.`,
      );
    }
  };

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = reader.result;
        if (typeof content !== 'string') {
          throw new Error('Invalid file content');
        }
        const data = JSON.parse(content) as Partial<{
          customSongs: Song[];
          favoriteTranspositions: Record<string, number>;
          recentTranspositions: Record<string, number>;
          hiddenDefaultSongs: string[];
          notes: Record<string, unknown>;
        }>;

        applyImportedLibrary(data, true);
      } catch (error) {
        console.error('Failed to import library', error);
        if (typeof window !== 'undefined') {
          window.alert(`Import failed: ${(error as Error).message}`);
        }
      } finally {
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      console.error('Failed to read import file');
      event.target.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <div className="app">
      <SongNav
        songs={songs}
        selectedSongId={selectedSongId}
        onSelect={setSelectedSongId}
        onAddSong={() => setFormState({ mode: 'create' })}
        onExport={handleExport}
        onImport={handleImportClick}
        onOpenUltimateGuitar={() => {
          setUgSearchOpen(true);
          setUgImportValue('');
        }}
        isImportingUltimateGuitar={isImportingFromUltimateGuitar}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
      <main className="app__main">
        {selectedSong ? (
          <>
            <div className="app__toolbar">
              <TransposerControls defaultKey={selectedSong.defaultKey} steps={transposeSteps} onChange={handleTransposeChange} />
              <div className="app__autoscroll">
                <button
                  type="button"
                  className={`app__autoscroll-toggle${autoScrollEnabled ? ' is-active' : ''}`}
                  onClick={() => setAutoScrollEnabled((current) => !current)}
                >
                  {autoScrollEnabled ? 'Pause autoscroll' : 'Start autoscroll'}
                </button>
                <label className="app__autoscroll-speed">
                  <span>Speed</span>
                  <div className="app__autoscroll-stepper" role="group" aria-label="Autoscroll speed">
                    <button
                      type="button"
                      aria-label="Decrease autoscroll speed"
                      onClick={() =>
                        setAutoScrollSpeed((current) => {
                          const index = AUTOSCROLL_SPEED_STEPS.indexOf(normalizeAutoScrollSpeed(current));
                          const prev = (index - 1 + AUTOSCROLL_SPEED_STEPS.length) % AUTOSCROLL_SPEED_STEPS.length;
                          return AUTOSCROLL_SPEED_STEPS[prev];
                        })
                      }
                    >
                      –
                    </button>
                    <span className="app__autoscroll-speed-value">{Math.round(autoScrollSpeed)} px/s</span>
                    <button
                      type="button"
                      aria-label="Increase autoscroll speed"
                      onClick={() =>
                        setAutoScrollSpeed((current) => {
                          const index = AUTOSCROLL_SPEED_STEPS.indexOf(normalizeAutoScrollSpeed(current));
                          const next = (index + 1) % AUTOSCROLL_SPEED_STEPS.length;
                          return AUTOSCROLL_SPEED_STEPS[next];
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                </label>
              </div>
              <div className="app__toolbar-actions">
                <FavoriteButton isFavorite={isFavorite} onToggle={handleToggleFavorite} />
                {isCustomSong ? (
                  <>
                    <button type="button" className="app__edit" onClick={() => setFormState({ mode: 'edit', song: selectedSong })}>
                      Edit song
                    </button>
                    <button type="button" className="app__remove" onClick={handleRemoveSong}>
                      Remove song
                    </button>
                  </>
                ) : null}
                {isDefaultSong ? (
                  <>
                    <button type="button" className="app__edit" onClick={handleCreateEditableCopy}>
                      Edit copy
                    </button>
                    <button type="button" className="app__remove" onClick={handleHideDefaultSong}>
                      Hide sample
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            <SongSheet song={selectedSong} transposeSteps={transposeSteps} />
            <NotesPanel songId={selectedSong.id} currentKey={currentKey} />
          </>
        ) : (
          <div className="app__empty">Select a song to get started.</div>
        )}
      </main>
      {ugSearchOpen && (
        <div className="ug-search__backdrop" role="dialog" aria-modal="true">
          <div className="ug-search">
            <header className="ug-search__header">
              <h2>Search Ultimate Guitar</h2>
              <button type="button" className="ug-search__close" aria-label="Close" onClick={() => setUgSearchOpen(false)}>
                ×
              </button>
            </header>
            <div className="ug-search__controls">
              <form
                className="ug-search__row"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (ugImportValue.trim()) {
                    setUgSearchOpen(false);
                    void handleImportUltimateGuitarSource(ugImportValue.trim());
                  }
                }}
              >
                <input
                  type="text"
                  placeholder="Paste UG URL or tab ID"
                  value={ugImportValue}
                  onChange={(event) => setUgImportValue(event.target.value)}
                  autoFocus
                />
                <button type="submit" disabled={isImportingFromUltimateGuitar}>
                  {isImportingFromUltimateGuitar ? 'Importing…' : 'Import'}
                </button>
              </form>
              <form className="ug-search__row" onSubmit={handleSearchUltimateGuitar}>
                <input
                  type="text"
                  placeholder="Search UG (song or artist)"
                  value={ugSearchQuery}
                  onChange={(event) => setUgSearchQuery(event.target.value)}
                />
                <button type="submit" disabled={isSearchingUg}>
                  {isSearchingUg ? 'Searching…' : 'Search'}
                </button>
              </form>
            </div>
            {ugSearchError && <p className="ug-search__error">{ugSearchError}</p>}
            <div className="ug-search__results">
              {isSearchingUg ? <p className="ug-search__hint">Searching tabs…</p> : null}
              {!isSearchingUg && !ugSearchResults.length ? <p className="ug-search__hint">No results yet.</p> : null}
              <ul>
                {ugSearchResults.map((result) => (
                  <li key={result.tabId} className="ug-search__result">
                    <div className="ug-search__meta">
                      <p className="ug-search__title">{result.title}</p>
                      <p className="ug-search__artist">{result.artist}</p>
                      <div className="ug-search__badges">
                        <span className="ug-search__badge">{result.type}</span>
                        {result.defaultKey ? <span className="ug-search__badge">Key: {result.defaultKey}</span> : null}
                        <span className="ug-search__badge">
                          {result.rating.toFixed(2)} ({result.votes} votes)
                        </span>
                      </div>
                    </div>
                    <div className="ug-search__actions">
                      <button
                        type="button"
                        onClick={() => {
                          setUgSearchOpen(false);
                          void handleImportUltimateGuitarSource(String(result.tabId));
                        }}
                        disabled={isImportingFromUltimateGuitar}
                      >
                        Import
                      </button>
                      {result.url ? (
                        <a href={result.url} target="_blank" rel="noreferrer" className="ug-search__link">
                          View
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      {formState && (
        <SongForm
          key={`${formState.mode}-${formState.song?.id ?? 'new'}`}
          initialSong={formState.song}
          preserveId={formState.mode === 'edit'}
          onCancel={() => setFormState(null)}
          onSave={formState.mode === 'edit' ? handleUpdateSong : handleSaveSong}
        />
      )}
    </div>
  );
};

export default App;
