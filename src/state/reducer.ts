import { classifyTopic, TOPIC_LABEL } from '../../shared/topics';
import { pickAssignee } from '../domain/assignment';
import { AUTOMATED_MESSAGE_LABEL } from '../domain/automatedMessages';
import { hasCheckedOut } from '../domain/bookings';
import { findCleaningStaff, findProperty, propertyName } from '../domain/catalog';
import { createCleaningTask, isChecklistComplete } from '../domain/cleaning';
import { MAINTENANCE_STATUS } from '../domain/labels';
import type {
  AutomatedMessage,
  ChecklistItemState,
  CleaningTask,
  GuestMessage,
  LogEntry,
  MaintenanceTask,
  ManagementAlert,
  Message,
  StaffNotification,
  StaffNotificationKind,
  Tone,
} from '../types';
import type { DashboardAction } from './actions';
import {
  FEED_LIMITS,
  MANAGEMENT_INBOX,
  STAFF_CHANNEL,
  type DashboardState,
} from './dashboardState';

type ActionOf<Type extends DashboardAction['type']> = Extract<DashboardAction, { type: Type }>;

/* ── Draft: collects the ids and feed entries one action produces ────────── */

interface Draft {
  nextId: (prefix: string) => string;
  log: (event: string, outcome: string, tone?: Tone) => void;
  notify: (kind: StaffNotificationKind, text: string) => void;
  alert: (subject: string, body: string) => void;
  commit: (changes?: Partial<DashboardState>) => DashboardState;
}

/** Newest first, capped. Returns the same array when nothing was added so React can skip re-rendering that feed. */
function prepend<Entry>(feed: readonly Entry[], added: readonly Entry[], limit: number) {
  return added.length === 0 ? feed : [...added, ...feed].slice(0, limit);
}

function startDraft(state: DashboardState, timestamp: Date): Draft {
  let sequence = state.sequence;
  const logEntries: LogEntry[] = [];
  const notifications: StaffNotification[] = [];
  const alerts: ManagementAlert[] = [];

  const nextId = (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };

  return {
    nextId,
    log(event, outcome, tone = 'neutral') {
      logEntries.unshift({ id: nextId('log'), timestamp, event, outcome, tone });
    },
    notify(kind, text) {
      notifications.unshift({
        id: nextId('notice'),
        timestamp,
        channel: STAFF_CHANNEL,
        kind,
        text,
      });
    },
    alert(subject, body) {
      alerts.unshift({
        id: nextId('alert'),
        timestamp,
        recipient: MANAGEMENT_INBOX,
        subject,
        body,
      });
    },
    commit(changes = {}) {
      return {
        ...state,
        ...changes,
        sequence,
        activityLog: prepend(state.activityLog, logEntries, FEED_LIMITS.activityLog),
        staffNotifications: prepend(
          state.staffNotifications,
          notifications,
          FEED_LIMITS.staffNotifications,
        ),
        alerts: prepend(state.alerts, alerts, FEED_LIMITS.alerts),
      };
    },
  };
}

/* ── Small lookups and immutable updates ─────────────────────────────────── */

function findGuestMessage(state: DashboardState, messageId: string): GuestMessage | undefined {
  return state.messages.find(
    (message): message is GuestMessage => message.kind === 'guest' && message.id === messageId,
  );
}

function replaceMessage(messages: readonly Message[], updated: GuestMessage): Message[] {
  return messages.map((message) => (message.id === updated.id ? updated : message));
}

function replaceCleaningTask(
  tasks: readonly CleaningTask[],
  updated: CleaningTask,
): CleaningTask[] {
  return tasks.map((task) => (task.id === updated.id ? updated : task));
}

/* ── Clock and inbox ─────────────────────────────────────────────────────── */

