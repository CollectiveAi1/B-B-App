import type { CleaningStatus, MaintenanceStatus, MessageStatus, StatFilter, Tone } from '../types';

interface StatusDisplay {
  label: string;
  tone: Tone;
}

export const MESSAGE_STATUS: Readonly<Record<MessageStatus, StatusDisplay>> = {
  new: { label: 'New', tone: 'info' },
  processing: { label: 'Processing', tone: 'neutral' },
  responded: { label: 'Responded', tone: 'success' },
  escalated: { label: 'Escalated', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
};

export const CLEANING_STATUS: Readonly<Record<CleaningStatus, StatusDisplay>> = {
  pending: { label: 'Pending', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
};

export const MAINTENANCE_STATUS: Readonly<Record<MaintenanceStatus, StatusDisplay>> = {
  todo: { label: 'To do', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
};

export const MAINTENANCE_STATUS_ORDER: readonly MaintenanceStatus[] = [
  'todo',
  'in_progress',
  'completed',
];

export const STAT_FILTER_LABEL: Readonly<Record<StatFilter, string>> = {
  activeStays: 'Active stays',
  pendingCleanings: 'Pending cleanings',
  upcomingCheckIns: 'Upcoming check-ins',
  awaitingReply: 'Awaiting reply',
};
