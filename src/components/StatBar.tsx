import { BedDouble, BrushCleaning, DoorOpen, ListFilter, MessagesSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { STAT_FILTER_LABEL } from '../domain/labels';
import type { DashboardStats } from '../state/selectors';
import type { StatFilter } from '../types';
import { cx } from './ui/cx';

const STATS: readonly { filter: StatFilter; icon: LucideIcon }[] = [
  { filter: 'activeStays', icon: BedDouble },
  { filter: 'pendingCleanings', icon: BrushCleaning },
  { filter: 'upcomingCheckIns', icon: DoorOpen },
  { filter: 'awaitingReply', icon: MessagesSquare },
];

interface StatBarProps {
  stats: DashboardStats;
  activeFilter: StatFilter | null;
  onToggleFilter: (filter: StatFilter) => void;
}

/** Four headline numbers. Each one is also a toggle that filters the view below it. */
export function StatBar({ stats, activeFilter, onToggleFilter }: StatBarProps) {
  return (
    <section aria-label="Today at a glance" className="mt-4 sm:mt-6">
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {STATS.map(({ filter, icon: Icon }) => {
          const active = activeFilter === filter;
          return (
            <li key={filter}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onToggleFilter(filter)}
                className={cx(
                  // Compact on phones so the work below stays above the fold.
                  'flex h-full w-full cursor-pointer flex-col gap-1 rounded-lg border p-3 text-left transition-colors sm:gap-2 sm:p-4',
                  active
                    ? 'border-accent-edge bg-accent/15'
                    : 'border-line bg-surface hover:bg-hover',
                )}
              >
                <span className="flex items-center justify-between gap-2 text-xs text-ink-muted sm:text-sm">
                  {STAT_FILTER_LABEL[filter]}
                  <Icon aria-hidden className="size-4 shrink-0" />
                </span>
                <span className="font-display text-2xl font-semibold text-ink tabular-nums sm:text-3xl">
                  {stats[filter]}
                </span>
                <span
                  className={cx(
                    'items-center gap-1 text-xs',
                    active ? 'flex font-medium text-accent-ink' : 'hidden text-ink-muted sm:flex',
                  )}
                >
                  {active ? (
                    <>
                      <ListFilter aria-hidden className="size-3.5" />
                      Filter on
                    </>
                  ) : (
                    'Show only these'
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