/** A stay that has ended needs a turnover before the next guest. Schedule any that are missing. */
function scheduleTurnovers(state: DashboardState, { now }: ActionOf<'clock/ticked'>) {
  const alreadyScheduled = new Set(state.cleaningTasks.map((task) => task.bookingId));
  const draft = startDraft(state, now);
  const created: CleaningTask[] = [];

  for (const booking of state.bookings) {
    if (!hasCheckedOut(booking, now) || alreadyScheduled.has(booking.id)) continue;
    const property = findProperty(state.catalog, booking.propertyId);
    if (!property) continue;

    created.push(createCleaningTask(draft.nextId('cleaning'), booking, property));
    draft.log(`Turnover scheduled at ${property.name}`, 'Cleaning', 'info');
  }

  if (created.length === 0) return state;
  return draft.commit({ cleaningTasks: [...created, ...state.cleaningTasks] });
}

function checkInbox(state: DashboardState, { source, timestamp }: ActionOf<'inbox/checked'>) {
  const draft = startDraft(state, timestamp);
  const event = source === 'manual' ? 'Manual inbox check' : 'Scheduled inbox check';
  const [arrival, ...stillQueued] = state.inboundQueue;

  if (!arrival) {
    draft.log(event, 'No new messages');
    return draft.commit({ lastInboxCheck: { timestamp, source, delivered: 0 } });
  }

  const message: GuestMessage = {
    kind: 'guest',
    id: draft.nextId('msg'),
    ...arrival,
    timestamp,
    status: 'new',
    resolution: null,
    failure: null,
  };
  draft.log(event, `New message from ${arrival.guestName}`, 'info');

  return draft.commit({
    messages: [message, ...state.messages],
    inboundQueue: stillQueued,
    lastInboxCheck: { timestamp, source, delivered: 1 },
  });
}

/* ── Guest messages ──────────────────────────────────────────────────────── */

function startProcessing(
  state: DashboardState,
  { messageId }: ActionOf<'message/processingStarted'>,
) {
  const message = findGuestMessage(state, messageId);
  if (message?.status !== 'new') return state;
  return {
    ...state,
    messages: replaceMessage(state.messages, { ...message, status: 'processing', failure: null }),
  };
}

function escalate(state: DashboardState, draft: Draft, message: GuestMessage, reason: string) {
  draft.log(`Escalated message from ${message.guestName}`, 'Escalated', 'warning');
  draft.notify('escalation', `${message.guestName} needs a person to reply. ${reason}`);
  draft.alert(
    `Escalated message from ${message.guestName}`,
    `Original message:\n"${message.body}"\n\nReason: ${reason}`,
  );
  return draft.commit({
    messages: replaceMessage(state.messages, {
      ...message,
      status: 'escalated',
      resolution: { kind: 'escalation', reason },
    }),
  });
}

