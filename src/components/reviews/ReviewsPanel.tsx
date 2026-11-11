import { Star } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { propertyName } from '../../domain/catalog';
import { averageRating } from '../../state/selectors';
import type { Booking, Catalog, Rating, Review } from '../../types';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { CONTROL_CLASS, Field } from '../ui/Field';
import { Panel } from '../ui/Panel';
import { RelativeTime } from '../ui/RelativeTime';
import { RatingInput, StarRating } from './StarRating';

interface ReviewFormProps {
  bookings: readonly Booking[];
  catalog: Catalog;
  onSubmit: (review: { bookingId: string; rating: Rating; comment: string }) => void;
  onCancel: () => void;
}

interface FormErrors {
  booking?: string;
  rating?: string;
  comment?: string;
}

function ReviewForm({ bookings, catalog, onSubmit, onCancel }: ReviewFormProps) {
  const [bookingId, setBookingId] = useState('');
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const form = useRef<HTMLFormElement>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found: FormErrors = {
      ...(bookingId ? {} : { booking: 'Choose the stay this review is for.' }),
      ...(rating ? {} : { rating: 'Choose a rating from 1 to 5 stars.' }),
      ...(comment.trim() ? {} : { comment: "Write the guest's feedback." }),
    };
    setErrors(found);

    if (!bookingId || !rating || !comment.trim()) {
      // Send keyboard and screen-reader users straight to the first problem.
      const firstInvalid = found.booking
        ? 'select'
        : found.rating
          ? 'input[type=radio]'
          : 'textarea';
      form.current?.querySelector<HTMLElement>(firstInvalid)?.focus();
      return;
    }
    onSubmit({ bookingId, rating, comment });
  };

  return (
    <form
      ref={form}
      onSubmit={handleSubmit}
      noValidate
      aria-label="New review"
      className="space-y-4 rounded-md border border-line bg-well p-4"
    >
      <h3 className="font-display text-base font-semibold text-ink">New review</h3>

      <Field label="Guest and stay" required error={errors.booking}>
        {(control) => (
          <select
            {...control}
            value={bookingId}
            onChange={(event) => {
              setBookingId(event.target.value);
              setErrors((current) => ({ ...current, booking: undefined }));
            }}
            className={CONTROL_CLASS}
          >
            <option value="">Select a finished stay</option>
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.guestName} at {propertyName(catalog, booking.propertyId)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <RatingInput
        value={rating}
        error={errors.rating}
        onChange={(next) => {
          setRating(next);
          setErrors((current) => ({ ...current, rating: undefined }));
        }}
      />

      <Field label="Comment" required error={errors.comment}>
        {(control) => (
          <textarea
            {...control}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setErrors((current) => ({ ...current, comment: undefined }));
            }}
            rows={4}
            maxLength={2000}
            className={CONTROL_CLASS}
          />
        )}
      </Field>

      <div className="flex justify-end gap-2">
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save review
        </Button>
      </div>
    </form>
  );
}

interface ReviewsPanelProps {
  reviews: readonly Review[];
  /** Finished stays that have no review yet. */
  reviewableBookings: readonly Booking[];
  catalog: Catalog;
  onAddReview: (review: { bookingId: string; rating: Rating; comment: string }) => void;
}

export function ReviewsPanel({
  reviews,
  reviewableBookings,
  catalog,
  onAddReview,
}: ReviewsPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const average = averageRating(reviews);
  const nothingToReview = reviewableBookings.length === 0;

  return (
    <Panel
      title="Guest reviews"
      icon={Star}
      aside={
        average === null ? null : (
          <span className="text-xs text-ink-muted tabular-nums">
            {average.toFixed(1)} average · {reviews.length}{' '}
            {reviews.length === 1 ? 'review' : 'reviews'}
          </span>
        )
      }
    >
      {formOpen ? (
        <ReviewForm
          bookings={reviewableBookings}
          catalog={catalog}
          onCancel={() => setFormOpen(false)}
          onSubmit={(review) => {
            onAddReview(review);
            setFormOpen(false);
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={nothingToReview} onClick={() => setFormOpen(true)}>
            Add a review
          </Button>
          {nothingToReview ? (
            <p className="text-xs text-ink-muted">Every finished stay already has a review.</p>
          ) : null}
        </div>
      )}

      {reviews.length === 0 ? (
        <EmptyState>No reviews yet.</EmptyState>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-md border border-line bg-well p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div>
                  <p className="font-semibold text-ink">{review.guestName}</p>
                  <p className="text-xs text-ink-muted">
                    {propertyName(catalog, review.propertyId)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <StarRating rating={review.rating} />
                  <p className="text-xs text-ink-muted">
                    <RelativeTime date={review.timestamp} />
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm whitespace-pre-line text-ink">{review.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
