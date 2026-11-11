import { format } from 'date-fns';
import { NotebookPen } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { CrewNote } from '../../types';
import { Button } from '../ui/Button';
import { CONTROL_CLASS, Field } from '../ui/Field';
import { Panel } from '../ui/Panel';

interface CrewNotesProps {
  notes: readonly CrewNote[];
  onAdd: (text: string) => void;
}

export function CrewNotes({ notes, onAdd }: CrewNotesProps) {
  const [draft, setDraft] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft('');
  };

  return (
    <Panel title="Notes for crew" icon={NotebookPen}>
      <form onSubmit={onSubmit} className="space-y-2">
        <Field label="New note">
          {(control) => (
            <textarea
              {...control}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="For example: extra towels for the Penthouse"
              className={CONTROL_CLASS}
            />
          )}
        </Field>
        <Button type="submit" className="w-full" disabled={!draft.trim()}>
          Add note
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">No notes yet.</p>
      ) : (
        <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto">
          {notes.map((note) => (
            <li key={note.id} className="rounded-sm bg-well p-2.5">
              <p className="text-sm whitespace-pre-line text-ink">{note.text}</p>
              <p className="mt-1 text-xs text-ink-muted">
                <time dateTime={note.timestamp.toISOString()}>
                  {format(note.timestamp, 'MMM d, p')}
                </time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
