import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Song } from '../types';

interface Props {
  songs: Song[];
  selectedSongId: string | null;
  onSelect: (id: string) => void;
  onAddSong: () => void;
  onAddFromSearch: () => void;
  onAddFromLink: () => void;
  onExport: () => void;
  onImport: () => void;
  isImportingUltimateGuitar: boolean;
  onSaveRemote: () => void;
  onOpenChordLibrary: () => void;
  version: string;
  isCustomSong: boolean;
  isDefaultSong: boolean;
  onEditSong: () => void;
  onRemoveSong: () => void;
  onHideDefault: () => void;
  onCreateCopy: () => void;
}

type ArtistGroup = {
  artist: string;
  songs: Song[];
};

type LetterGroup = {
  letter: string;
  artists: ArtistGroup[];
};

const getLetter = (artist: string) => {
  const cleaned = artist.trim().toUpperCase();
  const first = cleaned[0];
  if (!first) {
    return '#';
  }
  return /[A-Z]/.test(first) ? first : '#';
};

const SongNav = ({
  songs,
  selectedSongId,
  onSelect,
  onAddSong,
  onAddFromSearch,
  onAddFromLink,
  onExport,
  onImport,
  isImportingUltimateGuitar,
  onSaveRemote,
  onOpenChordLibrary,
  version,
  isCustomSong,
  isDefaultSong,
  onEditSong,
  onRemoveSong,
  onHideDefault,
  onCreateCopy,
}: Props) => {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false));
  const [isOpen, setIsOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [openSongMenuId, setOpenSongMenuId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const songToggleRef = useRef<HTMLButtonElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const handler = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    mediaQuery.addEventListener('change', handler);
    setIsMobile(mediaQuery.matches);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setOpenSongMenuId(null);
    setIsActionsOpen(false);
    setIsAddOpen(false);
  }, [isMobile]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const nav = navRef.current;
      const overlay = overlayRef.current;
      const toggle = songToggleRef.current;
      const addButton = addButtonRef.current;
      const addMenu = addMenuRef.current;
      const actionsButton = actionsButtonRef.current;
      const actionsMenu = actionsMenuRef.current;

      const insideNav = nav?.contains(target);

      if (!insideNav) {
        setIsOpen(false);
        setIsAddOpen(false);
        setIsActionsOpen(false);
        setOpenSongMenuId(null);
        return;
      }

      if (isOpen) {
        const insideOverlay = overlay?.contains(target);
        const onToggle = toggle?.contains(target);
        if (!insideOverlay && !onToggle) {
          setIsOpen(false);
          setOpenSongMenuId(null);
        }
      }

      if (isAddOpen) {
        const inAdd = addMenu?.contains(target);
        const onAddToggle = addButton?.contains(target);
        if (!inAdd && !onAddToggle) {
          setIsAddOpen(false);
        }
      }

      if (isActionsOpen) {
        const inActions = actionsMenu?.contains(target);
        const onActionsToggle = actionsButton?.contains(target);
        if (!inActions && !onActionsToggle) {
          setIsActionsOpen(false);
        }
      }

      if (openSongMenuId && target instanceof Element) {
        const inItemMenu = target.closest('.song-nav__menu-panel--item');
        const onItemToggle = target.closest('.song-nav__item-actions');
        if (!inItemMenu && !onItemToggle) {
          setOpenSongMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, isAddOpen, isActionsOpen, openSongMenuId]);

  const groups = useMemo<LetterGroup[]>(() => {
    const artistMap = new Map<string, Song[]>();
    songs.forEach((song) => {
      const current = artistMap.get(song.artist) ?? [];
      artistMap.set(song.artist, [...current, song]);
    });

    const artistEntries: ArtistGroup[] = Array.from(artistMap.entries())
      .map(([artist, artistSongs]) => ({
        artist,
        songs: [...artistSongs].sort((a, b) => a.title.localeCompare(b.title)),
      }))
      .sort((a, b) => a.artist.localeCompare(b.artist));

    const letterMap = new Map<string, ArtistGroup[]>();
    artistEntries.forEach((group) => {
      const letter = getLetter(group.artist);
      const current = letterMap.get(letter) ?? [];
      letterMap.set(letter, [...current, group]);
    });

    return Array.from(letterMap.entries())
      .map(([letter, artists]) => ({
        letter,
        artists,
      }))
      .sort((a, b) => a.letter.localeCompare(b.letter));
  }, [songs]);

  const handleSongSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
    setOpenSongMenuId(null);
  };

  return (
    <nav className="song-nav" aria-label="Song navigation" ref={navRef}>
      <div className="song-nav__header">
        <button
          type="button"
          className={clsx('song-nav__toggle', { 'is-active': isOpen })}
          ref={songToggleRef}
          aria-label="Toggle song list"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setIsAddOpen(false);
            setIsActionsOpen(false);
            setOpenSongMenuId(null);
          }}
          aria-expanded={isOpen}
          aria-controls="song-nav-panel"
        >
          ♫
        </button>
        <div className="song-nav__actions">
          <div className="song-nav__menu" ref={addMenuRef}>
            <button
              type="button"
              aria-label="Add song options"
              onClick={() => {
                onSelect(selectedSongId ?? songs[0]?.id ?? '');
                setIsAddOpen((prev) => !prev);
                setIsActionsOpen(false);
                setOpenSongMenuId(null);
              }}
              className="song-nav__add"
              aria-expanded={isAddOpen}
              ref={addButtonRef}
            >
              +
            </button>
            {isAddOpen && (
              <div className="song-nav__menu-panel">
                <button type="button" onClick={() => { onAddSong(); setIsAddOpen(false); }}>
                  Create new
                </button>
                <button type="button" disabled={isImportingUltimateGuitar} onClick={() => { onAddFromSearch(); setIsAddOpen(false); }}>
                  Search UG
                </button>
                <button type="button" disabled={isImportingUltimateGuitar} onClick={() => { onAddFromLink(); setIsAddOpen(false); }}>
                  Import UG link
                </button>
              </div>
            )}
          </div>
          <div className="song-nav__menu" ref={actionsMenuRef}>
            <button
              type="button"
              className="song-nav__more"
              aria-label="Settings and actions"
              onClick={() => {
                onSelect(selectedSongId ?? songs[0]?.id ?? '');
                setIsActionsOpen((prev) => !prev);
                setIsAddOpen(false);
                setOpenSongMenuId(null);
              }}
              aria-expanded={isActionsOpen}
              ref={actionsButtonRef}
            >
              ⚙
            </button>
            {isActionsOpen && (
              <div className="song-nav__menu-panel">
                <button type="button" onClick={() => { onImport(); setIsActionsOpen(false); }}>
                  Import library
                </button>
                <button type="button" onClick={() => { onExport(); setIsActionsOpen(false); }}>
                  Export library
                </button>
                <button type="button" onClick={() => { onSaveRemote(); setIsActionsOpen(false); }}>
                  Save to server
                </button>
                <button type="button" onClick={() => { onOpenChordLibrary(); setIsActionsOpen(false); }}>
                  Chord library
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="song-nav__title">
          <h2>justimate-guitar</h2>
          <p className="song-nav__version">{version}</p>
        </div>
      </div>
      {isOpen ? (
        <div
          id="song-nav-panel"
          className={clsx('song-nav__overlay', { 'song-nav__overlay--mobile': isMobile })}
          role={isMobile ? 'dialog' : undefined}
          aria-modal={isMobile ? true : undefined}
          ref={overlayRef}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div className="song-nav__panel">
            <div className="song-nav__panel-header">
              <div>
                <h3>Songs</h3>
                <p className="song-nav__panel-subtitle">{songs.length} total</p>
              </div>
              <button type="button" className="song-nav__close" aria-label="Close song list" onClick={() => setIsOpen(false)}>
                ×
              </button>
            </div>
            <div id="song-nav-sections" className="song-nav__scroll">
              {groups.map((group) => (
                <section key={group.letter} className="song-nav__letter-group">
                  <h3>{group.letter}</h3>
                  {group.artists.map((artist) => (
                    <div key={artist.artist} className="song-nav__artist">
                      <p>{artist.artist}</p>
                      <ul>
                        {artist.songs.map((song) => (
                          <li key={song.id} className={clsx('song-nav__item', { 'is-active': song.id === selectedSongId })}>
                            <div className="song-nav__item-main">
                              <button
                                type="button"
                                className={clsx({ 'is-active': song.id === selectedSongId })}
                                onClick={() => handleSongSelect(song.id)}
                              >
                                {song.title}
                              </button>
                              <div className="song-nav__item-actions">
                                <button
                                  type="button"
                                  className="song-nav__more"
                                  onClick={() => {
                                    onSelect(song.id);
                                    setOpenSongMenuId((prev) => (prev === song.id ? null : song.id));
                                  }}
                                  aria-expanded={openSongMenuId === song.id}
                                >
                                  ⋯
                                </button>
                                {openSongMenuId === song.id ? (
                                  <div className="song-nav__menu-panel song-nav__menu-panel--item">
                                    {isCustomSong ? (
                                      <>
                                        <button type="button" onClick={() => { onEditSong(); setOpenSongMenuId(null); setIsOpen(false); }}>
                                          Edit
                                        </button>
                                        <button type="button" className="song-nav__danger" onClick={() => { onRemoveSong(); setOpenSongMenuId(null); }}>
                                          Delete
                                        </button>
                                      </>
                                    ) : null}
                                    {isDefaultSong ? (
                                      <>
                                        <button type="button" onClick={() => { onCreateCopy(); setOpenSongMenuId(null); }}>
                                          Edit copy
                                        </button>
                                        <button type="button" onClick={() => { onHideDefault(); setOpenSongMenuId(null); }}>
                                          Hide sample
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
};

export default SongNav;
