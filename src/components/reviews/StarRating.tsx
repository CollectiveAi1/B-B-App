import { Star } from 'lucide-react';
import { useId } from 'react';
import type { Rating } from '../../types';
import { cx } from '../ui/cx';

const RATINGS: readonly Rating[] = [1, 2, 3, 4, 5];

const starClass = (filled: boolean) =>
  filled ? 'fill-accent text-accent-edge' : 'fill-transparent text-line-strong';

/** Read-only stars. Screen readers get the rating as one phrase, not five icons. */
export function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      <span className="sr-only">{rating} out of 5 stars</span>
      {RATINGS.map((value) => (
        <Star key={value} aria-hidden className={cx('size-4', starClass(value <= rating))} />
      ))}
    </span>
  );
}

interface RatingInputProps {
  value: Rating | null;
  onChange: (rating: Rating) => void;
  error?: string | null;
}

/**
 * Star picker built on native radio buttons, so arrow keys, form semantics, and
 * screen readers all work without custom key handling.
 */
export function RatingInput({ value, onChange, error }: RatingInputProps) {
  const name = useId();
  const errorId = `${name}-error`;

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1 text-sm font-medium text-ink">
        Rating
        <span aria-hidden className="ml-0.5 text-danger-ink">
          *
        </span>
        <span className="sr-only"> (required)</span>
      </legend>
      <div className="flex gap-1">
        {RATINGS.map((rating) => (
          <label key={rating} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              className="peer sr-only"
            />
            <span className="grid size-9 place-items-center rounded-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus pointer-coarse:size-11">
              <Star
                aria-hidden
                className={cx('size-6', starClass(value !== null && rating <= value))}
              />
            </span>
            <span className="sr-only">{rating === 1 ? '1 star' : `${rating} stars`}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-danger-ink">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
