import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import type { AssistantMode } from '../services/assistantClient';
import type { InboxCheck } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { cx } from './ui/cx';

interface AppHeaderProps {
  assistantMode: AssistantMode | 'checking';
  isCheckingInbox: boolean;
  lastInboxCheck: InboxCheck | null;
  onCheckInbox: () => void;
}

const MODE_BADGE: Readonly<
  Record<AppHeaderProps['assistantMode'], { label: string; title: string }>
> = {
  checking: { label: 'Connecting', title: 'Checking whether a model is configured.' },
  live: { label: 'Live model', title: 'Replies are written by the configured Gemini model.' },
  demo: {
    label: 'Demo responder',
    title:
      'No model key is configured on the server, so replies come from built-in rules. See the README to connect Gemini.',
  },
};

function describeLastCheck(check: InboxCheck | null): string {
  if (!check) return 'Inbox not checked yet.';
  const time = format(check.timestamp, 'p');
  return check.delivered > 0
    ? `Checked at ${time}: new message received.`
    : `Checked at ${time}: no new messages.`;
}

export function AppHeader({
  assistantMode,
  isCheckingInbox,
  lastInboxCheck,
  onCheckInbox,
}: AppHeaderProps) {
  const mode = MODE_BADGE[assistantMode];

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Reservation Assistant
          </h1>
          <Badge tone={assistantMode === 'live' ? 'success' : 'neutral'}>
            <span title={mode.title}>{mode.label}</span>
          </Badge>
        </div>
        <p className="mt-1 hidden text-sm text-ink-muted sm:block">
          Guest replies, cleaning turnovers, and repairs in one view.
        </p>
      </div>

      <div className="flex flex-col gap-1.5 sm:items-end">
        <Button variant="primary" onClick={onCheckInbox} disabled={isCheckingInbox}>
          <RefreshCw aria-hidden className={cx('size-4', isCheckingInbox && 'animate-spin')} />
          {isCheckingInbox ? 'Checking…' : 'Check for new messages'}
        </Button>
        {/* Announced politely, so a screen-reader user hears the result of a check. */}
        <p role="status" className="text-xs text-ink-muted">
          {describeLastCheck(lastInboxCheck)}
        </p>
      </div>
    </header>
  );
}