function resolveMessage(state: DashboardState, action: ActionOf<'message/resolved'>) {
  const message = findGuestMessage(state, action.messageId);
  // A late or duplicate result must not overwrite a message that already moved on.
  if (message?.status !== 'processing') return state;

  const draft = startDraft(state, action.timestamp);
  const { result } = action;

  if (result.kind === 'escalation') {
    return escalate(state, draft, message, result.reason);
  }

  if (result.kind === 'reply') {
    const topic = TOPIC_LABEL[classifyTopic(message.body)];
    const hasSources = result.sources.length > 0;
    const outcome = hasSources
      ? 'Replied with web sources'
      : action.usedSearch
        ? 'Replied, search found nothing'
        : 'Replied';
    draft.log(`Replied to ${message.guestName} about ${topic}`, outcome, 'success');
    return draft.commit({
      messages: replaceMessage(state.messages, {
        ...message,
        status: 'responded',
        resolution: { kind: 'reply', text: result.text, sources: result.sources },
      }),
    });
  }

  const booking = state.bookings.find((candidate) => candidate.id === message.bookingId);
  const property = booking && findProperty(state.catalog, booking.propertyId);
  if (!property) {
    // Without a booking there is no property to send anyone to, so a person has to follow up.
    return escalate(
      state,
      draft,
      message,
      `A repair was reported, but there is no booking on file to locate it: ${result.task}`,
    );
  }

  const assignee = pickAssignee({
    text: `${result.task} ${message.body}`,
    area: property.area,
    staff: state.catalog.maintenanceStaff,
    tasks: state.maintenanceTasks,
  });
  const task: MaintenanceTask = {
    id: draft.nextId('repair'),
    createdAt: action.timestamp,
    propertyId: property.id,
    description: result.task,
    status: 'todo',
    sourceMessageId: message.id,
    assigneeId: assignee?.id ?? null,
  };
  const assignedTo = assignee?.name ?? 'Unassigned';

  draft.log(
    assignee
      ? `Assigned repair at ${property.name} to ${assignee.name}`
      : `Created unassigned repair at ${property.name}`,
    'Task created',
    'warning',
  );
  draft.notify('maintenance', `${assignedTo}: ${result.task} (${property.name})`);
  draft.alert(
    `Maintenance task created at ${property.name}`,
    `Guest: ${message.guestName}\nMessage: "${message.body}"\n\nTask: ${result.task}\nAssigned to: ${assignedTo}`,
  );

  return draft.commit({
    maintenanceTasks: [task, ...state.maintenanceTasks],
    messages: replaceMessage(state.messages, {
      ...message,
      status: 'escalated',
      resolution: { kind: 'maintenance', task: result.task, taskId: task.id },
    }),
  });
}

function failMessage(
  state: DashboardState,
  { messageId, reason, timestamp }: ActionOf<'message/failed'>,
) {
  const message = findGuestMessage(state, messageId);
  if (message?.status !== 'processing') return state;

  const draft = startDraft(state, timestamp);
  draft.log(`Could not answer ${message.guestName}`, 'Failed', 'danger');
  return draft.commit({
    messages: replaceMessage(state.messages, { ...message, status: 'failed', failure: reason }),
  });
}

function retryMessage(state: DashboardState, { messageId }: ActionOf<'message/retryRequested'>) {
  const message = findGuestMessage(state, messageId);
  if (message?.status !== 'failed') return state;
  return {
    ...state,
    messages: replaceMessage(state.messages, { ...message, status: 'new', failure: null }),
  };
}

function recordAutomatedMessage(state: DashboardState, action: ActionOf<'automatedMessage/sent'>) {
  const booking = state.bookings.find((candidate) => candidate.id === action.bookingId);
  // Each scheduled message goes out once per booking, even if two sends race.
  if (!booking || booking.automatedMessagesSent[action.trigger]) return state;

  const draft = startDraft(state, action.timestamp);
  const message: AutomatedMessage = {
    kind: 'automated',
    id: draft.nextId('msg'),
    guestName: booking.guestName,
    bookingId: booking.id,
    trigger: action.trigger,
    body: action.body,
    timestamp: action.timestamp,
  };
  draft.log(
    `Sent ${AUTOMATED_MESSAGE_LABEL[action.trigger].toLowerCase()} message to ${booking.guestName}`,
    action.origin === 'assistant' ? 'Automated' : 'Automated (template)',
    'info',
  );

  return draft.commit({
    messages: [message, ...state.messages],
    bookings: state.bookings.map((candidate) =>
      candidate.id === booking.id
        ? {
            ...candidate,
            automatedMessagesSent: { ...candidate.automatedMessagesSent, [action.trigger]: true },
          }
        : candidate,
    ),
  });
}

/* ── Cleaning ────────────────────────────────────────────────────────────── */

