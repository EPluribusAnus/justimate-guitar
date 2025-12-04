export type SongLine =
  | { type: 'section'; label: string }
  | { type: 'line'; content: string; chords?: string }
  | { type: 'spacer' };

export type SongType = 'chords' | 'tab' | 'bass' | 'ukulele' | 'drums' | 'video' | 'pro' | 'power' | 'other';

export interface Song {
  id: string;
  title: string;
  artist: string;
  defaultKey: string;
  type?: SongType;
  capo?: number;
  ugUrl?: string;
  tags?: string[];
  lines: SongLine[];
}

export type SongMap = Record<string, Song>;
