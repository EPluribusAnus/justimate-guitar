import { memo, useMemo } from 'react';
import { getChordShape } from '../utils/chords';
import type { ChordShape } from '../utils/chords';
import ChordDiagram from './ChordDiagram';

interface Props {
  chords: string[];
}

interface DiagramEntry {
  chord: string;
  shape: ChordShape;
}

const ChordPalette = memo(({ chords }: Props) => {
  const diagrams = useMemo<DiagramEntry[]>(
    () =>
      chords
        .map((chord) => {
          const shape = getChordShape(chord);
          return shape ? { chord, shape } : null;
        })
        .filter((entry): entry is DiagramEntry => entry !== null),
    [chords],
  );

  if (!diagrams.length) {
    return null;
  }

  return (
    <section className="chord-palette" aria-label="Chord reference">
      <h3>Chords in this key</h3>
      <div className="chord-palette__grid">
        {diagrams.map(({ chord, shape }) => (
          <figure key={chord}>
            <ChordDiagram chord={chord} shape={shape} />
          </figure>
        ))}
      </div>
    </section>
  );
});

ChordPalette.displayName = 'ChordPalette';

export default ChordPalette;
