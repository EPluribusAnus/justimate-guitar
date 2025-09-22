import { memo } from 'react';
import type { ChordShape } from '../utils/chords';

interface Props {
  chord: string;
  shape: ChordShape;
}

const WIDTH = 120;
const HEIGHT = 160;
const LEFT_MARGIN = 18;
const RIGHT_MARGIN = 18;
const TOP_MARGIN = 56;
const BOTTOM_MARGIN = 28;
const NUM_STRINGS = 6;
const NUM_FRETS = 5;

const stringPositions = Array.from({ length: NUM_STRINGS }, (_, index) =>
  LEFT_MARGIN + ((WIDTH - LEFT_MARGIN - RIGHT_MARGIN) / (NUM_STRINGS - 1)) * index,
);

const ChordDiagram = memo(({ chord, shape }: Props) => {
  const numericFrets = shape.frets.filter((value): value is number => typeof value === 'number');
  const positiveFrets = numericFrets.filter((fret) => fret > 0);
  const minFret = positiveFrets.length ? Math.min(...positiveFrets) : 1;
  const maxFret = positiveFrets.length ? Math.max(...positiveFrets) : 4;

  let startFret = shape.isOpen ? 1 : minFret <= 1 ? 1 : minFret;
  if (!shape.isOpen && startFret > 1) {
    const span = maxFret - minFret;
    if (span >= NUM_FRETS) {
      startFret = maxFret - (NUM_FRETS - 1);
    }
  }

  const barreStrings = new Map<number, { fret: number; finger?: number }>();
  shape.barres?.forEach((barre) => {
    const from = Math.min(barre.fromString, barre.toString);
    const to = Math.max(barre.fromString, barre.toString);
    for (let stringIndex = from; stringIndex <= to; stringIndex += 1) {
      barreStrings.set(stringIndex, { fret: barre.fret, finger: barre.finger });
    }
  });

  const fretSpacing = (HEIGHT - TOP_MARGIN - BOTTOM_MARGIN) / (NUM_FRETS - 1);

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`${chord} chord diagram`}
      style={{ overflow: 'visible' }}
    >
      <text x={WIDTH / 2} y={24} textAnchor="middle" fontSize="18" fontWeight={700} fill="#0f172a">
        {chord}
      </text>
      {!shape.isOpen && startFret > 1 && (
        <text
          x={LEFT_MARGIN - 6}
          y={TOP_MARGIN + fretSpacing / 2}
          fontSize="13"
          fontWeight={700}
          fill="#334155"
          textAnchor="end"
        >
          {startFret}fr
        </text>
      )}
      {Array.from({ length: NUM_FRETS }, (_, index) => {
        const y = TOP_MARGIN + fretSpacing * index;
        const strokeWidth = index === 0 && startFret === 1 ? 4 : 2;
        return (
          <line
            key={`fret-${index}`}
            x1={stringPositions[0]}
            y1={y}
            x2={stringPositions[NUM_STRINGS - 1]}
            y2={y}
            stroke="#1f2937"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      })}
      {stringPositions.map((x, index) => (
        <line
          key={`string-${index}`}
          x1={x}
          y1={TOP_MARGIN}
          x2={x}
          y2={HEIGHT - BOTTOM_MARGIN}
          stroke="#1f2937"
          strokeWidth={1.5}
        />
      ))}
      {shape.frets.map((value, stringIndex) => {
        const x = stringPositions[stringIndex];
        if (value === 'x') {
          return (
            <text key={`mute-${stringIndex}`} x={x} y={TOP_MARGIN - 10} textAnchor="middle" fontSize="14" fill="#ef4444" fontWeight={600}>
              ×
            </text>
          );
        }
        if (value === 0) {
          return (
            <circle
              key={`open-${stringIndex}`}
              cx={x}
              cy={TOP_MARGIN - 16}
              r={4}
              stroke="#1f2937"
              strokeWidth={1.5}
              fill="transparent"
            />
          );
        }

        const barreForString = barreStrings.get(stringIndex);
        if (barreForString && barreForString.fret === value) {
          return null;
        }

        const fretOffset = value - startFret + 0.5;
        const y = TOP_MARGIN + fretSpacing * fretOffset;
        return (
          <g key={`fret-${stringIndex}`}>
            <circle cx={x} cy={y} r={7} fill="#111827" />
            {shape.fingers?.[stringIndex] ? (
              <text
                x={x}
                y={y + 3}
                fontSize="10"
                fontWeight={600}
                fill="#f8fafc"
                textAnchor="middle"
              >
                {shape.fingers[stringIndex]}
              </text>
            ) : null}
          </g>
        );
      })}
      {shape.barres?.map((barre, index) => {
        const center = barre.fret - startFret + 0.5;
        if (center < -0.5 || center > NUM_FRETS - 0.5) {
          return null;
        }

        const y = TOP_MARGIN + fretSpacing * center;
        const from = Math.min(barre.fromString, barre.toString);
        const to = Math.max(barre.fromString, barre.toString);
        const x1 = stringPositions[from];
        const x2 = stringPositions[to];
        return (
          <g key={`barre-${index}`}>
            <line
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke="#111827"
              strokeWidth={12}
              strokeLinecap="round"
              opacity={0.9}
            />
          </g>
        );
      })}
    </svg>
  );
});

ChordDiagram.displayName = 'ChordDiagram';

export default ChordDiagram;
