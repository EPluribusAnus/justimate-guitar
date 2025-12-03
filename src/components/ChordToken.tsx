import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import clsx from 'clsx';
import type { ChordShape } from '../utils/chords';
import ChordDiagramCarousel from './ChordDiagramCarousel';

interface Props {
  chord: string;
  shapes: ChordShape[];
}

const ChordToken = ({ chord, shapes }: Props) => {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const showDiagram = pinned || hovered;
  const hasShapes = shapes.length > 0;
  const containerRef = useRef<HTMLSpanElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

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

  useLayoutEffect(() => {
    if (!showDiagram) {
      return;
    }
    const updatePosition = () => {
      const container = containerRef.current;
      const diagram = diagramRef.current;
      if (!container || !diagram) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const diagramWidth = diagram.offsetWidth;
      const viewportWidth = window.innerWidth;
      const gap = 12;
      const desiredLeft = rect.left + rect.width / 2 - diagramWidth / 2;
      const clampedLeft = Math.max(gap, Math.min(desiredLeft, viewportWidth - diagramWidth - gap));
      const top = rect.bottom + 8;
      setPopoverStyle({ left: clampedLeft, top });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showDiagram]);

  return (
    <span className="chord-token" ref={containerRef}>
      <button
        type="button"
        className={clsx('chord-token__label', { 'chord-token__label--missing': !hasShapes })}
        onClick={() => setPinned((prev) => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        {chord}
      </button>
      {showDiagram && (
        <div className="chord-token__diagram" role="group" aria-label={`${chord} diagram`} ref={diagramRef} style={popoverStyle}>
          {hasShapes ? (
            <ChordDiagramCarousel chord={chord} shapes={shapes} />
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
