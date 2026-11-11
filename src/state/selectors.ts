import { hasCheckedOut, isActiveStay, isUpcoming } from '../domain/bookings';
import type { Booking, CleaningTask, GuestMessage, Message, Review, StatFilter } from '../types';
import type { DashboardState } from './dashboardState';

/** One headline number per stat filter. */
export type DashboardStats = Readonly<Record<StatFilter, number>>;

/** A guest message nobody has answered yet, including one whose last attempt failed. */
export function isAwaitingReply(message: Message): message is GuestMessage {
  return (
    message.kind === 'guest' &&
    (message.status === 'new' || message.status === 'processing' || message.status === 'failed')
  );
}

export function selectStats(state: DashboardState, now: Date): DashboardStats {
  return {
    activeStays: state.bookings.filter((booking) => isActiveStay(booking, now)).length,
    pendingCleanings: state.cleaningTasks.filter((task) => task.status !== 'completed').length,
    upcomingCheckIns: state.bookings.filter((booking) => isUpcoming(booking, now)).length,
    awaitingReply: state.messages.filter(isAwaitingReply).length,
  };
}

const byCheckIn = (a: Booking, b: Booking) => a.checkIn.getTime() - b.checkIn.getTime();

function newestFirst<Item extends { timestamp: Date }>(items: readonly Item[]): Item[] {
  return items.toSorted((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/** Messages for the inbox, newest first, narrowed by the active stat filter. */
export function selectMessages(
  state: DashboardState,
  filter: StatFilter | null,
  now: Date,
): Message[] {
  const fromBookingsThat = (matches: (booking: Booking, now: Date) => boolean) => {
    const bookingIds = new Set(
      state.bookings.filter((booking) => matches(booking, now)).map((booking) => booking.id),
    );
    return (message: Message) => message.bookingId !== null && bookingIds.has(message.bookingId);
  };

  switch (filter) {
    case 'awaitingReply':
      return newestFirst(state.messages.filter(isAwaitingReply));
    case 'activeStays':
      return newestFirst(state.messages.filter(fromBookingsThat(isActiveStay)));
    case 'upcomingCheckIns':
      return newestFirst(state.messages.filter(fromBookingsThat(isUpcoming)));
    // The cleaning filter narrows another workspace, so the inbox shows everything.
    case 'pendingCleanings':
    case null:
      return newestFirst(state.messages);
  }
}

export interface BookingList {
  title: string;
  emptyText: string;
  bookings: Booking[];
  /** True when the list shows guests in house, so each row can show stay progress. */
  showsActiveStays: boolean;
}

/** The bookings panel follows the "active stays" filter and otherwise lists what is coming up. */
export function selectBookingList(
  state: DashboardState,
  filter: StatFilter | null,
  now: Date,
): BookingList {
  if (filter === 'activeStays') {
    return {
      title: 'Active stays',
      emptyText: 'No guests are in house right now.',
      bookings: state.bookings.filter((booking) => isActiveStay(booking, now)).toSorted(byCheckIn),
      showsActiveStays: true,
    };
  }
  return {
    title: 'Upcoming check-ins',
    emptyText: 'No upcoming check-ins.',
    bookings: state.bookings.filter((booking) => isUpcoming(booking, now)).toSorted(byCheckIn),
    showsActiveStays: false,
  };
}

/** Turnovers, most recent checkout first. The "pending cleanings" filter hides finished ones. */
export function selectCleaningTasks(
  state: DashboardState,
  filter: StatFilter | null,
): CleaningTask[] {
  const tasks =
    filter === 'pendingCleanings'
      ? state.cleaningTasks.filter((task) => task.status !== 'completed')
      : state.cleaningTasks;
  return tasks.toSorted((a, b) => b.checkOut.getTime() - a.checkOut.getTime());
}

/** Finished stays that have no review yet, most recent first. */
export function selectReviewableBookings(state: DashboardState, now: Date): Booking[] {
  const reviewed = new Set(state.reviews.map((review) => review.bookingId));
  return state.bookings
    .filter((booking) => hasCheckedOut(booking, now) && !reviewed.has(booking.id))
    .toSorted((a, b) => b.checkOut.getTime() - a.checkOut.getTime());
}

export function selectReviews(state: DashboardState): Review[] {
  return newestFirst(state.reviews);
}

/** Mean rating to one decimal place, or null when there are no reviews. */
export function averageRating(reviews: readonly Review[]): number | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}
