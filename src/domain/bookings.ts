import { differenceInCalendarDays } from 'date-fns';
import type { Booking } from '../types';

export function isActiveStay(booking: Booking, now: Date): boolean {
  return booking.checkIn <= now && now < booking.checkOut;
}

export function isUpcoming(booking: Booking, now: Date): boolean {
  return booking.checkIn > now;
}

export function hasCheckedOut(booking: Booking, now: Date): boolean {
  return booking.checkOut <= now;
}

export interface StayProgress {
  /** 1-based night the guest is on. */
  night: number;
  nights: number;
}

/** Where a guest is in their stay, counted in nights the way a front desk would. */
export function stayProgress(booking: Booking, now: Date): StayProgress {
  const nights = Math.max(1, differenceInCalendarDays(booking.checkOut, booking.checkIn));
  const elapsed = differenceInCalendarDays(now, booking.checkIn) + 1;
  return { night: Math.min(Math.max(elapsed, 1), nights), nights };
}
