const NOTE_SEQUENCE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_INDEX: Record<string, number> = Object.fromEntries(
  NOTE_SEQUENCE.map((note, index) => [note, index]),
);
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  Cb: 'B',
  Fb: 'E',
};
const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
};

export type ChordQuality =
  | 'maj'
  | 'm'
  | '7'
  | 'm7'
  | 'maj7'
  | 'sus4'
  | 'sus2'
  | '7sus4'
  | 'add9'
  | 'dim'
  | 'dim7'
  | 'm7b5'
  | 'aug'
  | 'unknown';

export interface ParsedChord {
  root: string;
  suffix: string;
  bass?: string;
  quality: ChordQuality;
  prefersFlat: boolean;
}

export interface BarreShape {
  fret: number;
  fromString: number;
  toString: number;
  finger?: number;
}

export interface ChordShape {
  frets: (number | 'x')[];
  fingers?: (number | null)[];
  barres?: BarreShape[];
  isOpen?: boolean;
  label?: string;
}

export type CustomChordShape = ChordShape & { id: string };
export type PreferredShapeSelection =
  | { type: 'built-in'; index: number }
  | { type: 'custom'; id: string };

interface ShapeTemplate {
  baseRoot: string;
  frets: (number | 'x')[];
  fingers?: (number | null)[];
  barres?: BarreShape[];
  isOpen?: boolean;
}

type ShapeKey = `${string}:${ChordQuality}`;
type ShapeCollection = Record<string, ChordShape[]>;

