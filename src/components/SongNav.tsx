import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Song, SongType } from '../types';

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
  controlsExpanded: boolean;
  onToggleControls: () => void;
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
  controlsExpanded,
  onToggleControls,
}: Props) => {
  const typeLabels: Record<SongType, string> = {
    chords: 'Chords',
    tab: 'Tab',
    bass: 'Bass',
    ukulele: 'Ukulele',
    drums: 'Drums',
    video: 'Video',
    pro: 'Pro',
    power: 'Power',
    other: 'Other',
  };

  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 899px)').matches : false));
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
  const controlsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mediaQuery = window.matchMedia('(max-width: 899px)');
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
      const controlsButton = controlsButtonRef.current;

      const insideNav = nav?.contains(target);
      const insideOverlay = overlay?.contains(target);
      const onToggle = toggle?.contains(target);

      if (!insideNav) {
        setIsOpen(false);
        setIsAddOpen(false);
        setIsActionsOpen(false);
        setOpenSongMenuId(null);
        return;
      }

      if (isOpen) {
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

      if (controlsExpanded) {
        const onControlsToggle = controlsButton?.contains(target);
        if (!onControlsToggle && !onToggle && !insideOverlay) {
          onToggleControls?.();
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
        <div className="song-nav__actions">
          <div className="song-nav__menu" ref={actionsMenuRef}>
            <button
              type="button"
              className={clsx('song-nav__more', { 'is-active': isActionsOpen })}
              aria-label="Settings and actions"
              onClick={() => {
                if (selectedSongId) {
                  onSelect(selectedSongId);
                }
                setIsActionsOpen((prev) => !prev);
                setIsAddOpen(false);
                setOpenSongMenuId(null);
              }}
              aria-expanded={isActionsOpen}
              ref={actionsButtonRef}
            >
              <span className="song-nav__icon song-nav__icon--dots" aria-hidden="true" />
            </button>
            {isActionsOpen && (
              <div className="song-nav__menu-panel">
                <button type="button" onClick={() => { onImport(); setIsActionsOpen(false); }}>
                  <span className="song-nav__menu-icon song-nav__icon--import" aria-hidden="true" />
                  <span>Import library</span>
                </button>
                <button type="button" onClick={() => { onExport(); setIsActionsOpen(false); }}>
                  <span className="song-nav__menu-icon song-nav__icon--export" aria-hidden="true" />
                  <span>Export library</span>
                </button>
                <button type="button" onClick={() => { onSaveRemote(); setIsActionsOpen(false); }}>
                  <span className="song-nav__menu-icon song-nav__icon--save" aria-hidden="true" />
                  <span>Save to server</span>
                </button>
                <button type="button" onClick={() => { onOpenChordLibrary(); setIsActionsOpen(false); }}>
                  <span className="song-nav__menu-icon song-nav__icon--library" aria-hidden="true" />
                  <span>Chord library</span>
                </button>
              </div>
            )}
          </div>
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
            <span className="song-nav__icon song-nav__icon--note" aria-hidden="true" />
          </button>
          <div className="song-nav__menu" ref={addMenuRef}>
            <button
              type="button"
              aria-label="Add song options"
              onClick={() => {
                if (selectedSongId) {
                  onSelect(selectedSongId);
                }
                setIsAddOpen((prev) => !prev);
                setIsActionsOpen(false);
                setOpenSongMenuId(null);
              }}
              className={clsx('song-nav__add', { 'is-active': isAddOpen })}
              aria-expanded={isAddOpen}
              ref={addButtonRef}
            >
              <span className="song-nav__icon song-nav__icon--plus" aria-hidden="true" />
            </button>
            {isAddOpen && (
              <div className="song-nav__menu-panel">
                <button type="button" onClick={() => { onAddSong(); setIsAddOpen(false); }}>
                  <span className="song-nav__menu-icon song-nav__icon--plus" aria-hidden="true" />
                  <span>Create new</span>
                </button>
                <button type="button" disabled={isImportingUltimateGuitar} onClick={() => { onAddFromSearch(); setIsAddOpen(false); }}>
                  <span className="song-nav__menu-icon song-nav__icon--search" aria-hidden="true" />
                  <span>Search UG</span>
                </button>
                <button type="button" disabled={isImportingUltimateGuitar} onClick={() => { onAddFromLink(); setIsAddOpen(false); }}>
                  <span className="song-nav__menu-icon song-nav__icon--link" aria-hidden="true" />
                  <span>Import UG link</span>
                </button>
              </div>
            )}
          </div>
          {selectedSongId ? (
            <button
              type="button"
              className={clsx('song-nav__controls', { 'is-active': controlsExpanded })}
              aria-label="Toggle controls"
              onClick={() => onToggleControls?.()}
              aria-pressed={controlsExpanded}
              ref={controlsButtonRef}
            >
              <span className="song-nav__icon song-nav__icon--panel" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="song-nav__title">
          <div className="song-nav__title-text">
            <h2>justimate-guitar</h2>
            <p className="song-nav__version">{version}</p>
          </div>
          <img src="/favicon.svg" alt="" className="song-nav__favicon" />
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
                                <span className="song-nav__item-type">
                                  {typeLabels[(song.type as SongType) ?? 'chords']}
                                </span>
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
