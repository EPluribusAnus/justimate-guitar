import { useEffect, useState, type MouseEvent } from 'react';
import type { ChordShape } from '../utils/chords';
import ChordDiagram from './ChordDiagram';

interface Props {
  chord: string;
  shapes: ChordShape[];
}

const fallbackLabel = (shape: ChordShape) => {
  if (shape.label) {
    return shape.label;
  }
  return 'Default';
};

const ChordDiagramCarousel = ({ chord, shapes }: Props) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [chord, shapes]);

  if (!shapes.length) {
    return null;
  }

  const total = shapes.length;
  const showControls = total > 1;
  const handlePrev = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIndex((current) => (current - 1 + total) % total);
  };
  const handleNext = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIndex((current) => (current + 1) % total);
  };
  const label = fallbackLabel(shapes[index]);

  return (
    <div className="chord-diagram-picker">
      {showControls ? (
        <button type="button" className="chord-diagram-picker__arrow chord-diagram-picker__arrow--prev" onClick={handlePrev} aria-label="Previous shape">
          ‹
        </button>
      ) : null}
      <div className="chord-diagram-picker__diagram">
        <ChordDiagram chord={chord} shape={shapes[index]} />
      </div>
      <p className="chord-diagram-picker__count">
        {index + 1}/{total}
      </p>
      <p className="chord-diagram-picker__label">{label}</p>
      {showControls ? (
        <button type="button" className="chord-diagram-picker__arrow chord-diagram-picker__arrow--next" onClick={handleNext} aria-label="Next shape">
          ›
        </button>
      ) : null}
    </div>
  );
};

export default ChordDiagramCarousel;