const OPEN_SHAPES: Partial<Record<ShapeKey, ChordShape[]>> = {
  'C:maj': [
    {
      frets: ['x', 3, 2, 0, 1, 0],
      fingers: [null, 3, 2, null, 1, null],
      isOpen: true,
    },
  ],
  'A:maj': [
    {
      frets: ['x', 0, 2, 2, 2, 0],
      fingers: [null, null, 1, 2, 3, null],
      isOpen: true,
    },
  ],
  'G:maj': [
    {
      frets: [3, 2, 0, 0, 0, 3],
      fingers: [2, 1, null, null, null, 3],
      isOpen: true,
    },
  ],
  'E:maj': [
    {
      frets: [0, 2, 2, 1, 0, 0],
      fingers: [null, 2, 3, 1, null, null],
      isOpen: true,
    },
  ],
  'D:maj': [
    {
      frets: ['x', 'x', 0, 2, 3, 2],
      fingers: [null, null, null, 1, 3, 2],
      isOpen: true,
    },
  ],
  'C:maj7': [
    {
      frets: ['x', 3, 2, 0, 0, 0],
      fingers: [null, 3, 2, null, null, null],
      isOpen: true,
    },
  ],
  'G:maj7': [
    {
      frets: [3, 2, 0, 0, 0, 2],
      fingers: [2, 1, null, null, null, 3],
      isOpen: true,
    },
  ],
  'A:maj7': [
    {
      frets: ['x', 0, 2, 1, 2, 0],
      fingers: [null, null, 2, 1, 3, null],
      isOpen: true,
    },
  ],
  'C:add9': [
    {
      frets: ['x', 3, 2, 0, 3, 0],
      fingers: [null, 3, 2, null, 4, null],
      isOpen: true,
    },
  ],
  'G:add9': [
    {
      frets: [3, 0, 0, 2, 0, 2],
      fingers: [2, null, null, 1, null, 3],
      isOpen: true,
    },
  ],
  'A:sus2': [
    {
      frets: ['x', 0, 2, 2, 0, 0],
      fingers: [null, null, 2, 3, null, null],
      isOpen: true,
    },
  ],
  'D:sus2': [
    {
      frets: ['x', 'x', 0, 2, 3, 0],
      fingers: [null, null, null, 1, 3, null],
      isOpen: true,
    },
  ],
  'A:sus4': [
    {
      frets: ['x', 0, 2, 2, 3, 0],
      fingers: [null, null, 1, 2, 3, null],
      isOpen: true,
    },
  ],
  'D:sus4': [
    {
      frets: ['x', 'x', 0, 2, 3, 3],
      fingers: [null, null, null, 1, 3, 4],
      isOpen: true,
    },
  ],
  'G:sus4': [
    {
      frets: [3, 3, 0, 0, 1, 3],
      fingers: [2, 3, null, null, 1, 4],
      isOpen: true,
    },
  ],
  'A:7sus4': [
    {
      frets: ['x', 0, 2, 0, 3, 0],
      fingers: [null, null, 2, null, 4, null],
      isOpen: true,
    },
  ],
  'E:sus4': [
    {
      frets: [0, 2, 2, 2, 0, 0],
      fingers: [null, 2, 3, 4, null, null],
      isOpen: true,
    },
  ],
  'E:sus2': [
    {
      frets: [0, 2, 4, 4, 0, 0],
      fingers: [null, 1, 3, 4, null, null],
      isOpen: true,
    },
  ],
  'A:m': [
    {
      frets: ['x', 0, 2, 2, 1, 0],
      fingers: [null, null, 2, 3, 1, null],
      isOpen: true,
    },
  ],
  'E:m': [
    {
      frets: [0, 2, 2, 0, 0, 0],
      fingers: [null, 2, 3, null, null, null],
      isOpen: true,
    },
  ],
  'D:m': [
    {
      frets: ['x', 'x', 0, 2, 3, 1],
      fingers: [null, null, null, 2, 3, 1],
      isOpen: true,
    },
  ],
  'E:m7': [
    {
      frets: [0, 2, 0, 0, 0, 0],
      fingers: [null, 2, null, null, null, null],
      isOpen: true,
    },
  ],
  'A:m7': [
    {
      frets: ['x', 0, 2, 0, 1, 0],
      fingers: [null, null, 2, null, 1, null],
      isOpen: true,
    },
  ],
  'D:m7': [
    {
      frets: ['x', 'x', 0, 2, 1, 1],
      fingers: [null, null, null, 2, 1, 1],
      barres: [{ fret: 1, fromString: 4, toString: 5, finger: 1 }],
      isOpen: true,
    },
  ],
  'G:7': [
    {
      frets: [3, 2, 0, 0, 0, 1],
      fingers: [2, 1, null, null, null, 3],
      isOpen: true,
    },
  ],
  'C:7': [
    {
      frets: ['x', 3, 2, 3, 1, 0],
      fingers: [null, 3, 2, 4, 1, null],
      isOpen: true,
    },
  ],
  'A:7': [
    {
      frets: ['x', 0, 2, 0, 2, 0],
      fingers: [null, null, 2, null, 3, null],
      isOpen: true,
    },
  ],
  'E:7': [
    {
      frets: [0, 2, 0, 1, 0, 0],
      fingers: [null, 2, null, 1, null, null],
      isOpen: true,
    },
  ],
  'D:7': [
    {
      frets: ['x', 'x', 0, 2, 1, 2],
      fingers: [null, null, null, 2, 1, 3],
      isOpen: true,
    },
  ],
};

