import { transposeChord } from '../utils/chords';

interface Props {
  defaultKey: string;
  steps: number;
  onChange: (value: number) => void;
}

const MIN_STEP = -11;
const MAX_STEP = 11;
const clamp = (value: number) => Math.max(MIN_STEP, Math.min(MAX_STEP, value));

const TransposerControls = ({ defaultKey, steps, onChange }: Props) => {
  const currentKey = transposeChord(defaultKey, steps);
  const stepLabel = steps === 0 ? '0' : steps > 0 ? `+${steps}` : String(steps);

  return (
    <section className="transposer" aria-label="Transpose controls">
      <div className="transposer__control">
        <button type="button" onClick={() => onChange(clamp(steps - 1))} disabled={steps <= MIN_STEP} aria-label="Lower key">
          –
        </button>
        <button
          type="button"
          className="transposer__display"
          onClick={() => onChange(0)}
          aria-label="Reset to default key"
        >
          <span className="transposer__display-step">{stepLabel}</span>
          <span className="transposer__display-key">{currentKey}</span>
        </button>
        <button type="button" onClick={() => onChange(clamp(steps + 1))} disabled={steps >= MAX_STEP} aria-label="Raise key">
          +
        </button>
      </div>
    </section>
  );
};

export default TransposerControls;
