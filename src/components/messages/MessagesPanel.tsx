import { MessagesSquare, X } from 'lucide-react';
import { useEffect } from 'react';
import { findMaintenanceStaff, propertyName } from '../../domain/catalog';
import { STAT_FILTER_LABEL } from '../../domain/labels';
import { messageElementId } from '../../domain/sections';
import type { DashboardState } from '../../state/dashboardState';
import type { Message, StatFilter } from '../../types';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Panel } from '../ui/Panel';
import { AutomatedMessageCard, GuestMessageCard } from './MessageCard';

/** How long a message stays highlighted after "View guest message" jumps to it. */
const HIGHLIGHT_MS = 3_000;

interface MessagesPanelProps {
  messages: readonly Message[];
  state: DashboardState;
  filter: StatFilter | null;
  /** The message "View guest message" asked for. A new object each time it is asked. */
  highlight: { messageId: string } | null;
  onClearFilter: () => void;
  onHighlightDone: () => void;
  onRetry: (messageId: string) => void;
}

export function MessagesPanel({
  messages,
  state,
  filter,
  highlight,
  onClearFilter,
  onHighlightDone,
  onRetry,
}: MessagesPanelProps) {
  useEffect(() => {
    if (!highlight) return;

    const element = document.getElementById(messageElementId(highlight.messageId));
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    element?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    element?.focus({ preventScroll: true });

    const timer = window.setTimeout(onHighlightDone, HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlight, onHighlightDone]);

  const bookingProperty = (bookingId: string | null) => {
    const booking = state.bookings.find((candidate) => candidate.id === bookingId);
    return booking ? propertyName(state.catalog, booking.propertyId) : null;
  };

  const repairAssignee = (taskId: string) => {
    const task = state.maintenanceTasks.find((candidate) => candidate.id === taskId);
    return findMaintenanceStaff(state.catalog, task?.assigneeId ?? null)?.name ?? null;
  };

  const filterChip = filter ? (
    <Button
      size="sm"
      onClick={onClearFilter}
      aria-label={`Clear filter: ${STAT_FILTER_LABEL[filter]}`}
    >
      {STAT_FILTER_LABEL[filter]}
      <X aria-hidden className="size-3.5" />
    </Button>
  ) : null;

  return (
    <Panel title="Guest messages" icon={MessagesSquare} aside={filterChip}>
      {messages.length === 0 ? (
        <EmptyState
          action={filter ? <Button onClick={onClearFilter}>Show all messages</Button> : undefined}
        >
          {filter ? 'No messages match this filter.' : 'No messages yet.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li key={message.id}>
              {message.kind === 'automated' ? (
                <AutomatedMessageCard message={message} />
              ) : (
                <GuestMessageCard
                  message={message}
                  propertyName={bookingProperty(message.bookingId)}
                  repairAssignee={
                    message.resolution?.kind === 'maintenance'
                      ? repairAssignee(message.resolution.taskId)
                      : null
                  }
                  highlighted={message.id === highlight?.messageId}
                  onRetry={onRetry}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
