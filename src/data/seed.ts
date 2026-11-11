import { createCleaningTask } from '../domain/cleaning';
import { findProperty } from '../domain/catalog';
import type { DashboardState } from '../state/dashboardState';
import type {
  Booking,
  Catalog,
  CleaningTask,
  GuestMessage,
  InboundMessage,
  Review,
} from '../types';
import { CATALOG } from './catalog';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const NOTHING_SENT = { preArrival: false, midStay: false, preDeparture: false } as const;
const ALL_SENT = { preArrival: true, midStay: true, preDeparture: true } as const;

/**
 * Sample bookings, placed relative to `now` so the dashboard always opens on a
 * live-looking day: one guest just left, two are in house, one arrives tomorrow.
 * No two stays overlap at the same property.
 */
function seedBookings(now: Date): Booking[] {
  const at = (offset: number) => new Date(now.getTime() + offset);

  return [
    {
      id: 'booking-priya',
      guestName: 'Priya Nair',
      propertyId: 'cozy-cottage',
      checkIn: at(-9 * DAY),
      checkOut: at(-6 * DAY),
      automatedMessagesSent: ALL_SENT,
    },
    {
      id: 'booking-marcus',
      guestName: 'Marcus Lee',
      propertyId: 'lakeside-cabin',
      checkIn: at(-8 * DAY),
      checkOut: at(-5 * DAY),
      automatedMessagesSent: ALL_SENT,
    },
    {
      id: 'booking-bruce',
      guestName: 'Bruce Wayne',
      propertyId: 'penthouse',
      checkIn: at(-3 * DAY),
      checkOut: at(-2 * HOUR),
      automatedMessagesSent: ALL_SENT,
    },
    {
      id: 'booking-diana',
      guestName: 'Diana Prince',
      propertyId: 'lakeside-cabin',
      checkIn: at(-2 * DAY),
      checkOut: at(2 * DAY),
      automatedMessagesSent: { preArrival: true, midStay: true, preDeparture: false },
    },
    {
      id: 'booking-charlie',
      guestName: 'Charlie Brown',
      propertyId: 'cozy-cottage',
      checkIn: at(-1 * DAY),
      checkOut: at(2 * DAY),
      automatedMessagesSent: { preArrival: true, midStay: false, preDeparture: false },
    },
    {
      id: 'booking-alice',
      guestName: 'Alice Johnson',
      propertyId: 'penthouse',
      checkIn: at(1 * DAY),
      checkOut: at(5 * DAY),
      automatedMessagesSent: NOTHING_SENT,
    },
    {
      id: 'booking-eva',
      guestName: 'Eva Green',
      propertyId: 'cozy-cottage',
      checkIn: at(3 * DAY),
      checkOut: at(6 * DAY),
      automatedMessagesSent: NOTHING_SENT,
    },
    {
      id: 'booking-frank',
      guestName: 'Frank Castle',
      propertyId: 'lakeside-cabin',
      checkIn: at(7 * DAY),
      checkOut: at(10 * DAY),
      automatedMessagesSent: NOTHING_SENT,
    },
  ];
}

function seedMessages(now: Date): GuestMessage[] {
  const unanswered = { status: 'new', resolution: null, failure: null } as const;
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * MINUTE);

  return [
    {
      kind: 'guest',
      id: 'msg-seed-1',
      guestName: 'Alice Johnson',
      bookingId: 'booking-alice',
      platform: 'Airbnb',
      body: "Hi there! Just booked our stay. Can you confirm the check-in instructions? We're arriving late, around 11 PM.",
      timestamp: minutesAgo(15),
      ...unanswered,
    },
    {
      kind: 'guest',
      id: 'msg-seed-2',
      guestName: 'Bob Williams',
      bookingId: null,
      platform: 'Airbnb',
      body: "Hello, I'm interested in booking your place for next month. Do you allow pets? I have a small, well-behaved corgi.",
      timestamp: minutesAgo(45),
      ...unanswered,
    },
    {
      kind: 'guest',
      id: 'msg-seed-3',
      guestName: 'Charlie Brown',
      bookingId: 'booking-charlie',
      platform: 'Airbnb',
      body: "The Wi-Fi password you provided doesn't seem to be working. Can you please double-check it for us? Thanks!",
      timestamp: minutesAgo(120),
      ...unanswered,
    },
    {
      kind: 'guest',
      id: 'msg-seed-4',
      guestName: 'Diana Prince',
      bookingId: 'booking-diana',
      platform: 'Airbnb',
      body: "We've had a wonderful stay so far, but we noticed a water leak under the kitchen sink. It's a slow drip but wanted to let you know immediately.",
      timestamp: minutesAgo(200),
      ...unanswered,
    },
  ];
}