function changeCleaningStatus(
  state: DashboardState,
  { taskId, status, timestamp }: ActionOf<'cleaning/statusChanged'>,
) {
  const task = state.cleaningTasks.find((candidate) => candidate.id === taskId);
  if (!task) return state;

  const transition = `${task.status}>${status}`;
  const verbs: Record<string, { verb: string; tone: Tone }> = {
    'pending>in_progress': { verb: 'started', tone: 'info' },
    'in_progress>completed': { verb: 'completed', tone: 'success' },
    'completed>in_progress': { verb: 'reopened', tone: 'warning' },
  };
  const change = verbs[transition];
  if (!change) return state;
  if (status === 'completed' && !isChecklistComplete(task)) return state;

  const draft = startDraft(state, timestamp);
  draft.log(
    `Turnover at ${propertyName(state.catalog, task.propertyId)} ${change.verb}`,
    'Cleaning',
    change.tone,
  );
  return draft.commit({
    cleaningTasks: replaceCleaningTask(state.cleaningTasks, { ...task, status }),
  });
}

function updateChecklistItem(
  state: DashboardState,
  task: CleaningTask,
  itemId: string,
  change: Partial<ChecklistItemState>,
  timestamp: Date,
) {
  const checklist = task.checklist.map((item) =>
    item.itemId === itemId ? { ...item, ...change } : item,
  );
  // Ticking the first item is how most cleaners start, so it starts the turnover too.
  const startsTask = task.status === 'pending' && change.done === true;
  const updated: CleaningTask = {
    ...task,
    checklist,
    status: startsTask ? 'in_progress' : task.status,
  };

  const draft = startDraft(state, timestamp);
  if (startsTask) {
    draft.log(
      `Turnover at ${propertyName(state.catalog, task.propertyId)} started`,
      'Cleaning',
      'info',
    );
  }
  return draft.commit({ cleaningTasks: replaceCleaningTask(state.cleaningTasks, updated) });
}

function findEditableItem(state: DashboardState, taskId: string, itemId: string) {
  const task = state.cleaningTasks.find((candidate) => candidate.id === taskId);
  if (!task || task.status === 'completed') return null;
  const item = task.checklist.find((candidate) => candidate.itemId === itemId);
  if (!item) return null;
  const template = findProperty(state.catalog, task.propertyId)?.checklist.find(
    (candidate) => candidate.id === itemId,
  );
  return { task, item, photoRequired: template?.photoRequired ?? false };
}

function toggleChecklistItem(
  state: DashboardState,
  { taskId, itemId, done, timestamp }: ActionOf<'cleaning/itemToggled'>,
) {
  const found = findEditableItem(state, taskId, itemId);
  if (!found || found.item.done === done) return state;
  // The photo is the proof the item was done, so it cannot be ticked without one.
  if (done && found.photoRequired && !found.item.photoUrl) return state;
  return updateChecklistItem(state, found.task, itemId, { done }, timestamp);
}

function attachChecklistPhoto(
  state: DashboardState,
  { taskId, itemId, photoUrl, timestamp }: ActionOf<'cleaning/photoAttached'>,
) {
  const found = findEditableItem(state, taskId, itemId);
  if (!found) return state;
  return updateChecklistItem(state, found.task, itemId, { photoUrl, done: true }, timestamp);
}

/* ── Maintenance, staff, reviews ─────────────────────────────────────────── */

function changeMaintenanceStatus(
  state: DashboardState,
  { taskId, status, timestamp }: ActionOf<'maintenance/statusChanged'>,
) {
  const task = state.maintenanceTasks.find((candidate) => candidate.id === taskId);
  if (!task || task.status === status) return state;

  const { label, tone } = MAINTENANCE_STATUS[status];
  const draft = startDraft(state, timestamp);
  draft.log(
    `Repair at ${propertyName(state.catalog, task.propertyId)} marked ${label.toLowerCase()}`,
    'Maintenance',
    tone,
  );
  return draft.commit({
    maintenanceTasks: state.maintenanceTasks.map((candidate) =>
      candidate.id === taskId ? { ...candidate, status } : candidate,
    ),
  });
}

