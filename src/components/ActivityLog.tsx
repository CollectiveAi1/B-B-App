import { format } from 'date-fns';
import { ScrollText } from 'lucide-react';
import type { LogEntry } from '../types';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { Panel } from './ui/Panel';

/** Everything the dashboard has done this session, newest first. */
export function ActivityLog({ entries }: { entries: readonly LogEntry[] }) {
  return (
    <Panel
      title="Activity log"
      icon={ScrollText}
      flush
      aside={
        entries.length > 0 ? (
          <span className="text-xs text-ink-muted tabular-nums">{entries.length} events</span>
        ) : null
      }
    >
      {entries.length === 0 ? (
        <EmptyState>No activity yet.</EmptyState>
      ) : (
        // Focusable so keyboard users can scroll the log.
        <div
          role="region"
          aria-label="Activity log entries"
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="max-h-96 overflow-y-auto rounded-b-lg"
        >
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-well text-xs text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Time
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Event
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Outcome
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-2.5 align-top font-mono text-xs whitespace-nowrap text-ink-muted tabular-nums">
                    <time
                      dateTime={entry.timestamp.toISOString()}
                      title={format(entry.timestamp, 'PPpp')}
                    >
                      {format(entry.timestamp, 'HH:mm:ss')}
                    </time>
                  </td>
                  <td className="px-4 py-2.5 align-top text-ink">{entry.event}</td>
                  <td className="px-4 py-2.5 align-top">
                    <Badge tone={entry.tone} className="whitespace-normal">
                      {entry.outcome}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
