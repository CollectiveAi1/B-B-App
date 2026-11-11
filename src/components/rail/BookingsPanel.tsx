import { format, formatDistance } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { stayProgress } from '../../domain/bookings';
import { propertyName } from '../../domain/catalog';
import { useNowValue } from '../../hooks/nowContext';
import type { BookingList } from '../../state/selectors';
import type { Booking, Catalog } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { Panel } from '../ui/Panel';

function StayNights({ booking }: { booking: Booking }) {
  const now = useNowValue();
  const { night, nights } = stayProgress(booking, now);
  const label = `Night ${night} of ${nights}`;

  return (
    <div className="mt-2">
      <p className="mb-1 text-xs text-ink-muted tabular-nums">{label}</p>
      <progress max={nights} value={night} aria-label={`${booking.guestName}: ${label}`} />
    </div>
  );
}

function Arrival({ booking }: { booking: Booking }) {
  const now = useNowValue();
  return (
    <p className="mt-1 text-xs text-ink-muted">
      Arrives {formatDistance(booking.checkIn, now, { addSuffix: true })}
    </p>
  );
}

interface BookingsPanelProps {
  list: BookingList;
  catalog: Catalog;
}

/** Who is arriving next, or who is in house when the "active stays" filter is on. */
export function BookingsPanel({ list, catalog }: BookingsPanelProps) {
  return (
    <Panel title={list.title} icon={CalendarDays}>
      {list.bookings.length === 0 ? (
        <EmptyState>{list.emptyText}</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {list.bookings.map((booking) => (
            <li key={booking.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-ink">{booking.guestName}</p>
                <p className="shrink-0 text-xs text-ink-muted tabular-nums">
                  <time dateTime={booking.checkIn.toISOString()}>
                    {format(booking.checkIn, 'MMM d')}
                  </time>
                  {' – '}
                  <time dateTime={booking.checkOut.toISOString()}>
                    {format(booking.checkOut, 'MMM d')}
                  </time>
                </p>
              </div>
              <p className="text-xs text-ink-muted">{propertyName(catalog, booking.propertyId)}</p>
              {list.showsActiveStays ? (
                <StayNights booking={booking} />
              ) : (
                <Arrival booking={booking} />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
