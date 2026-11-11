import { format } from 'date-fns';
import { BrushCleaning, Camera, ChevronDown } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { findProperty } from '../../domain/catalog';
import { checklistProgress, isChecklistComplete } from '../../domain/cleaning';
import { CLEANING_STATUS } from '../../domain/labels';
import type {
  Catalog,
  ChecklistItem,
  ChecklistItemState,
  CleaningStatus,
  CleaningTask,
} from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/EmptyState';
import { Panel } from '../ui/Panel';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
/**
 * Raster formats only. The thumbnail links to the full photo, and an SVG opened
 * that way is a document that can run script, so it is not accepted.
 */
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export interface TurnoverHandlers {
  onStatusChange: (taskId: string, status: CleaningStatus) => void;
  onToggleItem: (taskId: string, itemId: string, done: boolean) => void;
  onAttachPhoto: (taskId: string, itemId: string, photoUrl: string) => void;
}

interface ChecklistRowProps {
  item: ChecklistItem;
  itemState: ChecklistItemState;
  /** A finished turnover is read-only until it is reopened. */
  locked: boolean;
  onToggle: (done: boolean) => void;
  onAttachPhoto: (photoUrl: string) => void;
}

function ChecklistRow({ item, itemState, locked, onToggle, onAttachPhoto }: ChecklistRowProps) {
  const checkboxId = useId();
  const hintId = `${checkboxId}-hint`;
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const awaitingPhoto = item.photoRequired && !itemState.photoUrl;

  const onFileChosen = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires a change event.
    event.target.value = '';
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Choose a JPEG, PNG, WebP, or HEIC photo.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Choose a photo smaller than 10 MB.');
      return;
    }

    setPhotoError(null);
    // The previous object URL is released so replaced photos do not pile up in memory.
    if (itemState.photoUrl) URL.revokeObjectURL(itemState.photoUrl);
    onAttachPhoto(URL.createObjectURL(file));
  };

  return (
    <li className="py-2">
      <div className="flex items-center gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={itemState.done}
          disabled={locked || awaitingPhoto}
          aria-describedby={item.photoRequired ? hintId : undefined}
          onChange={(event) => onToggle(event.target.checked)}
          className="size-5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <label htmlFor={checkboxId} className="min-w-0 flex-1 text-sm text-ink">
          {item.label}
          {item.photoRequired ? (
            <span id={hintId} className="block text-xs text-ink-muted">
              {awaitingPhoto ? 'Add a photo to tick this off' : 'Photo attached'}
            </span>
          ) : null}
        </label>

        {itemState.photoUrl ? (
          <a
            href={itemState.photoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-sm"
          >
            <img
              src={itemState.photoUrl}
              alt={`Proof of work for: ${item.label} (opens in a new tab)`}
              className="size-10 rounded-sm border border-line object-cover"
            />
          </a>
        ) : null}

        {item.photoRequired && !locked ? (
          <>
            <Button size="sm" onClick={() => fileInput.current?.click()}>
              <Camera aria-hidden className="size-3.5" />
              {itemState.photoUrl ? 'Replace photo' : 'Add photo'}
              <span className="sr-only">for: {item.label}</span>
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept={PHOTO_TYPES.join(',')}
              hidden
              tabIndex={-1}
              onChange={onFileChosen}
            />
          </>
        ) : null}
      </div>
      {photoError ? (
        <p role="alert" className="mt-1 ml-8 text-xs font-medium text-danger-ink">
          {photoError}
        </p>
      ) : null}
    </li>
  );
}

interface TurnoverProps extends TurnoverHandlers {
  task: CleaningTask;
  catalog: Catalog;
  expanded: boolean;
  onToggleExpanded: () => void;
}

