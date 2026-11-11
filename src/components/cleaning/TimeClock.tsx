import { Clock } from 'lucide-react';
import { useState } from 'react';
import type { CleaningStaff } from '../../types';
import { Button } from '../ui/Button';
import { CONTROL_CLASS, Field } from '../ui/Field';
import { Panel } from '../ui/Panel';
import { RelativeTime } from '../ui/RelativeTime';

interface TimeClockProps {
  staff: readonly CleaningStaff[];
  /** Staff id to clock-in time, for everyone on shift. */
  clockedIn: Readonly<Record<string, Date>>;
  onToggle: (staffId: string) => void;
}

export function TimeClock({ staff, clockedIn, onToggle }: TimeClockProps) {
  const [selectedId, setSelectedId] = useState(staff[0]?.id ?? '');
  const onShift = staff.filter((member) => clockedIn[member.id]);
  const selectedIsOnShift = Boolean(clockedIn[selectedId]);

  return (
    <Panel title="Time clock" icon={Clock}>
      <div className="space-y-3">
        <Field label="Staff member">
          {(control) => (
            <select
              {...control}
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className={CONTROL_CLASS}
            >
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Button className="w-full" disabled={!selectedId} onClick={() => onToggle(selectedId)}>
          {selectedIsOnShift ? 'Clock out' : 'Clock in'}
        </Button>
      </div>

      <h3 className="mt-4 text-xs font-semibold text-ink-muted">On shift</h3>
      {onShift.length === 0 ? (
        <p className="mt-1 text-sm text-ink-muted">Nobody is clocked in.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {onShift.map((member) => {
            const since = clockedIn[member.id];
            return (
              <li key={member.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink">{member.name}</span>
                <span className="text-xs text-ink-muted">
                  {since ? <RelativeTime date={since} /> : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