/**
 * Messages the simulated inbox hands over, one per check. Between them they
 * exercise every path: search, scripted answers, each repair trade, and
 * escalation.
 */
const INBOUND_QUEUE: readonly InboundMessage[] = [
  {
    guestName: 'Eva Green',
    bookingId: 'booking-eva',
    platform: 'Airbnb',
    body: 'Hi! Can you recommend some good vegetarian restaurants near the Cozy Cottage?',
  },
  {
    guestName: 'Frank Castle',
    bookingId: 'booking-frank',
    platform: 'Airbnb',
    body: 'Is it possible to check in a bit early, around noon?',
  },
  {
    guestName: 'Charlie Brown',
    bookingId: 'booking-charlie',
    platform: 'Airbnb',
    body: 'The bathroom faucet has started dripping constantly. Could someone take a look?',
  },
  {
    guestName: 'Alice Johnson',
    bookingId: 'booking-alice',
    platform: 'Airbnb',
    body: 'Is there a hairdryer and an iron at the apartment?',
  },
  {
    guestName: 'Diana Prince',
    bookingId: 'booking-diana',
    platform: 'Airbnb',
    body: 'One of the bedroom lights flickers and the outlet next to the bed has no power.',
  },
  {
    guestName: 'Noah Kim',
    bookingId: null,
    platform: 'Airbnb',
    body: 'What is your cancellation policy if our plans change?',
  },
  {
    guestName: 'Bruce Wayne',
    bookingId: 'booking-bruce',
    platform: 'Airbnb',
    body: 'I think I left my phone charger in the bedroom. Could someone check?',
  },
  {
    guestName: 'Diana Prince',
    bookingId: 'booking-diana',
    platform: 'Airbnb',
    body: "The back door lock is broken and won't latch.",
  },
];

/**
 * Marks a turnover as done. Older turnovers were finished before this session,
 * so their photo slots stay empty.
 */
function finished(task: CleaningTask): CleaningTask {
  return {
    ...task,
    status: 'completed',
    checklist: task.checklist.map((item) => ({ ...item, done: true })),
  };
}

function seedCleaningTasks(bookings: readonly Booking[], catalog: Catalog): CleaningTask[] {
  const taskFor = (bookingId: string): CleaningTask => {
    const booking = bookings.find((candidate) => candidate.id === bookingId);
    const property = booking && findProperty(catalog, booking.propertyId);
    if (!booking || !property) throw new Error(`Seed data references unknown booking ${bookingId}`);
    return createCleaningTask(`cleaning-${bookingId}`, booking, property);
  };

  return [
    taskFor('booking-bruce'),
    finished(taskFor('booking-marcus')),
    finished(taskFor('booking-priya')),
  ];
}

function seedReviews(now: Date): Review[] {
  return [
    {
      id: 'review-seed-1',
      bookingId: 'booking-bruce',
      guestName: 'Bruce Wayne',
      propertyId: 'penthouse',
      rating: 5,
      comment:
        'Absolutely stunning view from The Penthouse. The place was immaculate and the host was very responsive. A truly 5-star experience.',
      timestamp: new Date(now.getTime() - 1 * HOUR),
    },
    {
      id: 'review-seed-2',
      bookingId: 'booking-priya',
      guestName: 'Priya Nair',
      propertyId: 'cozy-cottage',
      rating: 4,
      comment:
        'The cottage was very cozy and clean. The location is great. We had a small issue with the Wi-Fi, but it was resolved quickly. Would stay again.',
      timestamp: new Date(now.getTime() - 5 * DAY),
    },
  ];
}

/** Builds the state the dashboard opens with. Pass a fixed `now` in tests. */
export function createSeedState(now: Date, catalog: Catalog = CATALOG): DashboardState {
  const bookings = seedBookings(now);

  return {
    catalog,
    bookings,
    messages: seedMessages(now),
    inboundQueue: INBOUND_QUEUE,
    lastInboxCheck: null,
    cleaningTasks: seedCleaningTasks(bookings, catalog),
    maintenanceTasks: [],
    clockedIn: {},
    crewNotes: [],
    incidents: [],
    reviews: seedReviews(now),
    staffNotifications: [],
    alerts: [],
    activityLog: [],
    sequence: 0,
  };
}
