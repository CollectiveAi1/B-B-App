import {
  Bot,
  CircleCheck,
  CircleExclamationPoint,
  CircleX,
  ExternalLink,
  LoaderCircle,
  RotateCcw,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { AUTOMATED_MESSAGE_LABEL } from '../../domain/automatedMessages';
import { MESSAGE_STATUS } from '../../domain/labels';
import { messageElementId } from '../../domain/sections';
import type { AutomatedMessage, GuestMessage, Tone } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { RelativeTime } from '../ui/RelativeTime';

const TONE_TEXT: Readonly<Record<Tone, string>> = {
  neutral: 'text-ink-muted',
  info: 'text-info-ink',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
};

function Outcome({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 border-t border-line pt-3">
      <h4 className={cx('flex items-center gap-2 text-sm font-semibold', TONE_TEXT[tone])}>
        <Icon aria-hidden className="size-4 shrink-0" />
        {title}
      </h4>
      <div className="mt-1.5 text-sm text-ink">{children}</div>
    </div>
  );
}

interface GuestMessageCardProps {
  message: GuestMessage;
  /** Property name for the guest's booking, or null for an enquiry with no booking. */
  propertyName: string | null;
  /** Who the repair went to, when this message created one. */
  repairAssignee: string | null;
  highlighted: boolean;
  onRetry: (messageId: string) => void;
}

export function GuestMessageCard({
  message,
  propertyName,
  repairAssignee,
  highlighted,
  onRetry,
}: GuestMessageCardProps) {
  const status = MESSAGE_STATUS[message.status];
  const headingId = `${messageElementId(message.id)}-guest`;
  const { resolution } = message;

  return (
    <article
      id={messageElementId(message.id)}
      aria-labelledby={headingId}
      // Focusable from script only: "View guest message" moves focus here.
      tabIndex={-1}
      className={cx(
        'rounded-md border p-4 transition-colors duration-300',
        highlighted ? 'border-accent-edge bg-accent/15' : 'border-line bg-well',
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="font-semibold text-ink">
            {message.guestName}
          </h3>
          <p className="text-xs text-ink-muted">
            {message.platform} · {propertyName ?? 'No booking on file'} ·{' '}
            <RelativeTime date={message.timestamp} />
          </p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </header>

      <p className="mt-3 text-sm whitespace-pre-line text-ink">{message.body}</p>

      {message.status === 'processing' ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-sm text-ink-muted"
        >
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          Writing a reply…
        </p>
      ) : null}

      {message.status === 'failed' ? (
        <Outcome icon={CircleX} tone="danger" title="Reply failed">
          <p>{message.failure ?? 'The assistant could not process this message.'}</p>
          <Button size="sm" className="mt-2" onClick={() => onRetry(message.id)}>
            <RotateCcw aria-hidden className="size-3.5" />
            Try again
          </Button>
        </Outcome>
      ) : null}

      {resolution?.kind === 'reply' ? (
        <Outcome icon={CircleCheck} tone="success" title="Assistant reply">
          <p className="whitespace-pre-line">{resolution.text}</p>
          {resolution.sources.length > 0 ? (
            <div className="mt-3">
              <h5 className="text-xs font-semibold text-ink-muted">Sources</h5>
              <ul className="mt-1 space-y-1">
                {resolution.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 text-xs text-info-ink underline underline-offset-2"
                    >
                      <ExternalLink aria-hidden className="size-3 shrink-0" />
                      <span className="truncate">{source.title}</span>
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Outcome>
      ) : null}

      {resolution?.kind === 'maintenance' ? (
        <Outcome icon={Wrench} tone="warning" title="Repair task created">
          <p>{resolution.task}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {repairAssignee ? `Assigned to ${repairAssignee}` : 'Not assigned yet'}
          </p>
        </Outcome>
      ) : null}

      {resolution?.kind === 'escalation' ? (
        <Outcome icon={CircleExclamationPoint} tone="warning" title="Escalated to staff">
          <p>{resolution.reason}</p>
        </Outcome>
      ) : null}
    </article>
  );
}

export function AutomatedMessageCard({ message }: { message: AutomatedMessage }) {
  const headingId = `${messageElementId(message.id)}-title`;

  return (
    <article
      id={messageElementId(message.id)}
      aria-labelledby={headingId}
      className="rounded-md border border-line bg-surface p-4"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Bot aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
          <div className="min-w-0">
            <h3 id={headingId} className="font-semibold text-ink">
              {AUTOMATED_MESSAGE_LABEL[message.trigger]} message to {message.guestName}
            </h3>
            <p className="text-xs text-ink-muted">
              Sent <RelativeTime date={message.timestamp} />
            </p>
          </div>
        </div>
        <Badge>Automated</Badge>
      </header>
      <p className="mt-3 text-sm whitespace-pre-line text-ink">{message.body}</p>
    </article>
  );
}
