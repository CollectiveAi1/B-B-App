import { describe, expect, it } from 'vitest';
import { NOW, run, seedState } from '../test/fixtures';
import {
  averageRating,
  selectBookingList,
  selectCleaningTasks,
  selectMessages,
  selectReviewableBookings,
  selectStats,
} from './selectors';

const names = (items: { guestName: string }[]) => items.map((item) => item.guestName);

describe('selectStats', () => {
  it('counts the seeded day', () => {
    expect(selectStats(seedState(), NOW)).toEqual({
      activeStays: 2,
      pendingCleanings: 1,
      upcomingCheckIns: 3,
      awaitingReply: 4,
    });
  });

  it('keeps counting a message as awaiting reply while it is processing or failed', () => {
    const state = run(
      seedState(),
      { type: 'message/processingStarted', messageId: 'msg-seed-1' },
      { type: 'message/processingStarted', messageId: 'msg-seed-2' },
      { type: 'message/failed', messageId: 'msg-seed-2', reason: 'x', timestamp: NOW },
    );
    expect(selectStats(state, NOW).awaitingReply).toBe(4);
  });
});

describe('selectMessages', () => {
  it('lists newest first', () => {
    expect(names(selectMessages(seedState(), null, NOW))).toEqual([
      'Alice Johnson',
      'Bob Williams',
      'Charlie Brown',
      'Diana Prince',
    ]);
  });

  it('narrows to guests in house or arriving', () => {
    expect(names(selectMessages(seedState(), 'activeStays', NOW))).toEqual([
      'Charlie Brown',
      'Diana Prince',
    ]);
    expect(names(selectMessages(seedState(), 'upcomingCheckIns', NOW))).toEqual(['Alice Johnson']);
  });

  it('narrows to unanswered messages', () => {
    const state = run(
      seedState(),
      { type: 'message/processingStarted', messageId: 'msg-seed-1' },
      {
        type: 'message/resolved',
        messageId: 'msg-seed-1',
        result: { kind: 'reply', text: 'x', sources: [] },
        usedSearch: false,
        timestamp: NOW,
      },
    );
    expect(names(selectMessages(state, 'awaitingReply', NOW))).toEqual([
      'Bob Williams',
      'Charlie Brown',
      'Diana Prince',
    ]);
  });

  it('shows everything under the cleaning filter, which belongs to another workspace', () => {
    expect(selectMessages(seedState(), 'pendingCleanings', NOW)).toHaveLength(4);
  });
});

describe('selectBookingList', () => {
  it('lists upcoming check-ins soonest first by default', () => {
    const list = selectBookingList(seedState(), null, NOW);
    expect(list.title).toBe('Upcoming check-ins');
    expect(names(list.bookings)).toEqual(['Alice Johnson', 'Eva Green', 'Frank Castle']);
  });

  it('lists guests in house under the active-stays filter', () => {
    const list = selectBookingList(seedState(), 'activeStays', NOW);
    expect(list.showsActiveStays).toBe(true);
    expect(names(list.bookings)).toEqual(['Diana Prince', 'Charlie Brown']);
  });
});

describe('selectCleaningTasks', () => {
  it('lists the most recent checkout first and can hide finished turnovers', () => {
    expect(names(selectCleaningTasks(seedState(), null))).toEqual([
      'Bruce Wayne',
      'Marcus Lee',
      'Priya Nair',
    ]);
    expect(names(selectCleaningTasks(seedState(), 'pendingCleanings'))).toEqual(['Bruce Wayne']);
  });
});

describe('reviews', () => {
  it('offers only finished stays that have no review', () => {
    expect(names(selectReviewableBookings(seedState(), NOW))).toEqual(['Marcus Lee']);
  });

  it('averages ratings to one decimal place', () => {
    expect(averageRating(seedState().reviews)).toBe(4.5);
    expect(averageRating([])).toBeNull();
  });
});

describe('seed data', () => {
  it('never double-books a property', () => {
    const { bookings } = seedState();
    for (const a of bookings) {
      for (const b of bookings) {
        if (a.id >= b.id || a.propertyId !== b.propertyId) continue;
        const overlap = a.checkIn < b.checkOut && b.checkIn < a.checkOut;
        expect(overlap, `${a.guestName} and ${b.guestName} overlap`).toBe(false);
      }
    }
  });

  it('only references bookings and properties that exist', () => {
    const state = seedState();
    const bookingIds = new Set(state.bookings.map((booking) => booking.id));
    const propertyIds = new Set(state.catalog.properties.map((property) => property.id));

    for (const booking of state.bookings) expect(propertyIds.has(booking.propertyId)).toBe(true);
    const linked = [...state.messages, ...state.inboundQueue].flatMap((message) =>
      message.bookingId === null ? [] : [message.bookingId],
    );
    expect(linked.filter((bookingId) => !bookingIds.has(bookingId))).toEqual([]);
    for (const review of state.reviews) {
      const booking = state.bookings.find((candidate) => candidate.id === review.bookingId);
      expect(booking && booking.checkOut <= review.timestamp).toBe(true);
    }
  });
});
