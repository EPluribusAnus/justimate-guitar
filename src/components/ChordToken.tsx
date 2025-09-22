import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import ChordDiagram from './ChordDiagram';
import { getChordShape } from '../utils/chords';

interface Props {
  chord: string;
}

const ChordToken = ({ chord }: Props) => {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const shape = useMemo(() => getChordShape(chord), [chord]);
  const showDiagram = pinned || hovered;
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!pinned) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (!containerRef.current?.contains(target)) {
        setPinned(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [pinned]);

  return (
    <span className="chord-token" ref={containerRef}>
      <button
        type="button"
        className={clsx('chord-token__label', { 'chord-token__label--missing': !shape })}
        onClick={() => setPinned((prev) => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        {chord}
      </button>
      {showDiagram && (
        <div className="chord-token__diagram" role="group" aria-label={`${chord} diagram`}>
          {shape ? (
            <ChordDiagram chord={chord} shape={shape} />
          ) : (
            <div className="chord-token__missing">
              <p>No diagram available for {chord} yet.</p>
              <p className="chord-token__hint">Try editing the chord or add a custom shape.</p>
            </div>
          )}
          <button type="button" className="chord-token__close" onClick={() => setPinned(false)}>
            ×
          </button>
        </div>
      )}
    </span>
  );
};

export default ChordToken;