const BARRE_TEMPLATES: Partial<Record<ChordQuality, ShapeTemplate[]>> = {
  maj: [
    {
      baseRoot: 'F',
      frets: [1, 3, 3, 2, 1, 1],
      fingers: [null, 3, 4, 2, null, null],
      barres: [{ fret: 1, fromString: 0, toString: 5, finger: 1 }],
    },
  ],
  m: [
    {
      baseRoot: 'F',
      frets: [1, 3, 3, 1, 1, 1],
      fingers: [null, 3, 4, null, null, null],
      barres: [{ fret: 1, fromString: 0, toString: 5, finger: 1 }],
    },
  ],
  '7': [
    {
      baseRoot: 'F',
      frets: [1, 3, 1, 2, 1, 1],
      fingers: [null, 3, null, 2, null, null],
      barres: [{ fret: 1, fromString: 0, toString: 5, finger: 1 }],
    },
  ],
  m7: [
    {
      baseRoot: 'F',
      frets: [1, 3, 1, 1, 1, 1],
      fingers: [null, 3, null, null, null, null],
      barres: [{ fret: 1, fromString: 0, toString: 5, finger: 1 }],
    },
  ],
  maj7: [
    {
      baseRoot: 'F',
      frets: [1, 3, 2, 2, 1, 1],
      fingers: [null, 3, 2, 4, null, null],
      barres: [{ fret: 1, fromString: 0, toString: 5, finger: 1 }],
    },
  ],
  sus4: [
    {
      baseRoot: 'F',
      frets: [1, 3, 3, 3, 1, 1],
      fingers: [null, 3, 4, 2, null, null],
      barres: [{ fret: 1, fromString: 0, toString: 5, finger: 1 }],
    },
  ],
  '7sus4': [
    {
      baseRoot: 'F',
      frets: [1, 3, 1, 3, 1, 1],
      fingers: [null, 3, null, 4, null, null],
      barres: [{ fret: 1, fromString: 0, toString: 5, finger: 1 }],
    },
  ],
  add9: [
    {
      baseRoot: 'F',
      frets: [1, 3, 3, 1, 1, 3],
      fingers: [null, 3, 4, null, null, 4],
      barres: [{ fret: 1, fromString: 0, toString: 5, finger: 1 }],
    },
  ],
  dim: [
    {
      baseRoot: 'B',
      frets: ['x', 2, 3, 4, 3, 'x'],
      fingers: [null, 1, 2, 4, 3, null],
    },
  ],
  dim7: [
    {
      baseRoot: 'B',
      frets: ['x', 2, 3, 1, 3, 1],
      fingers: [null, 2, 3, 1, 4, 1],
      barres: [{ fret: 1, fromString: 3, toString: 5, finger: 1 }],
    },
  ],
  m7b5: [
    {
      baseRoot: 'B',
      frets: ['x', 2, 3, 2, 3, 'x'],
      fingers: [null, 1, 3, 2, 4, null],
    },
  ],
  aug: [
    {
      baseRoot: 'F',
      frets: [1, 4, 3, 2, 2, 1],
      fingers: [1, 4, 3, 2, 2, 1],
      barres: [{ fret: 1, fromString: 0, toString: 5, finger: 1 }],
    },
  ],
};

export const parseChord = (symbol: string): ParsedChord | null => {
  if (!symbol.trim()) {
    return null;
  }

  const [chordPart, bassPart] = symbol.split('/');
  const match = chordPart.trim().match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) {
    return null;
  }

  const [, rawRoot, rawSuffix] = match;
  const prefersFlat = rawRoot.includes('b');
  const root = normalizeNote(rawRoot);
  if (!root) {
    return null;
  }

  const suffix = rawSuffix.trim();
  const quality = getChordQuality(suffix);
  const normalizedBass = bassPart ? normalizeNote(bassPart.trim()) : undefined;
  const bass = normalizedBass ?? undefined;

  return {
    root,
    suffix,
    bass,
    quality,
    prefersFlat,
  };
};

export const transposeChord = (symbol: string, semitones: number): string => {
  const parsed = parseChord(symbol);
  if (!parsed) {
    return symbol;
  }

  const newRoot = transposeNote(parsed.root, semitones, parsed.prefersFlat);
  const newBass = parsed.bass ? transposeNote(parsed.bass, semitones, parsed.bass.includes('b')) : undefined;

  return `${newRoot}${parsed.suffix}${newBass ? `/${newBass}` : ''}`;
};

export const getChordShape = (symbol: string): ChordShape | null => {
  const parsed = parseChord(symbol);
  if (!parsed || parsed.quality === 'unknown') {
    return null;
  }

  const openShape = getOpenShape(parsed);
  if (openShape) {
    return openShape;
  }

  const templates = BARRE_TEMPLATES[parsed.quality];
  if (!templates) {
    return null;
  }

  for (const template of templates) {
    const shape = buildShapeFromTemplate(template, parsed.root);
    if (shape) {
      return shape;
    }
  }

  return null;
};

const qualityToSuffix = (quality: ChordQuality) => {
  switch (quality) {
    case 'maj':
      return '';
    case 'm':
      return 'm';
    case 'maj7':
      return 'maj7';
    case 'm7':
      return 'm7';
    case '7':
      return '7';
    case 'sus4':
      return 'sus4';
    case '7sus4':
      return '7sus4';
    case 'dim':
      return 'dim';
    case 'aug':
      return 'aug';
    default:
      return quality;
  }
};

