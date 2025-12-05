import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import clsx from 'clsx';
import ChordDiagram from './ChordDiagram';
import type { ChordShape, CustomChordShape, PreferredShapeSelection } from '../utils/chords';
import { buildDefaultOverrideId, parseDefaultOverrideId } from '../utils/chords';

interface Props {
  builtInShapes: Record<string, ChordShape[]>;
  customShapes: Record<string, CustomChordShape[]>;
  preferredShapes: Record<string, PreferredShapeSelection | undefined>;
  onSave: (shapes: Record<string, CustomChordShape[]>) => void;
  onSetPreferred: (chord: string, selection: PreferredShapeSelection | null) => void;
  onClose: () => void;
  seedChord?: { symbol: string; openEditor?: boolean; focusFamily?: boolean } | null;
}

type ShapeForm = {
  chord: string;
  frets: (number | 'x' | '')[];
  fingers: (number | null | '')[];
  barre: { fret: string; from: string; to: string; finger: string };
  label: string;
  editingId?: string | null;
};

const emptyForm: ShapeForm = {
  chord: '',
  frets: ['x', 'x', 'x', 'x', 'x', 'x'],
  fingers: ['', '', '', '', '', ''],
  barre: { fret: '', from: '', to: '', finger: '' },
  label: '',
  editingId: null,
};

