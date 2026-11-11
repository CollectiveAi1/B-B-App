import type { ReactNode } from 'react';
import type { Tone } from '../../types';
import { cx } from './cx';

const TONE_CLASS: Readonly<Record<Tone, string>> = {
  neutral: 'bg-neutral-wash text-neutral-ink',
  info: 'bg-info-wash text-info-ink',
  success: 'bg-success-wash text-success-ink',
  warning: 'bg-warning-wash text-warning-ink',
  danger: 'bg-danger-wash text-danger-ink',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

/** A status label. The text carries the meaning; the colour only reinforces it. */
export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
