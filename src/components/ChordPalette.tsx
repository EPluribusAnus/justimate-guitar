import { memo, useMemo, useState } from 'react';
import type { ChordShape } from '../utils/chords';
import ChordDiagramCarousel from './ChordDiagramCarousel';

interface Props {
  chords: string[];
  chordShapes: Record<string, ChordShape[]>;
}

interface DiagramEntry {
  chord: string;
  shapes: ChordShape[];
}

const ChordPalette = memo(({ chords, chordShapes }: Props) => {
  const [expanded, setExpanded] = useState(true);
  const diagrams = useMemo<DiagramEntry[]>(
    () =>
      chords
        .map((chord) => {
          const shapes = chordShapes[chord] ?? [];
          return shapes.length ? { chord, shapes } : null;
        })
        .filter((entry): entry is DiagramEntry => entry !== null),
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
              <figure key={chord}>
                <ChordDiagramCarousel chord={chord} shapes={shapes} />
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
