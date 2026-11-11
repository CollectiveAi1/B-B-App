import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'quiet';
type Size = 'sm' | 'md';

const VARIANT_CLASS: Readonly<Record<Variant, string>> = {
  // Gold fill: the one primary action in a section.
  primary: 'border border-accent-edge bg-accent text-on-accent hover:bg-accent/85',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-hover',
  quiet: 'border border-transparent text-ink-muted hover:bg-hover hover:text-ink',
};

// Touch screens get a 44px target. Mouse users get a denser control.
const SIZE_CLASS: Readonly<Record<Size, string>> = {
  sm: 'min-h-8 gap-1.5 px-2.5 text-xs pointer-coarse:min-h-11',
  md: 'min-h-9 gap-2 px-4 text-sm pointer-coarse:min-h-11',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    />
  );
}
