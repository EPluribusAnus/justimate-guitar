export type SongLine =
  | { type: 'section'; label: string }
  | { type: 'line'; content: string; chords?: string }
  | { type: 'spacer' };

export interface Song {
  id: string;
  title: string;
  artist: string;
  defaultKey: string;
  capo?: number;
  tags?: string[];
  lines: SongLine[];
}

export type SongMap = Record<string, Song>;
