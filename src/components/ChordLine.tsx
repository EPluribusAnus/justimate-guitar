import type { LyricSegment } from '../utils/lyrics';
import type { ChordShape } from '../utils/chords';
import ChordToken from './ChordToken';

interface Props {
  segments: LyricSegment[];
  chordShapes: Record<string, ChordShape[]>;
}

const ChordLine = ({ segments, chordShapes }: Props) => {
  return (
    <div className="chord-line">
      {segments.map((segment, index) => {
        const lyric = segment.lyric ?? '';
        const approximateWidth = Math.max(lyric.length, segment.chord ? segment.chord.length : 1);
        return (
          <span
            key={`${segment.chord ?? 'lyric'}-${index}`}
            className="chord-line__segment"
            style={{ minWidth: `${approximateWidth}ch` }}
          >
            <span className="chord-line__chord">
              {segment.chord ? <ChordToken chord={segment.chord} shapes={chordShapes[segment.chord] ?? []} /> : null}
            </span>
            <span className="chord-line__lyrics">{lyric || '\u00a0'}</span>
          </span>
        );
      })}
    </div>
  );
};

export default ChordLine;
