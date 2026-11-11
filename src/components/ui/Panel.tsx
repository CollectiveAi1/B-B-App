import type { LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cx } from './cx';

interface PanelProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  /** Shown at the right of the header: a count, a label, or one small action. */
  aside?: ReactNode;
  /** Padding is on by default. Turn it off for content that runs edge to edge, such as tables. */
  flush?: boolean;
  className?: string;
}

/** A titled region of the dashboard. Each one is a landmark named by its heading. */
export function Panel({
  title,
  icon: Icon,
  children,
  aside,
  flush = false,
  className,
}: PanelProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cx('rounded-lg border border-line bg-surface', className)}
    >
      <header className="flex min-h-13 items-center gap-3 border-b border-line px-4 py-2.5">
        <Icon aria-hidden className="size-5 shrink-0 text-ink-muted" />
        <h2 id={headingId} className="font-display text-base font-semibold text-ink">
          {title}
        </h2>
        {aside ? <div className="ml-auto flex items-center gap-2">{aside}</div> : null}
      </header>
      <div className={flush ? undefined : 'p-4'}>{children}</div>
    </section>
  );
}
