import { useMemo } from 'react';
import type { Song } from '../types';
import { parseLyricLine, transposeSegments } from '../utils/lyrics';
import type { LyricSegment } from '../utils/lyrics';
import { transposeChord, type ChordShape } from '../utils/chords';
import ChordLine from './ChordLine';
import ChordPalette from './ChordPalette';

interface Props {
  song: Song;
  transposeSteps: number;
  chordShapes: Record<string, ChordShape[]>;
  onInteract?: () => void;
}

interface ParsedLine {
  type: 'section' | 'line' | 'spacer';
  label?: string;
  segments?: LyricSegment[];
}

const SongSheet = ({ song, transposeSteps, chordShapes, onInteract }: Props) => {
  const { lines, uniqueChords } = useMemo(() => {
    const collected = new Set<string>();
    const processed: ParsedLine[] = song.lines.map((line) => {
      if (line.type === 'section') {
        return { type: 'section', label: line.label } as ParsedLine;
      }

      if (line.type === 'spacer') {
        return { type: 'spacer' } as ParsedLine;
      }

      const segments = transposeSegments(parseLyricLine(line.content, line.chords), transposeSteps, transposeChord);
      segments.forEach((segment) => {
        if (segment.chord) {
          collected.add(segment.chord);
        }
      });

      return {
        type: 'line',
        segments,
      } as ParsedLine;
    });

    return {
      lines: processed,
      uniqueChords: Array.from(collected).sort(),
    };
  }, [song, transposeSteps]);

  const currentKey = transposeChord(song.defaultKey, transposeSteps);

  return (
    <div className="song-sheet" onClick={onInteract} onTouchStart={onInteract}>
      <header className="song-sheet__header">
        <div>
          <h2>{song.title}</h2>
          <p className="song-sheet__artist">{song.artist}</p>
        </div>
        <dl className="song-sheet__meta">
          <div>
            <dt>Default key</dt>
            <dd>{song.defaultKey}</dd>
          </div>
          <div>
            <dt>Current key</dt>
            <dd>{currentKey}</dd>
          </div>
          {song.capo !== undefined && (
            <div>
              <dt>Capo</dt>
              <dd>{song.capo}</dd>
            </div>
          )}
          {song.ugUrl ? (
            <div>
              <dt>Source</dt>
              <dd>
                <a href={song.ugUrl} target="_blank" rel="noreferrer">
                  Ultimate Guitar
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <ChordPalette chords={uniqueChords} chordShapes={chordShapes} />

      <div className="song-sheet__body">
        {lines.map((line, index) => {
          if (line.type === 'section') {
            return (
              <h2 key={`${line.label}-${index}`} className="song-sheet__section">
                {line.label}
              </h2>
            );
          }

          if (line.type === 'spacer') {
            return <div key={`spacer-${index}`} className="song-sheet__spacer" />;
          }

          return <ChordLine key={`line-${index}`} segments={line.segments ?? []} chordShapes={chordShapes} />;
        })}
      </div>
    </div>
  );
};

export default SongSheet;
