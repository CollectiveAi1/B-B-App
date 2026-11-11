import type {
  Booking,
  Catalog,
  CleaningTask,
  CrewNote,
  InboundMessage,
  InboxCheck,
  IncidentReport,
  LogEntry,
  MaintenanceTask,
  ManagementAlert,
  Message,
  Review,
  StaffNotification,
} from '../types';

/** Everything the dashboard knows. It lives in memory and resets on reload. */
export interface DashboardState {
  catalog: Catalog;
  bookings: readonly Booking[];
  messages: readonly Message[];
  /** Simulated guest messages that have not "arrived" yet. */
  inboundQueue: readonly InboundMessage[];
  lastInboxCheck: InboxCheck | null;
  cleaningTasks: readonly CleaningTask[];
  maintenanceTasks: readonly MaintenanceTask[];
  /** Cleaning staff on shift: staff id to clock-in time. */
  clockedIn: Readonly<Record<string, Date>>;
  crewNotes: readonly CrewNote[];
  incidents: readonly IncidentReport[];
  reviews: readonly Review[];
  staffNotifications: readonly StaffNotification[];
  alerts: readonly ManagementAlert[];
  activityLog: readonly LogEntry[];
  /**
   * Last id handed out. Ids come from this counter, not from the clock, so two
   * records made in the same millisecond can never collide and the reducer
   * stays a pure function.
   */
  sequence: number;
}

export const STAFF_CHANNEL = '#bnb-staff';
export const MANAGEMENT_INBOX = 'management@example.com';

/** Feeds are capped so a dashboard left open for days does not grow without bound. */
export const FEED_LIMITS = {
  activityLog: 200,
  staffNotifications: 50,
  alerts: 50,
} as const;
