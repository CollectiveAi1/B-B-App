import type { AutomatedMessageKind, Source } from '../shared/assistant';

export type { AutomatedMessageKind, Source };

/* ── Catalog: reference data that does not change while the app runs ─────── */

export type Area = 'Downtown' | 'Lakeside' | 'Uptown';

export interface ChecklistItem {
  id: string;
  label: string;
  /** A photo must be attached before the item counts as done. */
  photoRequired: boolean;
}

export interface Property {
  id: string;
  name: string;
  area: Area;
  checklist: readonly ChecklistItem[];
}

export interface CleaningStaff {
  id: string;
  name: string;
}

export interface MaintenanceStaff {
  id: string;
  name: string;
  /** Words in a task description that mark the job as this person's trade. */
  keywords: readonly string[];
  /** 'any' means the person travels to every property. */
  area: Area | 'any';
  /** Takes the jobs no specialist matches. */
  generalist: boolean;
}

export interface Catalog {
  properties: readonly Property[];
  cleaningStaff: readonly CleaningStaff[];
  maintenanceStaff: readonly MaintenanceStaff[];
}

/* ── Bookings and messages ───────────────────────────────────────────────── */

export interface Booking {
  id: string;
  guestName: string;
  propertyId: string;
  checkIn: Date;
  checkOut: Date;
  automatedMessagesSent: Readonly<Record<AutomatedMessageKind, boolean>>;
}

export type MessageStatus = 'new' | 'processing' | 'responded' | 'escalated' | 'failed';

/** What the assistant did with a guest message once it finished. */
export type Resolution =
  | { kind: 'reply'; text: string; sources: readonly Source[] }
  | { kind: 'maintenance'; task: string; taskId: string }
  | { kind: 'escalation'; reason: string };

export interface GuestMessage {
  kind: 'guest';
  id: string;
  guestName: string;
  /** Null for enquiries from people who have not booked. */
  bookingId: string | null;
  platform: string;
  body: string;
  timestamp: Date;
  status: MessageStatus;
  resolution: Resolution | null;
  /** Why the last attempt failed. Only set while status is 'failed'. */
  failure: string | null;
}

export interface AutomatedMessage {
  kind: 'automated';
  id: string;
  guestName: string;
  bookingId: string;
  trigger: AutomatedMessageKind;
  body: string;
  timestamp: Date;
}

export type Message = GuestMessage | AutomatedMessage;

/** A guest message waiting in the simulated inbox until the next check. */
export type InboundMessage = Pick<GuestMessage, 'guestName' | 'bookingId' | 'platform' | 'body'>;

/* ── Operations ──────────────────────────────────────────────────────────── */

export type CleaningStatus = 'pending' | 'in_progress' | 'completed';

export interface ChecklistItemState {
  itemId: string;
  done: boolean;
  photoUrl: string | null;
}

export interface CleaningTask {
  id: string;
  bookingId: string;
  propertyId: string;
  guestName: string;
  checkOut: Date;
  status: CleaningStatus;
  checklist: readonly ChecklistItemState[];
}

export type MaintenanceStatus = 'todo' | 'in_progress' | 'completed';

export interface MaintenanceTask {
  id: string;
  createdAt: Date;
  propertyId: string;
  description: string;
  status: MaintenanceStatus;
  sourceMessageId: string;
  assigneeId: string | null;
}

export interface CrewNote {
  id: string;
  text: string;
  timestamp: Date;
}

export interface IncidentReport {
  id: string;
  staffId: string;
  propertyId: string;
  description: string;
  timestamp: Date;
}

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface Review {
  id: string;
  bookingId: string;
  guestName: string;
  propertyId: string;
  rating: Rating;
  comment: string;
  timestamp: Date;
}

/* ── Feeds ───────────────────────────────────────────────────────────────── */

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface LogEntry {
  id: string;
  timestamp: Date;
  event: string;
  outcome: string;
  tone: Tone;
}

export type StaffNotificationKind = 'maintenance' | 'escalation' | 'incident';

export interface StaffNotification {
  id: string;
  timestamp: Date;
  channel: string;
  kind: StaffNotificationKind;
  text: string;
}

export interface ManagementAlert {
  id: string;
  timestamp: Date;
  recipient: string;
  subject: string;
  body: string;
}

export type InboxCheckSource = 'manual' | 'scheduled';

export interface InboxCheck {
  timestamp: Date;
  source: InboxCheckSource;
  delivered: number;
}

/* ── View state ──────────────────────────────────────────────────────────── */

export type StatFilter = 'activeStays' | 'pendingCleanings' | 'upcomingCheckIns' | 'awaitingReply';

export type SectionId = 'messages' | 'cleaning' | 'reviews';
