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
import './App.css';

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
  }, [selectedSongId, songs]);

  useEffect(() => {
    if (!selectedSongId) {
      return;
    }
    const storedFavorite = favoriteTranspositions[selectedSongId];
    const storedRecent = recentTranspositions[selectedSongId];
    const initial = storedFavorite ?? storedRecent ?? 0;
    setTransposeSteps(initial);
  }, [selectedSongId, favoriteTranspositions, recentTranspositions]);

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

  const handleImportUltimateGuitar = async () => {
    if (isImportingFromUltimateGuitar || typeof window === 'undefined') {
      return;
    }

    const source = window.prompt('Paste an Ultimate Guitar URL or tab id:');
    if (!source) {
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
    const notes: Record<string, Record<string, string>> = {};

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(notesPrefix)) {
        continue;
      }

      const songId = key.slice(notesPrefix.length);
      try {
        const value = window.localStorage.getItem(key);
        if (value) {
          notes[songId] = JSON.parse(value) as Record<string, string>;
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
          notes: Record<string, Record<string, string>>;
        }>;

        if (!Array.isArray(data.customSongs)) {
          data.customSongs = [];
        }

        const importedHiddenDefaults = Array.isArray(data.hiddenDefaultSongs)
          ? data.hiddenDefaultSongs.filter((id): id is string => typeof id === 'string')
          : [];

        setCustomSongs(data.customSongs);
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
            Object.entries(data.notes).forEach(([songId, notesByKey]) => {
              if (notesByKey && typeof notesByKey === 'object') {
                window.localStorage.setItem(`${prefix}${songId}`, JSON.stringify(notesByKey));
              }
            });
          }

          window.dispatchEvent(new Event('jg-local-storage'));
        }

        const visibleAfterImport = defaultSongs.filter((song) => !importedHiddenDefaults.includes(song.id));
        const firstSongId = (data.customSongs?.[0]?.id ?? visibleAfterImport[0]?.id) ?? null;
        setSelectedSongId(firstSongId);
      } catch (error) {
        console.error('Failed to import library', error);
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
        onImportUltimateGuitar={handleImportUltimateGuitar}
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
