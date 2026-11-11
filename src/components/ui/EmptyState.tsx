import type { ReactNode } from 'react';

interface EmptyStateProps {
  children: ReactNode;
  /** An optional way out, such as a button that clears the filter. */
  action?: ReactNode;
}

export function EmptyState({ children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <p className="text-sm text-ink-muted">{children}</p>
      {action}
    </div>
  );
}