function toggleClock(
  state: DashboardState,
  { staffId, timestamp }: ActionOf<'staff/clockToggled'>,
) {
  const member = findCleaningStaff(state.catalog, staffId);
  if (!member) return state;

  const draft = startDraft(state, timestamp);
  const { [staffId]: since, ...others } = state.clockedIn;
  if (since) {
    draft.log(`${member.name} clocked out`, 'Time clock');
    return draft.commit({ clockedIn: others });
  }
  draft.log(`${member.name} clocked in`, 'Time clock');
  return draft.commit({ clockedIn: { ...state.clockedIn, [staffId]: timestamp } });
}

function addCrewNote(state: DashboardState, { text, timestamp }: ActionOf<'crewNote/added'>) {
  const trimmed = text.trim();
  if (!trimmed) return state;

  const draft = startDraft(state, timestamp);
  const note = { id: draft.nextId('crew-note'), text: trimmed, timestamp };
  draft.log('Note left for the cleaning crew', 'Crew note');
  return draft.commit({ crewNotes: [note, ...state.crewNotes] });
}

function reportIncident(state: DashboardState, action: ActionOf<'incident/reported'>) {
  const member = findCleaningStaff(state.catalog, action.staffId);
  const property = findProperty(state.catalog, action.propertyId);
  const description = action.description.trim();
  if (!member || !property || !description) return state;

  const draft = startDraft(state, action.timestamp);
  const incident = {
    id: draft.nextId('incident'),
    staffId: member.id,
    propertyId: property.id,
    description,
    timestamp: action.timestamp,
  };
  draft.log(`Incident reported at ${property.name}`, `By ${member.name}`, 'warning');
  draft.notify('incident', `${member.name} at ${property.name}: ${description}`);
  return draft.commit({ incidents: [incident, ...state.incidents] });
}

function addReview(state: DashboardState, action: ActionOf<'review/added'>) {
  const booking = state.bookings.find((candidate) => candidate.id === action.bookingId);
  const comment = action.comment.trim();
  const alreadyReviewed = state.reviews.some((review) => review.bookingId === action.bookingId);
  if (!booking || !comment || alreadyReviewed || !hasCheckedOut(booking, action.timestamp)) {
    return state;
  }

  const draft = startDraft(state, action.timestamp);
  const review = {
    id: draft.nextId('review'),
    bookingId: booking.id,
    guestName: booking.guestName,
    propertyId: booking.propertyId,
    rating: action.rating,
    comment,
    timestamp: action.timestamp,
  };
  draft.log(`Added review for ${booking.guestName}`, `${action.rating} of 5 stars`, 'success');
  return draft.commit({ reviews: [review, ...state.reviews] });
}

/* ── Reducer ─────────────────────────────────────────────────────────────── */

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'clock/ticked':
      return scheduleTurnovers(state, action);
    case 'inbox/checked':
      return checkInbox(state, action);
    case 'message/processingStarted':
      return startProcessing(state, action);
    case 'message/resolved':
      return resolveMessage(state, action);
    case 'message/failed':
      return failMessage(state, action);
    case 'message/retryRequested':
      return retryMessage(state, action);
    case 'automatedMessage/sent':
      return recordAutomatedMessage(state, action);
    case 'cleaning/statusChanged':
      return changeCleaningStatus(state, action);
    case 'cleaning/itemToggled':
      return toggleChecklistItem(state, action);
    case 'cleaning/photoAttached':
      return attachChecklistPhoto(state, action);
    case 'maintenance/statusChanged':
      return changeMaintenanceStatus(state, action);
    case 'staff/clockToggled':
      return toggleClock(state, action);
    case 'crewNote/added':
      return addCrewNote(state, action);
    case 'incident/reported':
      return reportIncident(state, action);
    case 'review/added':
      return addReview(state, action);
    default:
      action satisfies never;
      return state;
  }
}
