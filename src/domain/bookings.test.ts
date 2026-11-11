import { describe, expect, it } from 'vitest';
import type { Booking } from '../types';
import { hasCheckedOut, isActiveStay, isUpcoming, stayProgress } from './bookings';

const stay: Booking = {
  id: 'b1',
  guestName: 'Guest',
  propertyId: 'p1',
  checkIn: new Date(2026, 10, 10, 15),
  checkOut: new Date(2026, 10, 13, 11),
  automatedMessagesSent: { preArrival: false, midStay: false, preDeparture: false },
};

describe('booking predicates', () => {
  it('treats check-in as inclusive and checkout as exclusive', () => {
    expect(isUpcoming(stay, new Date(2026, 10, 10, 14, 59))).toBe(true);
    expect(isActiveStay(stay, stay.checkIn)).toBe(true);
    expect(isActiveStay(stay, new Date(2026, 10, 12))).toBe(true);
    expect(isActiveStay(stay, stay.checkOut)).toBe(false);
    expect(hasCheckedOut(stay, stay.checkOut)).toBe(true);
  });

  it('puts every moment in exactly one phase', () => {
    for (const moment of [
      new Date(2026, 10, 9),
      stay.checkIn,
      new Date(2026, 10, 11),
      stay.checkOut,
    ]) {
      const phases = [
        isUpcoming(stay, moment),
        isActiveStay(stay, moment),
        hasCheckedOut(stay, moment),
      ];
      expect(phases.filter(Boolean)).toHaveLength(1);
    }
  });
});

describe('stayProgress', () => {
  it('counts nights the way a front desk does', () => {
    expect(stayProgress(stay, new Date(2026, 10, 10, 20))).toEqual({ night: 1, nights: 3 });
    expect(stayProgress(stay, new Date(2026, 10, 12, 9))).toEqual({ night: 3, nights: 3 });
  });

  it('stays within the length of the stay', () => {
    expect(stayProgress(stay, new Date(2026, 10, 1)).night).toBe(1);
    expect(stayProgress(stay, new Date(2026, 10, 30)).night).toBe(3);
  });
});