export const listBuiltInChordShapes = (): ShapeCollection => {
  const shapes: ShapeCollection = {};

  Object.entries(OPEN_SHAPES).forEach(([key, value]) => {
    const [root, quality] = key.split(':');
    const suffix = qualityToSuffix(quality as ChordQuality);
    const symbol = `${root}${suffix}`;
    shapes[symbol] = value ? value.map((shape) => ({ ...shape })) : [];
  });

  Object.entries(BARRE_TEMPLATES).forEach(([quality, templates]) => {
    if (!templates) return;
    const suffix = qualityToSuffix(quality as ChordQuality);
    templates.forEach((template) => {
      const symbol = `${template.baseRoot}${suffix}`;
      const shape = buildShapeFromTemplate(template, template.baseRoot);
      if (!shape) return;
      shapes[symbol] = shapes[symbol] ? [...shapes[symbol], shape] : [shape];
    });
  });

  return shapes;
};

const getOpenShape = (parsed: ParsedChord): ChordShape | null => {
  const key = `${parsed.root}:${parsed.quality}` as ShapeKey;
  const shapes = OPEN_SHAPES[key];
  if (shapes && shapes.length) {
    return { ...shapes[0] };
  }
  return null;
};

const buildShapeFromTemplate = (template: ShapeTemplate, targetRoot: string): ChordShape | null => {
  const normalizedBase = normalizeNote(template.baseRoot);
  if (!normalizedBase) {
    return null;
  }

  const baseIndex = NOTE_INDEX[normalizedBase];
  const targetIndex = NOTE_INDEX[targetRoot];
  if (baseIndex === undefined || targetIndex === undefined) {
    return null;
  }

  const diff = (targetIndex - baseIndex + 12) % 12;

  const frets = template.frets.map((value) => {
    if (value === 'x') {
      return value;
    }
    return value + diff;
  });

  const barres = template.barres
    ?.map((barre) => ({
      fret: barre.fret + diff,
      fromString: barre.fromString,
      toString: barre.toString,
      finger: barre.finger,
    }))
    .filter((barre) => barre.fret > 0);

  return {
    frets,
    fingers: template.fingers ? [...template.fingers] : undefined,
    barres,
    isOpen: template.isOpen ?? false,
  };
};

const normalizeNote = (note: string): string | null => {
  const cleaned = note.trim();
  if (NOTE_INDEX[cleaned] !== undefined) {
    return cleaned;
  }

  const formatted = cleaned.replace('♭', 'b').replace('♯', '#');
  if (NOTE_INDEX[formatted] !== undefined) {
    return formatted;
  }

  const sharp = FLAT_TO_SHARP[formatted];
  if (sharp && NOTE_INDEX[sharp] !== undefined) {
    return sharp;
  }

  return null;
};

const transposeNote = (note: string, semitones: number, preferFlat = false): string => {
  const normalized = normalizeNote(note);
  if (!normalized) {
    return note;
  }

  const index = NOTE_INDEX[normalized];
  const newIndex = (index + semitones + 12 * 10) % 12;
  const sharpName = NOTE_SEQUENCE[newIndex];
  if (preferFlat) {
    return SHARP_TO_FLAT[sharpName] ?? sharpName;
  }
  return sharpName;
};

