import type { ChangeEvent } from 'react';

interface Props {
  songId: string;
  currentKey: string;
  note: string;
  onChange: (value: string) => void;
}

const NotesPanel = ({ songId, currentKey, note, onChange }: Props) => {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <section className="notes-panel">
      <div className="notes-panel__header">
        <h3>Notes</h3>
        <span className="notes-panel__hint">Saved per song (current key: {currentKey || 'n/a'})</span>
      </div>
      <textarea
        value={note}
        placeholder="Add reminders, fingerings, or lyrics tweaks..."
        onChange={handleChange}
        rows={6}
        aria-label={`Notes for ${songId}`}
      />
    </section>
  );
};

export default NotesPanel;