const CHORD_FAMILIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `shape-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

type ChordFamily = (typeof CHORD_FAMILIES)[number];

const getChordFamily = (symbol: string): ChordFamily | null => {
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) {
    return null;
  }
  const letter = trimmed[0] as ChordFamily | string;
  if (CHORD_FAMILIES.includes(letter as ChordFamily)) {
    return letter as ChordFamily;
  }
  return null;
};

const ChordLibraryModal = ({ builtInShapes, customShapes, preferredShapes, onSave, onSetPreferred, onClose, seedChord }: Props) => {
  const [form, setForm] = useState<ShapeForm>(emptyForm);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeFamilies, setActiveFamilies] = useState<ChordFamily[]>([]);
  const [shiftBaseline, setShiftBaseline] = useState<{ frets: (number | 'x' | '')[]; barre: ShapeForm['barre'] }>({
    frets: [...emptyForm.frets],
    barre: { ...emptyForm.barre },
  });
  const [shiftOffset, setShiftOffset] = useState(0);
  const chords = useMemo(() => {
    const set = new Set<string>([...Object.keys(builtInShapes), ...Object.keys(customShapes)]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [builtInShapes, customShapes]);
  const availableFamilies = useMemo(() => {
    const present = new Set<ChordFamily>();
    chords.forEach((symbol) => {
      const family = getChordFamily(symbol);
      if (family) {
        present.add(family);
      }
    });
    return CHORD_FAMILIES.filter((family) => present.has(family));
  }, [chords]);
  useEffect(() => {
    setActiveFamilies((current) => current.filter((family) => availableFamilies.includes(family)));
  }, [availableFamilies]);
  useEffect(() => {
    if (!seedChord?.symbol) {
      return;
    }
    const chord = seedChord.symbol;
    setForm((prev) => ({
      ...emptyForm,
      ...prev,
      chord,
      editingId: null,
      frets: [...emptyForm.frets],
      fingers: [...emptyForm.fingers],
      barre: { ...emptyForm.barre },
    }));
    if (seedChord.openEditor) {
      setIsEditorOpen(true);
    }
    if (seedChord.focusFamily) {
      const family = getChordFamily(chord);
      if (family) {
        setActiveFamilies((current) => (current.includes(family) ? current : [...current, family]));
      }
    }
  }, [seedChord]);
  const filteredChords = useMemo(() => {
    if (!activeFamilies.length) {
      return chords;
    }
    return chords.filter((symbol) => {
      const family = getChordFamily(symbol);
      return family ? activeFamilies.includes(family) : false;
    });
  }, [chords, activeFamilies]);
  const previewShape = useMemo(() => {
    const frets = form.frets.map((fret) => (fret === 'x' ? 'x' : typeof fret === 'number' ? fret : Number(fret) || 0));
    const fingers = form.fingers.some((finger) => finger !== '' && finger !== null)
      ? form.fingers.map((finger) => (finger === '' || finger === null ? null : Number(finger) || null))
      : undefined;
    const hasBarre = form.barre.fret && form.barre.from && form.barre.to;
    const barres =
      hasBarre &&
      Number.isFinite(Number(form.barre.fret)) &&
      Number.isFinite(Number(form.barre.from)) &&
      Number.isFinite(Number(form.barre.to))
        ? [
            {
              fret: Number(form.barre.fret),
              fromString: Math.max(0, Number(form.barre.from) - 1),
              toString: Math.max(0, Number(form.barre.to) - 1),
              finger: form.barre.finger ? Number(form.barre.finger) : undefined,
            },
          ]
        : undefined;
    return {
      frets,
      fingers,
      barres,
      isOpen: frets.some((f) => f === 0),
      label: form.label || undefined,
    } satisfies ChordShape;
  }, [form]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) {
        return;
      }
      if (!target.closest('.chord-lib__card-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  const toggleFamily = (letter: ChordFamily) => {
    setActiveFamilies((current) => (current.includes(letter) ? current.filter((item) => item !== letter) : [...current, letter]));
  };

  const handleSetDefaultCustom = (chord: string, id: string) => {
    onSetPreferred(chord, { type: 'custom', id });
  };

  const handleSetDefaultBuiltIn = (chord: string, index: number) => {
    onSetPreferred(chord, { type: 'built-in', index });
  };

  const startEditSession = (nextForm: ShapeForm) => {
    setForm(nextForm);
    setShiftBaseline({
      frets: [...nextForm.frets],
      barre: { ...nextForm.barre },
    });
    setShiftOffset(0);
    setIsEditorOpen(true);
  };

  const resetEditor = () => {
    setForm(emptyForm);
    setShiftBaseline({
      frets: [...emptyForm.frets],
      barre: { ...emptyForm.barre },
    });
    setShiftOffset(0);
    setIsEditorOpen(false);
  };

  const openEditor = (chord: string, shape: ChordShape, editingId?: string | null) => {
    const nextForm: ShapeForm = {
      chord,
      frets: [...shape.frets],
      fingers: shape.fingers ? [...shape.fingers] : ['', '', '', '', '', ''],
      barre: shape.barres && shape.barres.length
        ? {
            fret: String(shape.barres[0].fret ?? ''),
            from: String((shape.barres[0].fromString ?? 0) + 1),
            to: String((shape.barres[0].toString ?? 0) + 1),
            finger: shape.barres[0].finger !== undefined ? String(shape.barres[0].finger) : '',
          }
        : { fret: '', from: '', to: '', finger: '' },
      label: shape.label ?? '',
      editingId: editingId ?? null,
    };
    startEditSession(nextForm);
  };

  const handleEdit = (chord: string, shape: CustomChordShape) => {
    openEditor(chord, shape, shape.id);
  };

  const handleDuplicate = (chord: string, shape: ChordShape) => {
    openEditor(chord, shape, null);
  };

  const handleEditDefault = (chord: string, index: number, shape: ChordShape, overrideId?: string) => {
    const editingId = overrideId ?? buildDefaultOverrideId(chord, index);
    openEditor(chord, shape, editingId);
  };

  const shiftFrets = (delta: number) => {
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    setForm((prev) => {
      const nextFrets = prev.frets.map((value) => {
        if (value === 'x' || value === '') return value;
        const num = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(num)) return value;
        return clamp(num + delta, 0, 22);
      });

      const fingerSet = prev.barre.finger !== '';
      const barreNum = Number(prev.barre.fret);
      const hasNumericBarre = prev.barre.fret !== '' && Number.isFinite(barreNum);
      let nextBarreFret = prev.barre.fret;
      if (fingerSet) {
        const base = hasNumericBarre ? barreNum : 0;
        const shifted = base + delta;
        nextBarreFret = shifted < 1 ? '' : clamp(shifted, 1, 22).toString();
      }

      return {
        ...prev,
        frets: nextFrets,
        barre: {
          ...prev.barre,
          fret: nextBarreFret,
        },
      };
    });
    setShiftOffset((current) => current + delta);
  };

  const resetShift = () => {
    setForm((prev) => ({
      ...prev,
      frets: [...shiftBaseline.frets],
      barre: { ...shiftBaseline.barre },
    }));
    setShiftOffset(0);
  };

  const handleDelete = (chord: string, id: string) => {
    const next = { ...customShapes };
    next[chord] = (next[chord] ?? []).filter((shape) => shape.id !== id);
    if (!next[chord]?.length) {
      delete next[chord];
    }
    onSave(next);
    const preferred = preferredShapes[chord];
    if (preferred?.type === 'custom' && preferred.id === id) {
      onSetPreferred(chord, null);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const chord = form.chord.trim();
    if (!chord) return;

    if (form.frets.length !== 6) {
      return;
    }

    const frets: (number | 'x')[] = form.frets.map((value) => {
      if (value === 'x') return 'x';
      const num = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(num) ? num : 'x';
    });

    const fingers: (number | null)[] | undefined = form.fingers.some((f) => f !== '' && f !== null)
      ? form.fingers.map((value) => {
          if (value === '' || value === null) return null;
          const num = Number(value);
          return Number.isFinite(num) ? num : null;
        })
      : undefined;

    const hasBarre = form.barre.fret && form.barre.from && form.barre.to;
    const barres =
      hasBarre &&
      Number.isFinite(Number(form.barre.fret)) &&
      Number.isFinite(Number(form.barre.from)) &&
      Number.isFinite(Number(form.barre.to))
        ? [
            {
              fret: Number(form.barre.fret),
              fromString: Math.max(0, Number(form.barre.from) - 1),
              toString: Math.max(0, Number(form.barre.to) - 1),
              finger: form.barre.finger ? Number(form.barre.finger) : undefined,
            },
          ]
        : undefined;

    const targetId = form.editingId ?? makeId();
    const nextShape: CustomChordShape = {
      id: targetId,
      frets,
      fingers,
      barres,
      isOpen: frets.some((f) => f === 0),
      label: form.label.trim() || undefined,
    };

    const next = { ...customShapes };
    const existing = next[chord] ?? [];
    const hasMatch = existing.some((shape) => shape.id === nextShape.id);
    const updated = hasMatch
      ? existing.map((shape) => (shape.id === nextShape.id ? nextShape : shape))
      : [...existing, nextShape];
    next[chord] = updated;
    onSave(next);
    resetEditor();
  };

  const shapesForChord = (chord: string) => {
    const entries = customShapes[chord] ?? [];
    const overrides = new Map<number, CustomChordShape>();
    const custom: CustomChordShape[] = [];
    entries.forEach((shape) => {
      const overrideMeta = parseDefaultOverrideId(shape.id);
      if (overrideMeta && overrideMeta.chord === chord) {
        overrides.set(overrideMeta.index, shape);
      } else {
        custom.push(shape);
      }
    });
    return {
      custom,
      overrides,
      builtIn: builtInShapes[chord] ?? [],
    };
  };

  return (
    <div className="chord-lib__backdrop" role="dialog" aria-modal="true">
      <div className="chord-lib">
        <header className="chord-lib__header">
          <h2>Chord Library</h2>
          <button type="button" className="chord-lib__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="chord-lib__toolbar">
          <div className="chord-lib__filters" aria-label="Filter chords by letter">
            {availableFamilies.map((family) => (
              <button
                type="button"
                key={family}
                className={`chord-lib__filter${activeFamilies.includes(family) ? ' is-active' : ''}`}
                onClick={() => toggleFamily(family)}
                aria-pressed={activeFamilies.includes(family)}
              >
                {family}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="chord-lib__add"
            onClick={() =>
              startEditSession({
                ...emptyForm,
                frets: [...emptyForm.frets],
                fingers: [...emptyForm.fingers],
                barre: { ...emptyForm.barre },
              })
            }
          >
            + Add shape
          </button>
        </div>

        <div className="chord-lib__list">
          {filteredChords.map((chord) => {
            const { custom, builtIn, overrides } = shapesForChord(chord);
            const totalShapes = custom.length + builtIn.length;
            const preferred = preferredShapes[chord];
            const effectivePreferred =
              preferred ??
              (totalShapes > 1
                ? { type: 'built-in', index: 0 }
                : null);
            return (
              <section key={chord} className="chord-lib__section">
                <header className="chord-lib__section-header">
                  <h3>{chord}</h3>
                  {custom.length ? <span className="chord-lib__badge">{custom.length} custom</span> : null}
                </header>
                <div className="chord-lib__cards">
                  {custom.map((shape) => {
                    const isPreferred = effectivePreferred?.type === 'custom' && effectivePreferred.id === shape.id;
                    return (
                      <div key={shape.id} className={clsx('chord-lib__card', 'chord-lib__card--custom', { 'chord-lib__card--preferred': isPreferred })}>
                        <div className="chord-lib__card-actions">
                          <div className="chord-lib__card-menu">
                            <button
                              type="button"
                              className="chord-lib__card-menu-btn"
                              aria-label="Shape actions"
                              aria-expanded={openMenuId === `custom-${shape.id}`}
                              onClick={() => setOpenMenuId((prev) => (prev === `custom-${shape.id}` ? null : `custom-${shape.id}`))}
                            >
                              ⋯
                            </button>
                            {openMenuId === `custom-${shape.id}` ? (
                              <div className="chord-lib__card-menu-panel" role="menu">
                                {!isPreferred ? (
                                  <button type="button" onClick={() => { handleSetDefaultCustom(chord, shape.id); setOpenMenuId(null); }}>
                                    Set as default
                                  </button>
                                ) : (
                                  <button type="button" disabled>
                                    Default shape
                                  </button>
                                )}
                                <button type="button" onClick={() => { handleDuplicate(chord, shape); setOpenMenuId(null); }}>
                                  Duplicate
                                </button>
                                <button type="button" onClick={() => { handleEdit(chord, shape); setOpenMenuId(null); }}>
                                  Edit
                                </button>
                                <button type="button" className="chord-lib__card-menu-item--danger" onClick={() => { handleDelete(chord, shape.id); setOpenMenuId(null); }}>
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {isPreferred ? <span className="chord-lib__flag">Default</span> : null}
                        <div className="chord-lib__diagram">
                          <ChordDiagram chord={chord} shape={shape} />
                        </div>
                        {shape.label ? <p className="chord-lib__label">{shape.label}</p> : null}
                      </div>
                    );
                  })}
                  {builtIn.map((shape, index) => {
                    const overrideShape = overrides.get(index);
                    const displayShape = overrideShape ?? shape;
                    const overrideId = overrideShape?.id;
                    const isPreferred = effectivePreferred?.type === 'built-in' && effectivePreferred.index === index;
                    return (
                      <div key={`built-${index}`} className={clsx('chord-lib__card', 'chord-lib__card--built', { 'chord-lib__card--preferred': isPreferred })}>
                        <div className="chord-lib__card-actions">
                          <div className="chord-lib__card-menu">
                            <button
                              type="button"
                              className="chord-lib__card-menu-btn"
                              aria-label="Default shape actions"
                              aria-expanded={openMenuId === `default-${chord}-${index}`}
                              onClick={() => setOpenMenuId((prev) => (prev === `default-${chord}-${index}` ? null : `default-${chord}-${index}`))}
                            >
                              ⋯
                            </button>
                            {openMenuId === `default-${chord}-${index}` ? (
                              <div className="chord-lib__card-menu-panel" role="menu">
                                {!isPreferred ? (
                                  <button type="button" onClick={() => { handleSetDefaultBuiltIn(chord, index); setOpenMenuId(null); }}>
                                    Set as default
                                  </button>
                                ) : (
                                  <button type="button" disabled>
                                    Default shape
                                  </button>
                                )}
                                <button type="button" onClick={() => { handleDuplicate(chord, displayShape); setOpenMenuId(null); }}>
                                  Duplicate
                                </button>
                                <button type="button" onClick={() => { handleEditDefault(chord, index, displayShape, overrideId); setOpenMenuId(null); }}>
                                  Edit
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {isPreferred ? <span className="chord-lib__flag">Default</span> : null}
                        <div className="chord-lib__diagram">
                          <ChordDiagram chord={chord} shape={displayShape} />
                        </div>
                        {displayShape.label ? <p className="chord-lib__label">{displayShape.label}</p> : <p className="chord-lib__label">Default</p>}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {!chords.length ? <p className="chord-lib__hint">No chords yet. Add your first shape above.</p> : null}
          {chords.length > 0 && filteredChords.length === 0 ? <p className="chord-lib__hint">No chords match the selected filters.</p> : null}
        </div>
        {isEditorOpen && (
          <div className="chord-lib__editor-backdrop chord-lib__editor-backdrop--modal" role="dialog" aria-modal="true">
            <form className="chord-lib__form chord-lib__form--floating" onSubmit={handleSubmit}>
              <header className="chord-lib__form-header">
                <h3>{form.editingId ? 'Edit shape' : 'Add shape'}</h3>
                <button type="button" aria-label="Close editor" onClick={resetEditor}>
                  ×
                </button>
              </header>
              <div className="chord-lib__editor-scroll">
                <div className="chord-lib__editor-grid">
                  <section className="chord-lib__form-section chord-lib__form-section--info chord-lib__form-section--panel">
                    <h4>Info</h4>
                    <div className="chord-lib__row chord-lib__row--compact">
                      <label>
                        Chord
                        <input value={form.chord} onChange={(e) => setForm((prev) => ({ ...prev, chord: e.target.value }))} required />
                      </label>
                      <label>
                        Label (optional)
                        <input value={form.label} onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))} />
                      </label>
                    </div>
                    <div className="chord-lib__shift-control">
                      <p className="chord-lib__shift-label">Shift frets</p>
                      {(() => {
                        const disableShiftDown = form.barre.finger !== '' && (form.barre.fret === '' || form.barre.fret === '-');
                        return (
                      <div className="chord-lib__shift" aria-label="Shift all frets">
                        <button
                          type="button"
                          className="chord-lib__shift-btn chord-lib__shift-btn--small"
                          onClick={() => shiftFrets(-1)}
                          aria-label="Move shape toward nut"
                          disabled={disableShiftDown}
                        >
                          A
                        </button>
                        <button type="button" className="chord-lib__shift-value" onClick={resetShift} aria-label="Reset frets to session start">
                          RESET ({shiftOffset > 0 ? `+${shiftOffset}` : shiftOffset})
                        </button>
                        <button
                          type="button"
                          className="chord-lib__shift-btn chord-lib__shift-btn--large"
                          onClick={() => shiftFrets(1)}
                          aria-label="Move shape toward bridge"
                        >
                          A
                        </button>
                      </div>
                        );
                      })()}
                    </div>
                  </section>
                  <section className="chord-lib__form-section chord-lib__form-section--barre chord-lib__form-section--panel">
                    <h4>Barre</h4>
                    <div className="chord-lib__barre-grid">
                      <div className="chord-lib__barre-pair">
                        <label>
                          Fret
                          <select value={form.barre.fret} onChange={(e) => setForm((prev) => ({ ...prev, barre: { ...prev.barre, fret: e.target.value } }))}>
                            <option value="">–</option>
                            {Array.from({ length: 22 }).map((_, fretIndex) => (
                              <option key={fretIndex + 1} value={(fretIndex + 1).toString()}>
                                {fretIndex + 1}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Finger
                          <select value={form.barre.finger} onChange={(e) => setForm((prev) => ({ ...prev, barre: { ...prev.barre, finger: e.target.value } }))}>
                            <option value="">–</option>
                            {[1, 2, 3, 4].map((finger) => (
                              <option key={finger} value={finger}>
                                {finger}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="chord-lib__barre-pair">
                        <label>
                          From
                          <select value={form.barre.from} onChange={(e) => setForm((prev) => ({ ...prev, barre: { ...prev.barre, from: e.target.value } }))}>
                            <option value="">–</option>
                            {[1, 2, 3, 4, 5, 6].map((stringNumber) => (
                              <option key={stringNumber} value={stringNumber}>
                                {stringNumber}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          To
                          <select value={form.barre.to} onChange={(e) => setForm((prev) => ({ ...prev, barre: { ...prev.barre, to: e.target.value } }))}>
                            <option value="">–</option>
                            {[1, 2, 3, 4, 5, 6].map((stringNumber) => (
                              <option key={stringNumber} value={stringNumber}>
                                {stringNumber}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  </section>
                <section className="chord-lib__form-section chord-lib__form-section--strings chord-lib__form-section--panel">
                  <h4>Strings</h4>
                  <div className="chord-lib__strings">
                    {form.frets.map((value, index) => (
                      <div key={index} className="chord-lib__string-group">
                        <p className="chord-lib__string-label">String {index + 1} ({['E', 'A', 'D', 'G', 'B', 'E'][index]})</p>
                        <div className="chord-lib__string-grid">
                          <label>
                            Fret
                            <select
                              value={value.toString()}
                              onChange={(e) =>
                                setForm((prev) => {
                                  const nextFrets = [...prev.frets];
                                  nextFrets[index] = e.target.value === 'x' ? 'x' : Number(e.target.value);
                                  return { ...prev, frets: nextFrets };
                                })
                              }
                            >
                              <option value="x">X</option>
                              <option value="0">0</option>
                              {Array.from({ length: 22 }).map((_, fretIndex) => (
                                <option key={fretIndex + 1} value={(fretIndex + 1).toString()}>
                                  {fretIndex + 1}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Finger
                            <select
                              value={form.fingers[index] ? form.fingers[index]?.toString() ?? '' : ''}
                              disabled={value === 'x' || value === 0}
                              onChange={(e) =>
                                setForm((prev) => {
                                  const nextFingers = [...prev.fingers];
                                  nextFingers[index] = e.target.value === '' ? '' : Number(e.target.value);
                                  return { ...prev, fingers: nextFingers };
                                })
                              }
                            >
                              <option value="">{value === 'x' || value === 0 ? '(n/a)' : '–'}</option>
                              {[1, 2, 3, 4].map((finger) => (
                                <option key={finger} value={finger}>
                                  {finger}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                  <section className="chord-lib__form-section chord-lib__form-section--preview chord-lib__form-section--panel">
                    <h4>Preview</h4>
                    <div className="chord-lib__diagram">
                      <ChordDiagram chord={form.chord || 'Chord'} shape={previewShape} />
                    </div>
                  </section>
                </div>
              </div>
              <div className="chord-lib__actions">
                <button type="submit" className="chord-lib__save">
                  {form.editingId ? 'Update shape' : 'Add shape'}
                </button>
                <button type="button" className="chord-lib__secondary" onClick={resetEditor}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChordLibraryModal;
