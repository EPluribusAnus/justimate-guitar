import type { ChangeEvent } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface Props {
  songId: string;
  currentKey: string;
}

const NotesPanel = ({ songId, currentKey }: Props) => {
  const [note, setNote] = useLocalStorage<string>(`jg/notes/${songId}`, '');

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setNote(event.target.value);
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
      />
    </section>
  );
};

export default NotesPanel;
