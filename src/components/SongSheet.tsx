import { useCallback, useMemo, useState, type ReactNode } from 'react';
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
  onEdit?: (song: Song) => void;
  notesPanel?: ReactNode;
  onAddChord?: (chord: string) => void;
  onBuildFromSimilar?: (chord: string) => void;
  onSetLeftScrollContainer?: (element: HTMLDivElement | null) => void;
}

interface ParsedLine {
  type: 'section' | 'line' | 'spacer';
  label?: string;
  segments?: LyricSegment[];
  content?: string;
}

const SongSheet = ({
  song,
  transposeSteps,
  chordShapes,
  onInteract,
  onEdit,
  notesPanel,
  onAddChord,
  onBuildFromSimilar,
  onSetLeftScrollContainer,
}: Props) => {
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
        content: line.content,
      } as ParsedLine;
    });

    return {
      lines: processed,
      uniqueChords: Array.from(collected).sort(),
    };
  }, [song, transposeSteps]);

  const currentKey = transposeChord(song.defaultKey, transposeSteps);
  const isChords = (song.type ?? 'chords') === 'chords';
  const [notesExpanded, setNotesExpanded] = useState(true);
  const handleLeftRef = useCallback(
    (element: HTMLDivElement | null) => {
      onSetLeftScrollContainer?.(element);
    },
    [onSetLeftScrollContainer],
  );

  return (
    <div className={`song-sheet${isChords ? '' : ' song-sheet--plain'}`} onClick={onInteract} onTouchStart={onInteract}>
      <div className="song-sheet__layout">
        <aside className="song-sheet__right">
          <div className="song-sheet__right-inner">
            <header className="song-sheet__header">
              <div className="song-sheet__title-stack">
                {onEdit ? (
                  <button type="button" className="song-sheet__edit" onClick={() => onEdit(song)} aria-label="Edit song">
                    <span className="song-sheet__edit-icon" aria-hidden="true" />
                  </button>
                ) : null}
                <div className="song-sheet__title-row">
                  <h2>
                    <span className="song-sheet__title-text">{song.title}</span>
                  </h2>
                  <div className="song-sheet__artist-row">
                    <p className="song-sheet__artist">{song.artist}</p>
                    {song.type ? <span className="song-type-pill song-type-pill--inline">{song.type.toUpperCase()}</span> : null}
                  </div>
                </div>
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

          {isChords ? (
            <ChordPalette
              chords={uniqueChords}
              chordShapes={chordShapes}
              onAddChord={onAddChord}
              onBuildFromSimilar={onBuildFromSimilar}
            />
          ) : null}
            {notesPanel ? (
              <section className="chord-palette song-sheet__notes" aria-label="Song notes">
                <div
                  className="chord-palette__header"
                  role="button"
                  tabIndex={0}
                  aria-expanded={notesExpanded}
                  onClick={() => setNotesExpanded((current) => !current)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setNotesExpanded((current) => !current);
                    }
                  }}
                >
                  <h3>Notes</h3>
                  <span className="chord-palette__caret" aria-hidden="true">
                    {notesExpanded ? '▴' : '▾'}
                  </span>
                </div>
                {notesExpanded ? <div className="chord-palette__panel song-sheet__notes-panel">{notesPanel}</div> : null}
              </section>
            ) : null}
          </div>
        </aside>
        <div className="song-sheet__left" ref={handleLeftRef}>
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

              return isChords ? (
                <ChordLine
                  key={`line-${index}`}
                  segments={line.segments ?? []}
                  chordShapes={chordShapes}
                  onAddChord={onAddChord}
                  onBuildFromSimilar={onBuildFromSimilar}
                />
              ) : (
                <div key={`line-${index}`} className="song-sheet__plain-line">
                  {line.content ?? ''}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongSheet;