function Turnover({
  task,
  catalog,
  expanded,
  onToggleExpanded,
  onStatusChange,
  onToggleItem,
  onAttachPhoto,
}: TurnoverProps) {
  const detailsId = useId();
  const blockedId = `${detailsId}-blocked`;
  const property = findProperty(catalog, task.propertyId);
  const name = property?.name ?? 'Unknown property';
  const progress = checklistProgress(task);
  const complete = isChecklistComplete(task);
  const status = CLEANING_STATUS[task.status];

  return (
    <li className="border-b border-line last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          onClick={onToggleExpanded}
          className="flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-hover"
        >
          <span className="min-w-40 flex-1">
            <span className="block text-sm font-semibold text-ink">{name}</span>
            <span className="block text-xs font-normal text-ink-muted">
              {task.guestName} checked out {format(task.checkOut, 'MMM d, yyyy')}
            </span>
          </span>
          <span className="flex w-36 items-center gap-2">
            <progress
              max={Math.max(progress.total, 1)}
              value={progress.total === 0 ? 1 : progress.done}
              data-complete={complete}
              aria-label={`Checklist progress for ${name}`}
            />
            <span className="w-9 shrink-0 text-right text-xs font-normal text-ink-muted tabular-nums">
              {progress.percent}%
            </span>
          </span>
          <Badge tone={status.tone}>{status.label}</Badge>
          <ChevronDown
            aria-hidden
            className={cx(
              'size-4 shrink-0 text-ink-muted transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </button>
      </h3>

      {expanded ? (
        <div id={detailsId} className="bg-well px-4 pt-1 pb-4">
          <h4 className="sr-only">Checklist for {name}</h4>
          <ul className="divide-y divide-line">
            {property?.checklist.map((item) => {
              const itemState = task.checklist.find((candidate) => candidate.itemId === item.id);
              if (!itemState) return null;
              return (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  itemState={itemState}
                  locked={task.status === 'completed'}
                  onToggle={(done) => onToggleItem(task.id, item.id, done)}
                  onAttachPhoto={(photoUrl) => onAttachPhoto(task.id, item.id, photoUrl)}
                />
              );
            })}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
            {task.status === 'pending' ? (
              <Button variant="primary" onClick={() => onStatusChange(task.id, 'in_progress')}>
                Start cleaning
              </Button>
            ) : null}
            {task.status === 'in_progress' ? (
              <>
                {complete ? null : (
                  <p id={blockedId} className="text-xs text-ink-muted">
                    Finish the checklist first ({progress.done} of {progress.total} done).
                  </p>
                )}
                <Button
                  variant="primary"
                  disabled={!complete}
                  aria-describedby={complete ? undefined : blockedId}
                  onClick={() => onStatusChange(task.id, 'completed')}
                >
                  Mark as complete
                </Button>
              </>
            ) : null}
            {task.status === 'completed' ? (
              <Button variant="quiet" onClick={() => onStatusChange(task.id, 'in_progress')}>
                Reopen
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

interface TurnoverListProps extends TurnoverHandlers {
  tasks: readonly CleaningTask[];
  catalog: Catalog;
  /** True when the "pending cleanings" filter is hiding finished turnovers. */
  filtered: boolean;
  onClearFilter: () => void;
}

/** Cleaning schedule. One turnover is open at a time, showing its checklist. */
export function TurnoverList({
  tasks,
  catalog,
  filtered,
  onClearFilter,
  ...handlers
}: TurnoverListProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  return (
    <Panel
      title="Cleaning schedule"
      icon={BrushCleaning}
      flush
      aside={
        filtered ? (
          <Button size="sm" onClick={onClearFilter}>
            Show finished too
          </Button>
        ) : null
      }
    >
      {tasks.length === 0 ? (
        <EmptyState>
          {filtered ? 'Every turnover is finished.' : 'No turnovers scheduled.'}
        </EmptyState>
      ) : (
        <ul>
          {tasks.map((task) => (
            <Turnover
              key={task.id}
              task={task}
              catalog={catalog}
              expanded={task.id === expandedTaskId}
              onToggleExpanded={() =>
                setExpandedTaskId((current) => (current === task.id ? null : task.id))
              }
              {...handlers}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
