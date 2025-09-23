import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Song } from '../types';

interface Props {
  songs: Song[];
  selectedSongId: string | null;
  onSelect: (id: string) => void;
  onAddSong: () => void;
  onExport: () => void;
  onImport: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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

const SongNav = ({ songs, selectedSongId, onSelect, onAddSong, onExport, onImport, theme, onToggleTheme }: Props) => {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false));
  const [isOpen, setIsOpen] = useState(() => !isMobile);

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
    if (!isMobile) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isMobile]);

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

  return (
    <nav className={clsx('song-nav', { 'song-nav--collapsed': isMobile && !isOpen })} aria-label="Song navigation">
      <div className="song-nav__header">
        <button
          type="button"
          className="song-nav__toggle"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={!isMobile}
          aria-expanded={isOpen}
          aria-controls="song-nav-sections"
        >
          ☰
        </button>
        <h2>justimate-guitar</h2>
        <div className="song-nav__actions">
          <button
            type="button"
            onClick={onToggleTheme}
            className="song-nav__theme"
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Activate light mode' : 'Activate dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button type="button" onClick={onImport} className="song-nav__import">
            Import
          </button>
          <button type="button" onClick={onExport} className="song-nav__export">
            Export
          </button>
          <button type="button" onClick={onAddSong} className="song-nav__add">
            + Add Song
          </button>
        </div>
      </div>
      <div id="song-nav-sections" className={clsx('song-nav__scroll', { 'is-hidden': isMobile && !isOpen })}>
        {groups.map((group) => (
          <section key={group.letter} className="song-nav__letter-group">
            <h3>{group.letter}</h3>
            {group.artists.map((artist) => (
              <div key={artist.artist} className="song-nav__artist">
                <p>{artist.artist}</p>
                <ul>
                  {artist.songs.map((song) => (
                    <li key={song.id}>
                      <button
                        type="button"
                        className={clsx({ 'is-active': song.id === selectedSongId })}
                        onClick={() => onSelect(song.id)}
                      >
                        {song.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </nav>
  );
};

export default SongNav;
