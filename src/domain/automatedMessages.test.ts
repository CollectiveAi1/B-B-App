import { describe, expect, it } from 'vitest';
import type { Booking } from '../types';
import { dueAutomatedMessages, templateMessage } from './automatedMessages';

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-11-10T12:00:00Z');
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR);

function booking(
  checkInHours: number,
  checkOutHours: number,
  sent: Partial<Booking['automatedMessagesSent']> = {},
): Booking {
  return {
    id: 'b1',
    guestName: 'Guest',
    propertyId: 'p1',
    checkIn: at(checkInHours),
    checkOut: at(checkOutHours),
    automatedMessagesSent: { preArrival: false, midStay: false, preDeparture: false, ...sent },
  };
}

const due = (...bookings: Booking[]) =>
  dueAutomatedMessages(bookings, NOW).map((entry) => entry.trigger);

describe('dueAutomatedMessages', () => {
  it('sends the pre-arrival message in the 24 hours before check-in', () => {
    expect(due(booking(24, 96))).toEqual(['preArrival']);
    expect(due(booking(0.5, 72))).toEqual(['preArrival']);
    expect(due(booking(24.01, 96))).toEqual([]);
  });

  it('does not send a pre-arrival message once the guest has checked in', () => {
    expect(due(booking(0, 72))).toEqual([]);
    expect(due(booking(-2, 72))).toEqual([]);
  });

  it('sends the mid-stay message a day after check-in while the guest is still there', () => {
    expect(due(booking(-24, 48))).toEqual(['midStay']);
    expect(due(booking(-23.9, 48))).toEqual([]);
    expect(due(booking(-72, -1))).toEqual([]);
  });

  it('sends the pre-departure message in the 24 hours before checkout', () => {
    expect(due(booking(-10, 24, { midStay: true }))).toEqual(['preDeparture']);
    expect(due(booking(-10, 24.5, { midStay: true }))).toEqual([]);
    expect(due(booking(-48, 0, { midStay: true }))).toEqual([]);
  });

  it('never repeats a message that was already sent', () => {
    expect(due(booking(-30, 10, { midStay: true, preDeparture: true }))).toEqual([]);
  });

  it('can owe several messages for one booking', () => {
    expect(due(booking(-30, 10))).toEqual(['midStay', 'preDeparture']);
  });
});

describe('templateMessage', () => {
  it('names the guest and the property in every template', () => {
    for (const kind of ['preArrival', 'midStay', 'preDeparture'] as const) {
      const text = templateMessage(kind, 'Alice', 'The Penthouse');
      expect(text).toContain('Alice');
      expect(text).toContain('The Penthouse');
    }
  });
});
