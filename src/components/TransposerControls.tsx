import { transposeChord } from '../utils/chords';

interface Props {
  defaultKey: string;
  steps: number;
  onChange: (value: number) => void;
}

const MIN_STEP = -11;
const MAX_STEP = 11;
const STEP_OPTIONS = Array.from({ length: MAX_STEP - MIN_STEP + 1 }, (_, index) => MIN_STEP + index);

const clamp = (value: number) => Math.max(MIN_STEP, Math.min(MAX_STEP, value));

const TransposerControls = ({ defaultKey, steps, onChange }: Props) => {
  return (
    <section className="transposer" aria-label="Transpose controls">
      <div className="transposer__summary">
        <h3>Key</h3>
        <span className="transposer__current-label">{transposeChord(defaultKey, steps)}</span>
      </div>
      <div className="transposer__actions">
        <button type="button" onClick={() => onChange(clamp(steps - 1))} disabled={steps <= MIN_STEP}>
          -
        </button>
        <select
          value={steps}
          onChange={(event) => onChange(clamp(Number(event.target.value)))}
          aria-label="Choose transposition"
        >
          {STEP_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option > 0 ? `+${option}` : option}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onChange(clamp(steps + 1))} disabled={steps >= MAX_STEP}>
          +
        </button>
      </div>
    </section>
  );
};

export default TransposerControls;
