export type StatFilter = 'activeStays' | 'pendingCleanings' | 'upcomingCheckIns' | 'newMessages' | null;

export enum MessageStatus {
  NEW = 'New',
  PROCESSING = 'Processing',
  RESPONDED = 'Responded',
  ESCALATED = 'Escalated',
  FAILED = 'Failed'
}

export interface Message {
  id: string;
  guestName: string;
  platform: 'Airbnb';
  content: string;
  timestamp: Date;
  status: MessageStatus;
  aiResponse?: string;
  groundingSources?: { title: string; uri: string }[];
  author: 'guest' | 'system';
}

export interface Booking {
  id: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  property: string;
  automatedMessagesSent?: {
    preArrival?: boolean;
    midStay?: boolean;
    preDeparture?: boolean;
  };
}

export interface LogEntry {
  id:string;
  timestamp: Date;
  message: string;
  outcome: string;
}

export interface SlackNotification {
  id: string;
  timestamp: Date;
  channel: '#airbnb-staff';
  message: string;
}

export interface Alert {
  id: string;
  timestamp: Date;
  recipient: 'management@airbnb-assist.com';
  subject: string;
  body: string;
}

// Cleaning Crew Types
export enum CleaningStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
}

export interface CleaningStaff {
  id: string;
  name: string;
}

export interface ClockEvent {
  id: string;
  staffId: string;
  staffName: string;
  type: 'in' | 'out';
  timestamp: Date;
}

export interface ChecklistItem {
  id: string;
  text: string;
  photoRequired?: boolean;
}

export interface ChecklistItemStatus {
  itemId: string;
  completed: boolean;
  photoUrl?: string;
}

export interface CleaningTask {
  id: string;
  bookingId: string;
  property: string;
  guestName: string;
  checkOutDate: Date;
  status: CleaningStatus;
  assignedTo?: string; // staffId
  checklist: ChecklistItemStatus[];
}

export interface Note {
  id: string;
  content: string;
  timestamp: Date;
}

export interface IncidentReport {
  id: string;
  staffName: string;
  content: string;
  timestamp: Date;
  property: string;
}

// AI-Generated Task Types
export enum TaskStatus {
    TO_DO = 'To Do',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
}

export interface MaintenanceStaff {
  id: string;
  name: string;
  specializations: string[];
  location?: string;
}

export interface MaintenanceTask {
    id: string;
    timestamp: Date;
    property: string;
    description: string;
    status: TaskStatus;
    sourceMessageId: string;
    assignedToStaffId?: string;
    assignedToStaffName?: string;
}

export interface GuestReview {
  id: string;
  guestName: string;
  property: string;
  rating: number; // 1 to 5
  comment: string;
  timestamp: Date;
}