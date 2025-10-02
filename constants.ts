import { Message, Booking, MessageStatus, CleaningStaff, MaintenanceStaff, GuestReview } from './types';

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg_1',
    guestName: 'Alice Johnson',
    platform: 'Airbnb',
    content: "Hi there! Just booked our stay. Can you confirm the check-in instructions? We're arriving late, around 11 PM.",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    status: MessageStatus.NEW,
    author: 'guest',
  },
  {
    id: 'msg_2',
    guestName: 'Bob Williams',
    platform: 'Airbnb',
    content: "Hello, I'm interested in booking your place for next month. Do you allow pets? I have a small, well-behaved corgi.",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    status: MessageStatus.NEW,
    author: 'guest',
  },
  {
    id: 'msg_3',
    guestName: 'Charlie Brown',
    platform: 'Airbnb',
    content: "The Wi-Fi password you provided doesn't seem to be working. Can you please double-check it for us? Thanks!",
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    status: MessageStatus.NEW,
    author: 'guest',
  },
  {
    id: 'msg_4',
    guestName: 'Diana Prince',
    platform: 'Airbnb',
    content: "We've had a wonderful stay so far, but we noticed a water leak under the kitchen sink. It's a slow drip but wanted to let you know immediately.",
    timestamp: new Date(Date.now() - 1000 * 60 * 200),
    status: MessageStatus.NEW,
    author: 'guest',
  },
];

export const UPCOMING_BOOKINGS: Booking[] = [
  {
    id: 'book_1',
    guestName: 'Alice Johnson',
    checkIn: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1), // Check-in tomorrow
    checkOut: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    property: 'The Cozy Cottage',
    automatedMessagesSent: { preArrival: false, midStay: false, preDeparture: false },
  },
  {
    id: 'book_2',
    guestName: 'Frank Castle',
    checkIn: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    checkOut: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
    property: 'Lakeside Cabin',
    automatedMessagesSent: { preArrival: false, midStay: false, preDeparture: false },
  },
  {
    id: 'book_3',
    guestName: 'Bruce Wayne',
    checkIn: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    checkOut: new Date(Date.now() - 1000 * 60 * 60 * 2), // Checked out recently
    property: 'The Penthouse',
    automatedMessagesSent: { preArrival: true, midStay: true, preDeparture: true }, // Already sent
  },
  {
    id: 'book_4',
    guestName: 'Charlie Brown',
    checkIn: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // Currently staying
    checkOut: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    property: 'The Cozy Cottage',
    automatedMessagesSent: { preArrival: true, midStay: false, preDeparture: false },
  },
];

export const CLEANING_STAFF: CleaningStaff[] = [
    { id: 'staff_1', name: 'Maria Garcia' },
    { id: 'staff_2', name: 'David Chen' },
    { id: 'staff_3', name: 'Fatima Al-Jamil' },
];

export const PROPERTY_LOCATIONS: Record<string, string> = {
  'The Cozy Cottage': 'Downtown',
  'Lakeside Cabin': 'Lakeside',
  'The Penthouse': 'Uptown',
};

export const MAINTENANCE_STAFF: MaintenanceStaff[] = [
    { id: 'maint_staff_1', name: 'John Piper', specializations: ['leak', 'plumbing', 'sink', 'faucet', 'toilet', 'drip', 'water'], location: 'Downtown' },
    { id: 'maint_staff_4', name: 'Walter Pipes', specializations: ['leak', 'plumbing', 'sink', 'faucet', 'toilet', 'drip', 'water'], location: 'Downtown' },
    { id: 'maint_staff_2', name: 'Eleanor Spark', specializations: ['electric', 'outlet', 'light', 'power', 'wifi', 'internet', 'password'], location: 'Uptown' },
    { id: 'maint_staff_3', name: 'Bob Builder', specializations: ['general', 'broken', 'fix', 'repair', 'door', 'window'], location: 'Any' }
];

export const INITIAL_REVIEWS: GuestReview[] = [
  {
    id: 'review_1',
    guestName: 'Bruce Wayne',
    property: 'The Penthouse',
    rating: 5,
    comment: "Absolutely stunning view from The Penthouse. The place was immaculate and the host was very responsive. A truly 5-star experience.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  },
  {
    id: 'review_2',
    guestName: 'Charlie Brown',
    property: 'The Cozy Cottage',
    rating: 4,
    comment: "The cottage was very cozy and clean. The location is great. We had a small issue with the Wi-Fi, but it was resolved quickly. Would stay again.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
  },
];