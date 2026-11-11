import { ChevronDown, Mail } from 'lucide-react';
import type { ManagementAlert } from '../../types';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Panel } from '../ui/Panel';
import { RelativeTime } from '../ui/RelativeTime';

/**
 * Emails the dashboard would send to management. Each one opens to show the
 * full body. Nothing is sent anywhere, and the panel says so.
 */
export function AlertsPanel({ alerts }: { alerts: readonly ManagementAlert[] }) {
  return (
    <Panel title="Management alerts" icon={Mail} aside={<Badge>Simulated</Badge>}>
      {alerts.length === 0 ? (
        <EmptyState>No alerts.</EmptyState>
      ) : (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
          {alerts.map((alert) => (
            <li key={alert.id} className="py-2 first:pt-0 last:pb-0">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start gap-2 rounded-sm py-1 [&::-webkit-details-marker]:hidden">
                  <ChevronDown
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{alert.subject}</span>
                    <span className="block text-xs text-ink-muted">
                      <RelativeTime date={alert.timestamp} />
                    </span>
                  </span>
                </summary>
                <div className="mt-2 ml-6 rounded-sm bg-well p-3">
                  <p className="text-xs text-ink-muted">To: {alert.recipient}</p>
                  <p className="mt-2 text-sm whitespace-pre-line text-ink">{alert.body}</p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
