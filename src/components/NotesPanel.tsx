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
      <textarea
        value={note}
        placeholder="Add reminders, fingerings, or lyrics tweaks..."
        onChange={handleChange}
        rows={6}
        aria-label={`Notes for ${songId} (current key ${currentKey || 'n/a'})`}
      />
    </section>
  );
};

export default NotesPanel;
