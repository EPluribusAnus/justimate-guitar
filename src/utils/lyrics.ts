export interface LyricSegment {
  chord?: string;
  lyric: string;
}

const CHORD_REGEX = /\[([^\]]+)\]/g;

export const parseLyricLine = (line: string): LyricSegment[] => {
  const segments: LyricSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let pendingChord: string | undefined;

  while ((match = CHORD_REGEX.exec(line)) !== null) {
    const lyricChunk = line.slice(lastIndex, match.index);
    if (pendingChord !== undefined) {
      segments.push({ chord: pendingChord.trim(), lyric: lyricChunk });
      pendingChord = undefined;
    } else if (lyricChunk) {
      segments.push({ lyric: lyricChunk });
    }

    pendingChord = match[1].trim();
    lastIndex = match.index + match[0].length;
  }

  const tail = line.slice(lastIndex);
  if (pendingChord !== undefined) {
    segments.push({ chord: pendingChord.trim(), lyric: tail });
  } else if (tail) {
    segments.push({ lyric: tail });
  }

  if (!segments.length) {
    return [{ lyric: line }];
  }

  return segments;
};

export const transposeSegments = (segments: LyricSegment[], semitones: number, transposeFn: (chord: string, steps: number) => string): LyricSegment[] =>
  segments.map((segment) => {
    if (!segment.chord) {
      return segment;
    }
    return {
      chord: transposeFn(segment.chord, semitones),
      lyric: segment.lyric,
    };
  });

export const collectUniqueChords = (segments: LyricSegment[]): string[] => {
  const set = new Set<string>();
  segments.forEach((segment) => {
    if (segment.chord) {
      set.add(segment.chord);
    }
  });
  return Array.from(set);
};
