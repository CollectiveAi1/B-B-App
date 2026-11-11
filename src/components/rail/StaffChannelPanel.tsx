import { Hash } from 'lucide-react';
import { STAFF_CHANNEL } from '../../state/dashboardState';
import type { StaffNotification, StaffNotificationKind, Tone } from '../../types';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Panel } from '../ui/Panel';
import { RelativeTime } from '../ui/RelativeTime';

const KIND: Readonly<Record<StaffNotificationKind, { label: string; tone: Tone }>> = {
  maintenance: { label: 'Repair', tone: 'warning' },
  escalation: { label: 'Escalation', tone: 'danger' },
  incident: { label: 'Incident', tone: 'info' },
};

/**
 * What the dashboard would post to the team's chat channel. Nothing is sent
 * anywhere, and the panel says so.
 */
export function StaffChannelPanel({
  notifications,
}: {
  notifications: readonly StaffNotification[];
}) {
  return (
    <Panel title="Staff channel" icon={Hash} aside={<Badge>Simulated</Badge>}>
      <p className="mb-3 font-mono text-xs text-ink-muted">{STAFF_CHANNEL}</p>
      {notifications.length === 0 ? (
        <EmptyState>Nothing posted yet.</EmptyState>
      ) : (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
          {notifications.map((notification) => (
            <li key={notification.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <Badge tone={KIND[notification.kind].tone}>{KIND[notification.kind].label}</Badge>
                <p className="text-xs text-ink-muted">
                  <RelativeTime date={notification.timestamp} />
                </p>
              </div>
              <p className="mt-1.5 text-sm text-ink">{notification.text}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
