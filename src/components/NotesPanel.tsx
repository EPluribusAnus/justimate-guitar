import type { ChangeEvent } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface Props {
  songId: string;
  currentKey: string;
}

const NotesPanel = ({ songId, currentKey }: Props) => {
  const [notesByKey, setNotesByKey] = useLocalStorage<Record<string, string>>(
    `jg/notes/${songId}`,
    {},
  );

  const value = notesByKey[currentKey] ?? '';

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = { ...notesByKey, [currentKey]: event.target.value };
    setNotesByKey(next);
  };

  return (
    <section className="notes-panel">
      <div className="notes-panel__header">
        <h3>Notes for {currentKey}</h3>
        <span className="notes-panel__hint">Saved locally</span>
      </div>
      <textarea
        value={value}
        placeholder="Add reminders, fingerings, or lyrics tweaks..."
        onChange={handleChange}
        rows={6}
      />
    </section>
  );
};

export default NotesPanel;
