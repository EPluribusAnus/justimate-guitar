import type { SongLine } from '../types';
import { isLikelyChordGuideLine, parseLyricLine, segmentsToUltimateGuitarLines } from './lyrics';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);

export const buildSongId = (title: string, artist: string) => {
  const base = `${slugify(artist)}-${slugify(title)}`.replace(/^-+|-+$/g, '');
  const fallback = slugify(title) || 'song';
  return base || fallback;
};

export const parseContent = (content: string): SongLine[] => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const result: SongLine[] = [];
  let pendingChordGuide: string | null = null;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      if (pendingChordGuide !== null) {
        result.push({ type: 'line', content: '', chords: pendingChordGuide });
        pendingChordGuide = null;
      }
      if (result[result.length - 1]?.type !== 'spacer') {
        result.push({ type: 'spacer' });
      }
      return;
    }

    const sectionFromBrackets = trimmed.match(/^\[(.+)\]$/);
    if (sectionFromBrackets) {
      if (pendingChordGuide !== null) {
        result.push({ type: 'line', content: '', chords: pendingChordGuide });
        pendingChordGuide = null;
      }
      const label = sectionFromBrackets[1].trim() || 'Section';
      result.push({ type: 'section', label });
      return;
    }

    if (trimmed.startsWith('#')) {
      if (pendingChordGuide !== null) {
        result.push({ type: 'line', content: '', chords: pendingChordGuide });
        pendingChordGuide = null;
      }
      const label = line.replace(/^#+/, '').trim() || 'Section';
      result.push({ type: 'section', label });
      return;
    }

    if (isLikelyChordGuideLine(line)) {
      if (pendingChordGuide !== null) {
        result.push({ type: 'line', content: '', chords: pendingChordGuide });
      }
      pendingChordGuide = line;
      return;
    }

    if (pendingChordGuide !== null) {
      result.push({ type: 'line', content: line, chords: pendingChordGuide });
      pendingChordGuide = null;
    } else {
      result.push({ type: 'line', content: line });
    }
  });

  if (pendingChordGuide !== null) {
    result.push({ type: 'line', content: '', chords: pendingChordGuide });
  }

  return result;
};

export const stringifyLines = (lines: SongLine[]): string => {
  const output: string[] = [];

  lines.forEach((line) => {
    if (line.type === 'section') {
      output.push(`[${line.label}]`);
      return;
    }

    if (line.type === 'spacer') {
      output.push('');
      return;
    }

    if (line.chords && line.chords.trim()) {
      output.push(line.chords);
      output.push(line.content);
      return;
    }

    const segments = parseLyricLine(line.content);
    const formatted = segmentsToUltimateGuitarLines(segments);
    if (formatted.chords) {
      output.push(formatted.chords);
    }
    output.push(formatted.lyric);
  });

  return output.join('\n');
};
