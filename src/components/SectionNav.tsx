import { BrushCleaning, MessagesSquare, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { panelId, SECTION_IDS, tabId } from '../domain/sections';
import type { SectionId } from '../types';
import { cx } from './ui/cx';

const SECTION: Readonly<Record<SectionId, { label: string; icon: LucideIcon }>> = {
  messages: { label: 'Messages', icon: MessagesSquare },
  cleaning: { label: 'Cleaning', icon: BrushCleaning },
  reviews: { label: 'Reviews', icon: Star },
};

interface SectionNavProps {
  active: SectionId;
  /** Items waiting in a section, shown as a count on its tab. */
  counts: Partial<Record<SectionId, number>>;
  onSelect: (section: SectionId) => void;
}

/**
 * Tabs for the three workspaces. On a phone they sit in a bar fixed to the
 * bottom of the screen, inside thumb reach. From the large breakpoint up they
 * become a conventional tab row above the content.
 */
export function SectionNav({ active, counts, onSelect }: SectionNavProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = SECTION_IDS.indexOf(active);
    const last = SECTION_IDS.length - 1;
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    const next = target === undefined ? undefined : SECTION_IDS[target];
    if (!next) return;

    event.preventDefault();
    onSelect(next);
    document.getElementById(tabId(next))?.focus();
  };

  return (
    // A nav landmark, so assistive tech can jump straight to the workspace switcher.
    <nav
      aria-label="Workspaces"
      className={cx(
        'fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]',
        'lg:static lg:z-auto lg:mt-6 lg:border-t-0 lg:border-b lg:bg-transparent lg:pb-0',
      )}
    >
      <div role="tablist" aria-label="Workspaces" className="flex lg:gap-6">
        {SECTION_IDS.map((section) => {
          const { label, icon: Icon } = SECTION[section];
          const selected = section === active;
          const count = counts[section] ?? 0;

          return (
            <button
              key={section}
              type="button"
              role="tab"
              id={tabId(section)}
              aria-selected={selected}
              // Only the open panel is in the page, so only its tab points at one.
              aria-controls={selected ? panelId(section) : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(section)}
              onKeyDown={onKeyDown}
              className={cx(
                'relative flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition-colors',
                'lg:min-h-12 lg:flex-none lg:flex-row lg:gap-2 lg:px-1 lg:text-sm',
                // The selected tab is marked by weight and a bar as well as colour.
                'border-t-2 lg:-mb-px lg:border-t-0 lg:border-b-2',
                selected
                  ? 'border-accent-edge font-semibold text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              <Icon aria-hidden className="size-5 lg:size-4" />
              <span>{label}</span>
              {count > 0 ? (
                <span className="absolute top-1.5 right-[calc(50%-1.75rem)] min-w-5 rounded-full bg-neutral-wash px-1.5 text-center text-xs text-neutral-ink tabular-nums lg:static">
                  {count}
                  <span className="sr-only"> waiting</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
