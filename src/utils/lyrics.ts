import { parseChord } from './chords';

export interface LyricSegment {
  chord?: string;
  lyric: string;
}

const CHORD_REGEX = /\[([^\]]+)\]/g;
const NON_SPACE_TOKEN_REGEX = /\S+/g;

const sanitizeChordToken = (token: string) => token.replace(/[|()[\]]/g, '').trim();

const isLikelyChordToken = (token: string): boolean => {
  const cleaned = sanitizeChordToken(token);
  if (!cleaned) {
    return false;
  }
  return Boolean(parseChord(cleaned));
};

export const isLikelyChordGuideLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return false;
  }

  const chordTokenCount = tokens.filter((token) => isLikelyChordToken(token)).length;
  if (!chordTokenCount) {
    return false;
  }

  if (tokens.length === 1) {
    return chordTokenCount === 1;
  }

  return chordTokenCount / tokens.length >= 0.6;
};

const parseWithChordGuide = (lyric: string, chordGuide: string): LyricSegment[] => {
  const matches: { chord: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  NON_SPACE_TOKEN_REGEX.lastIndex = 0;
  while ((match = NON_SPACE_TOKEN_REGEX.exec(chordGuide)) !== null) {
    const cleaned = sanitizeChordToken(match[0]);
    if (!cleaned) {
      continue;
    }

    if (!parseChord(cleaned)) {
      continue;
    }

    matches.push({ chord: cleaned, index: match.index });
  }

  if (!matches.length) {
    return parseInlineChordSyntax(lyric);
  }

  const segments: LyricSegment[] = [];
  let lyricIndex = 0;
  let pendingChord: string | undefined;

  matches.forEach(({ chord, index }) => {
    const boundedIndex = Math.min(Math.max(index, lyricIndex), lyric.length);
    const lyricChunk = lyric.slice(lyricIndex, boundedIndex);

    if (pendingChord !== undefined) {
      segments.push({ chord: pendingChord, lyric: lyricChunk });
      pendingChord = undefined;
    } else if (lyricChunk) {
      segments.push({ lyric: lyricChunk });
    }

    pendingChord = chord;
    lyricIndex = boundedIndex;
  });

  const tail = lyric.slice(lyricIndex);
  if (pendingChord !== undefined) {
    segments.push({ chord: pendingChord, lyric: tail });
  } else if (tail) {
    segments.push({ lyric: tail });
  }

  if (!segments.length) {
    return [{ lyric }];
  }

  return segments;
};

const parseInlineChordSyntax = (line: string): LyricSegment[] => {
  const segments: LyricSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let pendingChord: string | undefined;

  CHORD_REGEX.lastIndex = 0;
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

export const parseLyricLine = (line: string, chordGuide?: string): LyricSegment[] => {
  if (chordGuide && chordGuide.trim()) {
    return parseWithChordGuide(line, chordGuide);
  }

  return parseInlineChordSyntax(line);
};

const ensureLength = (buffer: string[], length: number) => {
  while (buffer.length < length) {
    buffer.push(' ');
  }
};

const canPlaceChord = (buffer: string[], start: number, length: number): boolean => {
  for (let index = 0; index < length; index += 1) {
    const existing = buffer[start + index];
    if (existing !== undefined && existing !== ' ') {
      return false;
    }
  }
  return true;
};

export const segmentsToUltimateGuitarLines = (segments: LyricSegment[]): { chords: string; lyric: string } => {
  const lyric = segments.map((segment) => segment.lyric).join('');
  const hasChords = segments.some((segment) => Boolean(segment.chord));

  if (!hasChords) {
    return { chords: '', lyric };
  }

  const chordChars: string[] = [];
  let lyricIndex = 0;

  segments.forEach((segment) => {
    if (segment.chord) {
      let placementIndex = lyricIndex;

      if (placementIndex > chordChars.length) {
        ensureLength(chordChars, placementIndex);
      }

      while (!canPlaceChord(chordChars, placementIndex, segment.chord.length)) {
        placementIndex += 1;
      }

      ensureLength(chordChars, placementIndex + segment.chord.length);

      for (let charIndex = 0; charIndex < segment.chord.length; charIndex += 1) {
        chordChars[placementIndex + charIndex] = segment.chord[charIndex];
      }
    }

    lyricIndex += segment.lyric.length;
  });

  return {
    chords: chordChars.join('').replace(/\s+$/, ''),
    lyric,
  };
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