const getChordQuality = (suffix: string): ChordQuality => {
  const lower = suffix.toLowerCase();

  if (!lower) {
    return 'maj';
  }

  if (lower === 'm' || lower.startsWith('min') || lower.startsWith('-')) {
    if (lower.startsWith('m7b5') || lower.startsWith('min7b5') || lower.startsWith('ø')) {
      return 'm7b5';
    }
    if (lower.startsWith('m7') || lower.startsWith('min7')) {
      return 'm7';
    }
    return 'm';
  }

  if (lower.startsWith('maj7') || lower.startsWith('ma7')) {
    return 'maj7';
  }

  if (lower.startsWith('maj')) {
    return 'maj';
  }

  if (lower.startsWith('7sus4')) {
    return '7sus4';
  }

  if (lower.startsWith('sus2')) {
    return 'sus2';
  }

  if (lower.startsWith('sus4') || lower.startsWith('sus')) {
    return 'sus4';
  }

  if (lower.startsWith('add9')) {
    return 'add9';
  }

  if (lower.startsWith('dim7')) {
    return 'dim7';
  }

  if (lower.startsWith('dim') || lower.startsWith('°')) {
    return 'dim';
  }

  if (lower.startsWith('aug') || lower.startsWith('+')) {
    return 'aug';
  }

  if (lower.startsWith('m7') || lower.startsWith('min7')) {
    return 'm7';
  }

  if (lower.startsWith('m7b5') || lower.startsWith('min7b5')) {
    return 'm7b5';
  }

  if (lower.startsWith('m9')) {
    return 'm7';
  }

  if (lower.startsWith('9') || lower.startsWith('11') || lower.startsWith('13')) {
    return '7';
  }

  if (lower.startsWith('7')) {
    return '7';
  }

  return 'unknown';
};

export const DEFAULT_OVERRIDE_PREFIX = 'default-override:';

export const buildDefaultOverrideId = (chord: string, index: number) =>
  `${DEFAULT_OVERRIDE_PREFIX}${encodeURIComponent(chord)}:${index}`;

export const parseDefaultOverrideId = (
  id: string,
): { chord: string; index: number } | null => {
  if (!id.startsWith(DEFAULT_OVERRIDE_PREFIX)) {
    return null;
  }
  const payload = id.slice(DEFAULT_OVERRIDE_PREFIX.length);
  const [encodedChord, indexStr] = payload.split(':');
  const chord = encodedChord ? decodeURIComponent(encodedChord) : '';
  const index = Number(indexStr);
  if (!Number.isFinite(index)) {
    return null;
  }
  return { chord, index };
};

const cloneChordShape = (shape: ChordShape, fallbackLabel?: string): ChordShape => ({
  frets: [...shape.frets],
  fingers: shape.fingers ? [...shape.fingers] : undefined,
  barres: shape.barres ? shape.barres.map((barre) => ({ ...barre })) : undefined,
  isOpen: shape.isOpen,
  label: shape.label ?? fallbackLabel,
});

type ShapeEntry = {
  shape: ChordShape;
  builtInIndex?: number;
  customId?: string;
};

export const mergeChordShapes = (
  builtIn: Record<string, ChordShape[]>,
  custom: Record<string, CustomChordShape[]>,
  preferred: Record<string, PreferredShapeSelection | undefined> = {},
): Record<string, ChordShape[]> => {
  const result: Record<string, ChordShape[]> = {};
  const symbols = new Set([...Object.keys(builtIn), ...Object.keys(custom)]);

  symbols.forEach((symbol) => {
    const base = builtIn[symbol] ?? [];
    const entries: Array<ShapeEntry | null> = base.map((shape, index) => ({
      shape: cloneChordShape(shape, 'Default'),
      builtInIndex: index,
    }));

    (custom[symbol] ?? []).forEach((customShape) => {
      const overrideMeta = parseDefaultOverrideId(customShape.id);
      if (overrideMeta && overrideMeta.chord === symbol && overrideMeta.index >= 0) {
        entries[overrideMeta.index] = {
          shape: cloneChordShape(customShape, customShape.label ?? 'Default'),
          builtInIndex: overrideMeta.index,
          customId: customShape.id,
        };
        return;
      }
      entries.push({
        shape: cloneChordShape(customShape, customShape.label ?? 'Custom'),
        customId: customShape.id,
      });
    });

    const filtered = entries.filter((entry): entry is ShapeEntry => Boolean(entry));
    const selection = preferred[symbol];
    if (selection) {
      const targetIndex = filtered.findIndex((entry) =>
        selection.type === 'custom'
          ? entry.customId === selection.id
          : entry.builtInIndex === selection.index,
      );
      if (targetIndex > 0) {
        const [chosen] = filtered.splice(targetIndex, 1);
        filtered.unshift(chosen);
      }
    }

    result[symbol] = filtered.map((entry) => entry.shape);
  });

  return result;
};
