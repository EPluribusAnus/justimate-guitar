import { memo, useMemo, useState } from 'react';
import type { ChordShape } from '../utils/chords';
import ChordDiagramCarousel from './ChordDiagramCarousel';

interface Props {
  chords: string[];
  chordShapes: Record<string, ChordShape[]>;
  onAddChord?: (chord: string) => void;
  onBuildFromSimilar?: (chord: string) => void;
}

interface DiagramEntry {
  chord: string;
  shapes: ChordShape[];
}

const MissingChordCard = ({
  chord,
  onAddChord,
  onBuildFromSimilar,
}: {
  chord: string;
  onAddChord?: (chord: string) => void;
  onBuildFromSimilar?: (chord: string) => void;
}) => (
  <div className="chord-palette__missing">
    <p className="chord-palette__missing-title">{chord}</p>
    <p className="chord-palette__missing-text">No diagram available</p>
    <div className="chord-palette__missing-actions">
      <button type="button" onClick={() => onAddChord?.(chord)}>
        Add
      </button>
      <button type="button" onClick={() => onBuildFromSimilar?.(chord)}>
        Build from similar
      </button>
    </div>
  </div>
);

const ChordPalette = memo(({ chords, chordShapes, onAddChord, onBuildFromSimilar }: Props) => {
  const [expanded, setExpanded] = useState(true);
  const diagrams = useMemo<DiagramEntry[]>(
    () =>
      chords.map((chord) => ({
        chord,
        shapes: chordShapes[chord] ?? [],
      })),
    [chords, chordShapes],
  );

  if (!diagrams.length) {
    return null;
  }

  return (
    <section className="chord-palette" aria-label="Chord reference">
      <div
        className="chord-palette__header"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((current) => !current);
          }
        }}
      >
        <h3>Chords in this key</h3>
        <span className="chord-palette__caret" aria-hidden="true">
          {expanded ? '▴' : '▾'}
        </span>
      </div>
      {expanded ? (
        <div className="chord-palette__panel">
          <div className="chord-palette__grid">
            {diagrams.map(({ chord, shapes }) => (
              <figure key={chord} className={!shapes.length ? 'chord-palette__figure--missing' : undefined}>
                {shapes.length ? (
                  <ChordDiagramCarousel chord={chord} shapes={shapes} />
                ) : (
                  <MissingChordCard chord={chord} onAddChord={onAddChord} onBuildFromSimilar={onBuildFromSimilar} />
                )}
              </figure>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
});

ChordPalette.displayName = 'ChordPalette';

export default ChordPalette;
