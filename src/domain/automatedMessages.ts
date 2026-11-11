import { AUTOMATED_MESSAGE_KINDS } from '../../shared/assistant';
import type { AutomatedMessageKind, Booking } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export const AUTOMATED_MESSAGE_LABEL: Readonly<Record<AutomatedMessageKind, string>> = {
  preArrival: 'Pre-arrival',
  midStay: 'Mid-stay',
  preDeparture: 'Pre-departure',
};

export interface DueMessage {
  booking: Booking;
  trigger: AutomatedMessageKind;
}

function isDue(booking: Booking, trigger: AutomatedMessageKind, now: Date): boolean {
  const untilCheckIn = booking.checkIn.getTime() - now.getTime();
  const untilCheckOut = booking.checkOut.getTime() - now.getTime();

  switch (trigger) {
    case 'preArrival':
      return untilCheckIn > 0 && untilCheckIn <= DAY_MS;
    case 'midStay':
      return -untilCheckIn >= DAY_MS && untilCheckOut > 0;
    case 'preDeparture':
      return untilCheckOut > 0 && untilCheckOut <= DAY_MS;
  }
}

/**
 * Scheduled messages that should go out now: a day before arrival, a day into
 * the stay, and a day before departure. Each is sent once per booking.
 */
export function dueAutomatedMessages(bookings: readonly Booking[], now: Date): DueMessage[] {
  return bookings.flatMap((booking) =>
    AUTOMATED_MESSAGE_KINDS.filter(
      (trigger) => !booking.automatedMessagesSent[trigger] && isDue(booking, trigger, now),
    ).map((trigger) => ({ booking, trigger })),
  );
}

/**
 * Fixed wording used when no model is available. A check-in reminder still has
 * to reach the guest when the assistant is down.
 */
export function templateMessage(
  trigger: AutomatedMessageKind,
  guestName: string,
  propertyName: string,
): string {
  switch (trigger) {
    case 'preArrival':
      return `Hi ${guestName}, we're excited for your stay at ${propertyName} tomorrow! Just a reminder, check-in is anytime after 3 PM. We'll send the access code on the morning of your arrival.`;
    case 'midStay':
      return `Hi ${guestName}, hope you're settling in well at ${propertyName}! Please let us know if there is anything you need to make your stay more comfortable.`;
    case 'preDeparture':
      return `Hi ${guestName}, we hope you've enjoyed your stay at ${propertyName}! This is a friendly reminder that checkout is tomorrow by 11 AM. Please make sure all windows are closed and the main door is locked when you leave. Safe travels!`;
  }
}
