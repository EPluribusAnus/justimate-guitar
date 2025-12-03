import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { CSSProperties } from 'react';
import SongNav from './components/SongNav';
import SongSheet from './components/SongSheet';
import NotesPanel from './components/NotesPanel';
import SongForm from './components/SongForm';
import TransposerControls from './components/TransposerControls';
import ChordLibraryModal from './components/ChordLibraryModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { defaultSongs } from './data/songs';
import type { Song } from './types';
import {
  transposeChord,
  listBuiltInChordShapes,
  mergeChordShapes,
  type CustomChordShape,
  type PreferredShapeSelection,
} from './utils/chords';
import { buildSongId } from './utils/songContent';
import { appVersion } from './version';
import './App.css';

const AUTOSCROLL_SPEED_STEPS: number[] = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
const AUTOSCROLL_DOT_COUNT = 6;
const TEXTSIZE_DOT_COUNT = 6;
const SONG_FONT_MIN = 0.6;
const SONG_FONT_MAX = 1.3;

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
  const [customSongs, setCustomSongs] = useState<Song[]>([]);
  const [favoriteTranspositions, setFavoriteTranspositions] = useState<Record<string, number>>({});
  const [recentTranspositions, setRecentTranspositions] = useState<Record<string, number>>({});
  const [hiddenDefaultSongs, setHiddenDefaultSongs] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
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
  const autoScrollControlRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [ugSearchOpen, setUgSearchOpen] = useState(false);
  const [ugSearchQuery, setUgSearchQuery] = useState('');
  const [ugSearchResults, setUgSearchResults] = useState<
    { tabId: number; title: string; artist: string; type: string; rating: number; votes: number; defaultKey?: string; url?: string }[]
  >([]);
  const [ugSearchError, setUgSearchError] = useState<string | null>(null);
  const [isSearchingUg, setIsSearchingUg] = useState(false);
  const [songFontScale, setSongFontScale] = useLocalStorage<number>('jg/fontScale/v1', 1);
  const [isSavingLibrary, setIsSavingLibrary] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const resetSongFont = () => setSongFontScale(1);
  const [customChordShapes, setCustomChordShapes] = useLocalStorage<Record<string, CustomChordShape[]>>('jg/customChordShapes/v1', {});
  const [preferredChordShapes, setPreferredChordShapes] = useLocalStorage<Record<string, PreferredShapeSelection>>('jg/preferredChordShapes/v1', {});
  const [showChordLibrary, setShowChordLibrary] = useState(false);
  const builtInChordShapes = useMemo(() => listBuiltInChordShapes(), []);
  const resolvedChordShapes = useMemo(
    () => mergeChordShapes(builtInChordShapes, customChordShapes, preferredChordShapes),
    [builtInChordShapes, customChordShapes, preferredChordShapes],
  );
  const handleSetPreferredShape = (chord: string, selection: PreferredShapeSelection | null) =>
    setPreferredChordShapes((current) => {
      const next = { ...current };
      if (selection) {
        next[chord] = selection;
      } else {
        delete next[chord];
      }
      return next;
    });

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
    if (typeof document === 'undefined') {
      return;
    }
    const element = headerRef.current;
    if (!element) {
      return;
    }
    const setHeight = () => {
      const height = element.offsetHeight;
      document.documentElement.style.setProperty('--header-stack-height', `${height}px`);
    };
    setHeight();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(setHeight);
      resizeObserver.observe(element);
    } else {
      window.addEventListener('resize', setHeight);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', setHeight);
      }
    };
  }, []);

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
  }, [customSongs, favoriteTranspositions, recentTranspositions, hiddenDefaultSongs, notes]);

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
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to delete this song?');
      if (!confirmed) {
        return;
      }
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

    const handleInterrupt = (event: Event) => {
      const target = event.target as Node | null;
      if (target && autoScrollControlRef.current?.contains(target)) {
        return;
      }
      setAutoScrollEnabled(false);
    };
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

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const hasModal = Boolean(formState || ugSearchOpen || showChordLibrary);
    if (hasModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [formState, ugSearchOpen, showChordLibrary]);

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

      type UltimateGuitarImportResult = { song?: Song; source?: string; tabId?: number };
      const result = (payload as { result?: UltimateGuitarImportResult }).result;
      if (!result?.song) {
        throw new Error('Import did not return a song.');
      }

      const importedSong = result.song;
      const inferredUgUrl =
        importedSong.ugUrl ??
        (source.startsWith('http')
          ? source
          : result.source?.startsWith('http')
            ? result.source
            : result.tabId
              ? `https://tabs.ultimate-guitar.com/tab/${result.tabId}`
              : undefined);
      const uniqueId = ensureUniqueId(importedSong.id);
      const preparedSong: Song = {
        ...importedSong,
        id: uniqueId,
        ugUrl: inferredUgUrl,
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
        notes,
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

  const handleNoteChange = (songId: string, value: string) => {
    setNotes((current) => ({ ...current, [songId]: value }));
  };

  const handleToggleAutoscroll = () => {
    setAutoScrollEnabled((current) => {
      if (current && autoScrollFrame.current !== null) {
        cancelAnimationFrame(autoScrollFrame.current);
        autoScrollFrame.current = null;
        autoScrollLast.current = null;
      }
      return !current;
    });
  };

  const handleToggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const handleExport = () => {
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

    const importedNotes: Record<string, string> = {};
    if (data.notes && typeof data.notes === 'object') {
      Object.entries(data.notes).forEach(([songId, stored]) => {
        if (typeof songId !== 'string') {
          return;
        }
        if (typeof stored === 'string') {
          importedNotes[songId] = stored;
          return;
        }
        if (stored && typeof stored === 'object') {
          const first = Object.values(stored).find((value) => typeof value === 'string' && value.trim());
          if (first && typeof first === 'string') {
            importedNotes[songId] = first;
          }
        }
      });
    }

    setCustomSongs(sanitizedSongs);
    setFavoriteTranspositions(data.favoriteTranspositions ?? {});
    setRecentTranspositions(data.recentTranspositions ?? {});
    setHiddenDefaultSongs(importedHiddenDefaults);
    setNotes(importedNotes);

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
    <div className="app" style={{ '--song-font-scale': songFontScale.toString() } as CSSProperties}>
      <header className="app__header" ref={headerRef}>
        <SongNav
          songs={songs}
          selectedSongId={selectedSongId}
          onSelect={setSelectedSongId}
          onAddSong={() => setFormState({ mode: 'create' })}
          onAddFromSearch={() => {
            setUgSearchOpen(true);
          }}
          onAddFromLink={() => {
            if (typeof window === 'undefined') return;
            const source = window.prompt('Paste a UG URL or tab id:');
            if (source) {
              void handleImportUltimateGuitarSource(source);
            }
          }}
          onExport={handleExport}
          onImport={handleImportClick}
          isImportingUltimateGuitar={isImportingFromUltimateGuitar}
          onSaveRemote={saveLibraryToServer}
          onOpenChordLibrary={() => setShowChordLibrary(true)}
          version={appVersion}
          isCustomSong={isCustomSong}
          isDefaultSong={isDefaultSong}
          onEditSong={() => setFormState({ mode: 'edit', song: selectedSong ?? undefined })}
          onRemoveSong={handleRemoveSong}
          onHideDefault={handleHideDefaultSong}
          onCreateCopy={handleCreateEditableCopy}
        />
        {selectedSong ? (
          <div className={`app__controls${controlsExpanded ? ' is-open' : ' is-collapsed'}`}>
            <div
              className="app__controls-header"
              role="button"
              tabIndex={0}
              aria-expanded={controlsExpanded}
              onClick={() => setControlsExpanded((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setControlsExpanded((current) => !current);
                }
              }}
            >
              <p className="app__controls-title">Controls</p>
              <span className="app__controls-caret" aria-hidden="true">
                {controlsExpanded ? '▴' : '▾'}
              </span>
            </div>
            {controlsExpanded ? (
              <div className="app__toolbar" id="app-controls-panel">
                <div className="toolbar-grid">
                  <div className="toolbar-group toolbar-group--trans">
                    <p className="toolbar-group__label">Transpose</p>
                    <TransposerControls defaultKey={selectedSong.defaultKey} steps={transposeSteps} onChange={handleTransposeChange} />
                  </div>
                  <div className="toolbar-group toolbar-group--auto">
                    <p className="toolbar-group__label">Autoscroll</p>
                    <div className="app__autoscroll-control" ref={autoScrollControlRef}>
                      <div className="app__autoscroll-stepper" role="group" aria-label="Autoscroll controls">
                        <button
                          type="button"
                          aria-label="Slower autoscroll"
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
                        <button
                          type="button"
                          className={`app__autoscroll-toggle${autoScrollEnabled ? ' is-active' : ''}`}
                          onClick={handleToggleAutoscroll}
                          aria-pressed={autoScrollEnabled}
                        >
                          {autoScrollEnabled ? 'on' : 'off'}
                        </button>
                        <button
                          type="button"
                          aria-label="Faster autoscroll"
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
                      <div className="app__autoscroll-meter" aria-label="Autoscroll speed">
                        {(() => {
                          const normalized =
                            AUTOSCROLL_SPEED_STEPS.indexOf(normalizeAutoScrollSpeed(autoScrollSpeed)) /
                            (AUTOSCROLL_SPEED_STEPS.length - 1);
                          const threshold = Math.round(normalized * (AUTOSCROLL_DOT_COUNT - 1));
                          return Array.from({ length: AUTOSCROLL_DOT_COUNT }).map((_, index) => (
                            <span key={index} className={`app__autoscroll-dot${index <= threshold ? ' is-filled' : ''}`} />
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="toolbar-group toolbar-group--text">
                    <p className="toolbar-group__label">Text Size</p>
                    <div className="app__textsize-control">
                      <div className="app__textsize" aria-label="Adjust text size">
                        <button
                          type="button"
                          className="app__textsize-btn app__textsize-btn--small"
                          onClick={() => setSongFontScale((current) => Math.max(SONG_FONT_MIN, parseFloat((current - 0.05).toFixed(2))))}
                          aria-label="Decrease text size"
                        >
                          A
                        </button>
                        <button type="button" className="app__textsize-value" onClick={resetSongFont} aria-label="Reset text size">
                          {Math.round(songFontScale * 100)}%
                        </button>
                        <button
                          type="button"
                          className="app__textsize-btn app__textsize-btn--large"
                          onClick={() => setSongFontScale((current) => Math.min(SONG_FONT_MAX, parseFloat((current + 0.05).toFixed(2))))}
                          aria-label="Increase text size"
                        >
                          A
                        </button>
                      </div>
                      <div className="app__textsize-meter" aria-label="Text size level">
                        {(() => {
                          const normalized = (songFontScale - SONG_FONT_MIN) / (SONG_FONT_MAX - SONG_FONT_MIN);
                          const threshold = Math.round(normalized * (TEXTSIZE_DOT_COUNT - 1));
                          return Array.from({ length: TEXTSIZE_DOT_COUNT }).map((_, index) => (
                            <span key={index} className={`app__autoscroll-dot${index <= threshold ? ' is-filled' : ''}`} />
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
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
            <SongSheet song={selectedSong} transposeSteps={transposeSteps} chordShapes={resolvedChordShapes} />
            <NotesPanel
              songId={selectedSong.id}
              currentKey={currentKey}
              note={notes[selectedSong.id] ?? ''}
              onChange={(value) => handleNoteChange(selectedSong.id, value)}
            />
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
      {showChordLibrary && (
        <ChordLibraryModal
          builtInShapes={builtInChordShapes}
          customShapes={customChordShapes}
          preferredShapes={preferredChordShapes}
          onSave={setCustomChordShapes}
          onSetPreferred={handleSetPreferredShape}
          onClose={() => setShowChordLibrary(false)}
        />
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
      <button
        type="button"
        className="theme-toggle-floating"
        aria-label={theme === 'dark' ? 'Activate light mode' : 'Activate dark mode'}
        onClick={handleToggleTheme}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  );
};

export default App;
