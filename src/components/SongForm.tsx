import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Song, SongLine } from '../types';

interface Props {
  onSave: (song: Song) => void;
  onCancel: () => void;
  initialSong?: Song;
  preserveId?: boolean;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);

const buildSongId = (title: string, artist: string) => {
  const base = `${slugify(artist)}-${slugify(title)}`.replace(/^-+|-+$/g, '');
  const fallback = slugify(title) || 'song';
  return base || fallback;
};

const parseContent = (content: string): SongLine[] => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const result: SongLine[] = [];

  lines.forEach((line) => {
    if (!line.trim()) {
      if (result[result.length - 1]?.type !== 'spacer') {
        result.push({ type: 'spacer' });
      }
      return;
    }

    if (line.trim().startsWith('#')) {
      const label = line.replace(/^#+/, '').trim() || 'Section';
      result.push({ type: 'section', label });
      return;
    }

    result.push({ type: 'line', content: line });
  });

  return result;
};

const SongForm = ({ onSave, onCancel, initialSong, preserveId = false }: Props) => {
  const isEdit = Boolean(initialSong && preserveId);
  const initialContent = useMemo(() => (initialSong ? stringifyLines(initialSong.lines) : ''), [initialSong]);

  const [title, setTitle] = useState(initialSong?.title ?? '');
  const [artist, setArtist] = useState(initialSong?.artist ?? '');
  const [defaultKey, setDefaultKey] = useState(initialSong?.defaultKey ?? 'C');
  const [capo, setCapo] = useState(initialSong?.capo !== undefined ? String(initialSong.capo) : '');
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialSong?.title ?? '');
    setArtist(initialSong?.artist ?? '');
    setDefaultKey(initialSong?.defaultKey ?? 'C');
    setCapo(initialSong?.capo !== undefined ? String(initialSong.capo) : '');
    setContent(initialSong ? stringifyLines(initialSong.lines) : '');
    setError(null);
  }, [initialSong]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim() || !artist.trim()) {
      setError('Title and artist are required.');
      return;
    }

    const lines = parseContent(content);
    const hasLyrics = lines.some((line) => line.type === 'line');
    if (!hasLyrics) {
      setError('Add at least one lyric line.');
      return;
    }

    const parsedCapo = capo ? Number(capo) : undefined;
    if (capo && Number.isNaN(parsedCapo)) {
      setError('Capo must be a number.');
      return;
    }

    const song: Song = {
      id: initialSong && preserveId ? initialSong.id : buildSongId(title, artist),
      title: title.trim(),
      artist: artist.trim(),
      defaultKey: defaultKey.trim() || 'C',
      capo: parsedCapo,
      lines,
    };

    onSave(song);
  };

  return (
    <div className="song-form__backdrop" role="dialog" aria-modal="true">
      <form className="song-form" onSubmit={handleSubmit}>
        <header>
          <h2>{isEdit ? 'Edit Song' : 'Add a Song'}</h2>
          <button type="button" onClick={onCancel} aria-label="Close">×</button>
        </header>
        <div className="song-form__field">
          <label htmlFor="song-title">Title</label>
          <input id="song-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </div>
        <div className="song-form__field">
          <label htmlFor="song-artist">Artist</label>
          <input id="song-artist" value={artist} onChange={(event) => setArtist(event.target.value)} required />
        </div>
        <div className="song-form__row">
          <div className="song-form__field">
            <label htmlFor="song-key">Default key</label>
            <input id="song-key" value={defaultKey} onChange={(event) => setDefaultKey(event.target.value)} />
          </div>
          <div className="song-form__field">
            <label htmlFor="song-capo">Capo</label>
            <input
              id="song-capo"
              value={capo}
              onChange={(event) => setCapo(event.target.value)}
              placeholder="0"
              inputMode="numeric"
            />
          </div>
        </div>
        <div className="song-form__field">
          <label htmlFor="song-content">Lyrics &amp; chords</label>
          <textarea
            id="song-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={sampleContent}
            rows={12}
          />
          <p className="song-form__hint">
            Use [Chord] syntax inline. Start a line with # to create a section header. Blank lines insert spacing.
          </p>
        </div>
        {error && <p className="song-form__error">{error}</p>}
        <footer>
          <button type="button" onClick={onCancel} className="song-form__secondary">
            Cancel
          </button>
          <button type="submit" className="song-form__primary">
            {isEdit ? 'Update song' : 'Save song'}
          </button>
        </footer>
      </form>
    </div>
  );
};

const sampleContent = `# Verse 1\n[G]Sample lyric line goes [D]here\n[C]Add chords wherever you need them\n\n# Chorus\n[Em]Leave blank lines for spacing`;

const stringifyLines = (lines: SongLine[]): string =>
  lines
    .map((line) => {
      if (line.type === 'section') {
        return `# ${line.label}`.trim();
      }
      if (line.type === 'spacer') {
        return '';
      }
      return line.content;
    })
    .join('\n');

export default SongForm;
