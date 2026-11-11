import { MessageSquareText, Wrench } from 'lucide-react';
import { useId } from 'react';
import { findMaintenanceStaff, propertyName } from '../../domain/catalog';
import { MAINTENANCE_STATUS, MAINTENANCE_STATUS_ORDER } from '../../domain/labels';
import type { Catalog, MaintenanceStatus, MaintenanceTask } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { CONTROL_CLASS } from '../ui/Field';
import { Panel } from '../ui/Panel';
import { RelativeTime } from '../ui/RelativeTime';

const rank = (task: MaintenanceTask) => MAINTENANCE_STATUS_ORDER.indexOf(task.status);

function isMaintenanceStatus(value: string): value is MaintenanceStatus {
  return MAINTENANCE_STATUS_ORDER.some((status) => status === value);
}

interface TaskRowProps {
  task: MaintenanceTask;
  catalog: Catalog;
  onStatusChange: (taskId: string, status: MaintenanceStatus) => void;
  onViewMessage: (messageId: string) => void;
}

function TaskRow({ task, catalog, onStatusChange, onViewMessage }: TaskRowProps) {
  const selectId = useId();
  const assignee = findMaintenanceStaff(catalog, task.assigneeId);

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink">{task.description}</p>
        <Badge tone={MAINTENANCE_STATUS[task.status].tone}>
          {MAINTENANCE_STATUS[task.status].label}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        {propertyName(catalog, task.propertyId)} · <RelativeTime date={task.createdAt} />
      </p>
      <p className="text-xs text-ink-muted">
        {assignee ? `Assigned to ${assignee.name}` : 'Not assigned yet'}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          Status of repair: {task.description}
        </label>
        <select
          id={selectId}
          value={task.status}
          onChange={(event) => {
            if (isMaintenanceStatus(event.target.value)) {
              onStatusChange(task.id, event.target.value);
            }
          }}
          className={`${CONTROL_CLASS} w-auto min-w-32 flex-1 py-1.5`}
        >
          {MAINTENANCE_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {MAINTENANCE_STATUS[status].label}
            </option>
          ))}
        </select>
        <Button size="sm" variant="quiet" onClick={() => onViewMessage(task.sourceMessageId)}>
          <MessageSquareText aria-hidden className="size-3.5" />
          View guest message
        </Button>
      </div>
    </li>
  );
}

interface MaintenancePanelProps {
  tasks: readonly MaintenanceTask[];
  catalog: Catalog;
  onStatusChange: (taskId: string, status: MaintenanceStatus) => void;
  onViewMessage: (messageId: string) => void;
}

/** Repairs raised from guest messages: open work first, newest first within each status. */
export function MaintenancePanel({
  tasks,
  catalog,
  onStatusChange,
  onViewMessage,
}: MaintenancePanelProps) {
  const sorted = tasks.toSorted(
    (a, b) => rank(a) - rank(b) || b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const open = tasks.filter((task) => task.status !== 'completed').length;

  return (
    <Panel
      title="Maintenance tasks"
      icon={Wrench}
      aside={open > 0 ? <Badge tone="warning">{open} open</Badge> : null}
    >
      {sorted.length === 0 ? (
        <EmptyState>No repairs reported.</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {sorted.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              catalog={catalog}
              onStatusChange={onStatusChange}
              onViewMessage={onViewMessage}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
