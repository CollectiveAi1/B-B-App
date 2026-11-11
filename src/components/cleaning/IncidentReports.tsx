import { Siren } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { findCleaningStaff, propertyName } from '../../domain/catalog';
import type { Catalog, IncidentReport } from '../../types';
import { Button } from '../ui/Button';
import { CONTROL_CLASS, Field } from '../ui/Field';
import { Panel } from '../ui/Panel';
import { RelativeTime } from '../ui/RelativeTime';

interface IncidentReportsProps {
  catalog: Catalog;
  incidents: readonly IncidentReport[];
  onReport: (report: { staffId: string; propertyId: string; description: string }) => void;
}

export function IncidentReports({ catalog, incidents, onReport }: IncidentReportsProps) {
  const [staffId, setStaffId] = useState(catalog.cleaningStaff[0]?.id ?? '');
  const [propertyId, setPropertyId] = useState(catalog.properties[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const descriptionField = useRef<HTMLTextAreaElement>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!description.trim()) {
      setError('Describe what happened.');
      descriptionField.current?.focus();
      return;
    }
    onReport({ staffId, propertyId, description });
    setDescription('');
    setError(null);
  };

  return (
    <Panel title="Report an incident" icon={Siren}>
      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <Field label="Reported by">
          {(control) => (
            <select
              {...control}
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
              className={CONTROL_CLASS}
            >
              {catalog.cleaningStaff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Property">
          {(control) => (
            <select
              {...control}
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              className={CONTROL_CLASS}
            >
              {catalog.properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="What happened" required error={error}>
          {(control) => (
            <textarea
              {...control}
              ref={descriptionField}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                if (error) setError(null);
              }}
              rows={3}
              maxLength={1000}
              className={CONTROL_CLASS}
            />
          )}
        </Field>
        <Button type="submit" className="w-full">
          Submit report
        </Button>
      </form>

      <h3 className="mt-5 text-xs font-semibold text-ink-muted">Recent incidents</h3>
      {incidents.length === 0 ? (
        <p className="mt-1 text-sm text-ink-muted">None reported.</p>
      ) : (
        <ul className="mt-1 max-h-56 space-y-2 overflow-y-auto">
          {incidents.map((incident) => (
            <li key={incident.id} className="rounded-sm bg-well p-2.5">
              <p className="text-sm whitespace-pre-line text-ink">{incident.description}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {propertyName(catalog, incident.propertyId)} ·{' '}
                {findCleaningStaff(catalog, incident.staffId)?.name ?? 'Unknown'} ·{' '}
                <RelativeTime date={incident.timestamp} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
