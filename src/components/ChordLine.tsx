import type { LyricSegment } from '../utils/lyrics';
import type { ChordShape } from '../utils/chords';
import ChordToken from './ChordToken';

interface Props {
  segments: LyricSegment[];
  chordShapes: Record<string, ChordShape[]>;
  onAddChord?: (chord: string) => void;
  onBuildFromSimilar?: (chord: string) => void;
}

const ChordLine = ({ segments, chordShapes, onAddChord, onBuildFromSimilar }: Props) => {
  let lyricBuffer = '';
  const chordMarkers: { chord: string; offset: number }[] = [];

  segments.forEach((segment) => {
    const lyric = segment.lyric ?? '';
    const offset = lyricBuffer.length;

    if (segment.chord) {
      chordMarkers.push({ chord: segment.chord, offset });
    }

    if (lyric) {
      lyricBuffer += lyric;
    } else if (segment.chord) {
      const spacerWidth = Math.max(segment.chord.length + 3, 4);
      lyricBuffer += ' '.repeat(spacerWidth);
    }
  });

  const lyricText = lyricBuffer;

  return (
    <div className="chord-line">
      <div className="chord-line__lyrics">{lyricText || '\u00a0'}</div>
      {chordMarkers.length ? (
        <div className="chord-line__chords" aria-hidden="true">
          {chordMarkers.map((marker, index) => (
            <span key={`${marker.chord}-${index}`} className="chord-line__chord" style={{ left: `${marker.offset}ch` }}>
              <ChordToken
                chord={marker.chord}
                shapes={chordShapes[marker.chord] ?? []}
                onAddChord={onAddChord}
                onBuildFromSimilar={onBuildFromSimilar}
              />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ChordLine;
