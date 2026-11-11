import { describe, expect, it } from 'vitest';
import type { AssistantResult } from '../../shared/assistant';
import { guestMessage, minutesAfter, NOW, run, seedState } from '../test/fixtures';
import type { DashboardAction } from './actions';
import { FEED_LIMITS, MANAGEMENT_INBOX, STAFF_CHANNEL } from './dashboardState';
import { dashboardReducer } from './reducer';

const timestamp = minutesAfter(1);

const start = (messageId: string): DashboardAction => ({
  type: 'message/processingStarted',
  messageId,
});
const resolve = (
  messageId: string,
  result: AssistantResult,
  usedSearch = false,
): DashboardAction => ({
  type: 'message/resolved',
  messageId,
  result,
  usedSearch,
  timestamp,
});

describe('guest messages', () => {
  it('moves a new message to processing, then to responded with the reply', () => {
    const processing = run(seedState(), start('msg-seed-1'));
    expect(guestMessage(processing, 'msg-seed-1').status).toBe('processing');

    const state = run(
      processing,
      resolve('msg-seed-1', { kind: 'reply', text: 'After 3 PM.', sources: [] }),
    );
    expect(guestMessage(state, 'msg-seed-1')).toMatchObject({
      status: 'responded',
      resolution: { kind: 'reply', text: 'After 3 PM.' },
    });
    expect(state.activityLog[0]).toMatchObject({
      event: 'Replied to Alice Johnson about check-in',
      outcome: 'Replied',
      tone: 'success',
    });
  });

  it('records whether a search-backed reply found sources', () => {
    const withSources = run(
      seedState(),
      start('msg-seed-1'),
      resolve(
        'msg-seed-1',
        { kind: 'reply', text: 'x', sources: [{ title: 't', url: 'https://e.com' }] },
        true,
      ),
    );
    expect(withSources.activityLog[0]?.outcome).toBe('Replied with web sources');

    const without = run(
      seedState(),
      start('msg-seed-1'),
      resolve('msg-seed-1', { kind: 'reply', text: 'x', sources: [] }, true),
    );
    expect(without.activityLog[0]?.outcome).toBe('Replied, search found nothing');
  });

  it('creates and assigns a repair, then tells staff and management', () => {
    const state = run(
      seedState(),
      start('msg-seed-4'),
      resolve('msg-seed-4', {
        kind: 'maintenance',
        task: 'Fix slow water leak under the kitchen sink.',
      }),
    );
    const [task] = state.maintenanceTasks;

    expect(task).toMatchObject({
      propertyId: 'lakeside-cabin',
      description: 'Fix slow water leak under the kitchen sink.',
      status: 'todo',
      sourceMessageId: 'msg-seed-4',
      assigneeId: 'maint-john',
    });
    expect(guestMessage(state, 'msg-seed-4')).toMatchObject({
      status: 'escalated',
      resolution: { kind: 'maintenance', taskId: task?.id },
    });
    expect(state.staffNotifications[0]).toMatchObject({
      channel: STAFF_CHANNEL,
      kind: 'maintenance',
    });
    expect(state.alerts[0]).toMatchObject({
      recipient: MANAGEMENT_INBOX,
      subject: 'Maintenance task created at Lakeside Cabin',
    });
    expect(state.alerts[0]?.body).toContain('Assigned to: John Piper');
  });

  it('escalates a repair from a guest with no booking instead of losing it', () => {
    const state = run(
      seedState(),
      start('msg-seed-2'),
      resolve('msg-seed-2', { kind: 'maintenance', task: 'Fix the gate.' }),
    );
    expect(state.maintenanceTasks).toHaveLength(0);
    const message = guestMessage(state, 'msg-seed-2');
    expect(message.status).toBe('escalated');
    expect(message.resolution).toMatchObject({ kind: 'escalation' });
    expect(message.resolution?.kind === 'escalation' && message.resolution.reason).toContain(
      'Fix the gate.',
    );
  });

  it('escalates to staff and management', () => {
    const state = run(
      seedState(),
      start('msg-seed-2'),
      resolve('msg-seed-2', { kind: 'escalation', reason: 'Pet policy needs the host.' }),
    );
    expect(guestMessage(state, 'msg-seed-2').status).toBe('escalated');
    expect(state.staffNotifications[0]?.kind).toBe('escalation');
    expect(state.alerts[0]?.subject).toBe('Escalated message from Bob Williams');
    expect(state.activityLog[0]).toMatchObject({ outcome: 'Escalated', tone: 'warning' });
  });

  it('ignores a result for a message that is not being processed', () => {
    const state = seedState();
    const reply: AssistantResult = { kind: 'reply', text: 'late', sources: [] };
    expect(run(state, resolve('msg-seed-1', reply))).toBe(state);
    expect(run(state, resolve('no-such-message', reply))).toBe(state);

    const answered = run(state, start('msg-seed-1'), resolve('msg-seed-1', reply));
    expect(
      run(answered, resolve('msg-seed-1', { kind: 'reply', text: 'duplicate', sources: [] })),
    ).toBe(answered);
  });

  it('marks a failure, keeps the reason, and lets the operator retry', () => {
    const failed = run(seedState(), start('msg-seed-1'), {
      type: 'message/failed',
      messageId: 'msg-seed-1',
      reason: 'The model took too long to answer.',
      timestamp,
    });
    expect(guestMessage(failed, 'msg-seed-1')).toMatchObject({
      status: 'failed',
      failure: 'The model took too long to answer.',
    });
    expect(failed.activityLog[0]).toMatchObject({ outcome: 'Failed', tone: 'danger' });

    const retried = run(failed, { type: 'message/retryRequested', messageId: 'msg-seed-1' });
    expect(guestMessage(retried, 'msg-seed-1')).toMatchObject({ status: 'new', failure: null });
  });

  it('only retries messages that failed', () => {
    const state = seedState();
    expect(run(state, { type: 'message/retryRequested', messageId: 'msg-seed-1' })).toBe(state);
  });
});

describe('scheduled messages', () => {
  const sent: DashboardAction = {
    type: 'automatedMessage/sent',
    bookingId: 'booking-alice',
    trigger: 'preArrival',
    body: 'See you tomorrow!',
    origin: 'assistant',
    timestamp,
  };

  it('adds the message and marks the booking', () => {
    const state = run(seedState(), sent);
    expect(state.messages[0]).toMatchObject({
      kind: 'automated',
      guestName: 'Alice Johnson',
      trigger: 'preArrival',
      body: 'See you tomorrow!',
    });
    expect(
      state.bookings.find((b) => b.id === 'booking-alice')?.automatedMessagesSent.preArrival,
    ).toBe(true);
    expect(state.activityLog[0]?.outcome).toBe('Automated');
  });

  it('sends each message once even when two sends race', () => {
    const once = run(seedState(), sent);
    const twice = run(once, sent);
    expect(twice).toBe(once);
    expect(twice.messages.filter((m) => m.kind === 'automated')).toHaveLength(1);
  });

  it('labels a message that went out from the template', () => {
    const state = run(seedState(), { ...sent, origin: 'template' });
    expect(state.activityLog[0]?.outcome).toBe('Automated (template)');
  });
});

describe('inbox', () => {
  const check: DashboardAction = { type: 'inbox/checked', source: 'manual', timestamp };

  it('delivers the next queued message as new and leaves earlier messages untouched', () => {
    const before = run(
      seedState(),
      start('msg-seed-1'),
      resolve('msg-seed-1', { kind: 'reply', text: 'x', sources: [] }),
    );
    const after = run(before, check);

    expect(after.messages).toHaveLength(before.messages.length + 1);
    expect(after.messages[0]).toMatchObject({
      kind: 'guest',
      guestName: 'Eva Green',
      status: 'new',
      timestamp,
    });
    expect(after.inboundQueue).toHaveLength(before.inboundQueue.length - 1);
    expect(after.lastInboxCheck).toEqual({ timestamp, source: 'manual', delivered: 1 });
    // The already-answered message keeps its id and status: no re-processing.
    expect(guestMessage(after, 'msg-seed-1').status).toBe('responded');
  });

  it('reports an empty inbox once the queue runs out', () => {
    let state = seedState();
    const queued = state.inboundQueue.length;
    for (let count = 0; count < queued; count += 1) state = dashboardReducer(state, check);

    const empty = dashboardReducer(state, { ...check, source: 'scheduled' });
    expect(empty.messages).toHaveLength(state.messages.length);
    expect(empty.lastInboxCheck).toMatchObject({ source: 'scheduled', delivered: 0 });
    expect(empty.activityLog[0]).toMatchObject({
      event: 'Scheduled inbox check',
      outcome: 'No new messages',
    });
  });
});

describe('cleaning', () => {
  const taskId = 'cleaning-booking-bruce';
  const task = (state: ReturnType<typeof seedState>) => {
    const found = state.cleaningTasks.find((candidate) => candidate.id === taskId);
    if (!found) throw new Error('missing seed task');
    return found;
  };
  const toggle = (itemId: string, done = true): DashboardAction => ({
    type: 'cleaning/itemToggled',
    taskId,
    itemId,
    done,
    timestamp,
  });
  const photo = (itemId: string): DashboardAction => ({
    type: 'cleaning/photoAttached',
    taskId,
    itemId,
    photoUrl: `blob:${itemId}`,
    timestamp,
  });
  const setStatus = (status: 'pending' | 'in_progress' | 'completed'): DashboardAction => ({
    type: 'cleaning/statusChanged',
    taskId,
    status,
    timestamp,
  });

  it('starts the turnover when the first item is ticked', () => {
    const state = run(seedState(), toggle('ph2'));
    expect(task(state).status).toBe('in_progress');
    expect(task(state).checklist.find((item) => item.itemId === 'ph2')?.done).toBe(true);
    expect(state.activityLog[0]?.event).toBe('Turnover at The Penthouse started');
  });

  it('will not tick a photo-required item until a photo is attached', () => {
    const blocked = run(seedState(), toggle('ph1'));
    expect(task(blocked).checklist.find((item) => item.itemId === 'ph1')?.done).toBe(false);

    const attached = run(seedState(), photo('ph1'));
    expect(task(attached).checklist.find((item) => item.itemId === 'ph1')).toEqual({
      itemId: 'ph1',
      done: true,
      photoUrl: 'blob:ph1',
    });
  });

  it('keeps the photo when an item is unticked, so it can be ticked again', () => {
    const state = run(seedState(), photo('ph1'), toggle('ph1', false), toggle('ph1'));
    expect(task(state).checklist.find((item) => item.itemId === 'ph1')).toMatchObject({
      done: true,
      photoUrl: 'blob:ph1',
    });
  });

  it('refuses to complete a turnover with an unfinished checklist', () => {
    const started = run(seedState(), setStatus('in_progress'));
    expect(run(started, setStatus('completed'))).toBe(started);
  });

  it('completes once every item is done, locks the checklist, and can be reopened', () => {
    const everyItem = task(seedState()).checklist.map((item) =>
      ['ph1', 'ph6'].includes(item.itemId) ? photo(item.itemId) : toggle(item.itemId),
    );
    const completed = run(seedState(), ...everyItem, setStatus('completed'));
    expect(task(completed).status).toBe('completed');
    expect(completed.activityLog[0]).toMatchObject({
      event: 'Turnover at The Penthouse completed',
      tone: 'success',
    });

    expect(run(completed, toggle('ph2', false))).toBe(completed);
    expect(task(run(completed, setStatus('in_progress'))).status).toBe('in_progress');
  });

  it('rejects status jumps that skip a step', () => {
    const state = seedState();
    expect(run(state, setStatus('completed'))).toBe(state);
    expect(run(state, setStatus('pending'))).toBe(state);
  });

  it('schedules a turnover when a stay ends, once', () => {
    const afterCharlieLeaves = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000);
    const state = run(seedState(), { type: 'clock/ticked', now: afterCharlieLeaves });
    const added = state.cleaningTasks.filter(
      (t) => !seedState().cleaningTasks.some((s) => s.id === t.id),
    );

    expect(added.map((t) => t.bookingId).toSorted()).toEqual(['booking-charlie', 'booking-diana']);
    expect(added.every((t) => t.status === 'pending')).toBe(true);
    expect(run(state, { type: 'clock/ticked', now: afterCharlieLeaves })).toBe(state);
  });

  it('does nothing on a tick when no stay has ended', () => {
    const state = seedState();
    expect(run(state, { type: 'clock/ticked', now: NOW })).toBe(state);
  });
});

describe('maintenance, staff, and reviews', () => {
  it('logs a repair status change and ignores a no-op', () => {
    const withTask = run(
      seedState(),
      start('msg-seed-4'),
      resolve('msg-seed-4', { kind: 'maintenance', task: 'Fix the leak.' }),
    );
    const taskId = withTask.maintenanceTasks[0]?.id ?? '';
    const change = (status: 'todo' | 'in_progress' | 'completed'): DashboardAction => ({
      type: 'maintenance/statusChanged',
      taskId,
      status,
      timestamp,
    });

    const done = run(withTask, change('completed'));
    expect(done.maintenanceTasks[0]?.status).toBe('completed');
    expect(done.activityLog[0]?.event).toBe('Repair at Lakeside Cabin marked completed');
    expect(run(withTask, change('todo'))).toBe(withTask);
  });

  it('clocks staff in and out', () => {
    const toggle: DashboardAction = {
      type: 'staff/clockToggled',
      staffId: 'cleaner-maria',
      timestamp,
    };
    const clockedIn = run(seedState(), toggle);
    expect(clockedIn.clockedIn).toEqual({ 'cleaner-maria': timestamp });
    expect(clockedIn.activityLog[0]?.event).toBe('Maria Garcia clocked in');

    const clockedOut = run(clockedIn, toggle);
    expect(clockedOut.clockedIn).toEqual({});
    expect(clockedOut.activityLog[0]?.event).toBe('Maria Garcia clocked out');
  });

  it('ignores a clock event for someone who is not on the staff list', () => {
    const state = seedState();
    expect(run(state, { type: 'staff/clockToggled', staffId: 'stranger', timestamp })).toBe(state);
  });

  it('adds a trimmed crew note and ignores a blank one', () => {
    const state = run(seedState(), { type: 'crewNote/added', text: '  Extra towels  ', timestamp });
    expect(state.crewNotes[0]).toMatchObject({ text: 'Extra towels' });
    expect(run(state, { type: 'crewNote/added', text: '   ', timestamp })).toBe(state);
  });

  it('records an incident and notifies the staff channel', () => {
    const state = run(seedState(), {
      type: 'incident/reported',
      staffId: 'cleaner-david',
      propertyId: 'penthouse',
      description: 'Broken glass on the balcony',
      timestamp,
    });
    expect(state.incidents[0]).toMatchObject({ staffId: 'cleaner-david', propertyId: 'penthouse' });
    expect(state.staffNotifications[0]).toMatchObject({
      kind: 'incident',
      text: 'David Chen at The Penthouse: Broken glass on the balcony',
    });
  });

  it('adds a review for a finished stay, once', () => {
    const add: DashboardAction = {
      type: 'review/added',
      bookingId: 'booking-marcus',
      rating: 4,
      comment: ' Lovely cabin. ',
      timestamp,
    };
    const state = run(seedState(), add);
    expect(state.reviews[0]).toMatchObject({
      bookingId: 'booking-marcus',
      guestName: 'Marcus Lee',
      propertyId: 'lakeside-cabin',
      rating: 4,
      comment: 'Lovely cabin.',
    });
    expect(run(state, add)).toBe(state);
  });

  it('rejects a review for a stay that has not ended or does not exist', () => {
    const state = seedState();
    const review = { type: 'review/added', rating: 5, comment: 'Great', timestamp } as const;
    expect(run(state, { ...review, bookingId: 'booking-charlie' })).toBe(state);
    expect(run(state, { ...review, bookingId: 'nope' })).toBe(state);
    expect(run(state, { ...review, bookingId: 'booking-marcus', comment: '  ' })).toBe(state);
  });
});

describe('ids and feeds', () => {
  it('gives every record a unique id, even within one action', () => {
    const state = run(
      seedState(),
      start('msg-seed-4'),
      resolve('msg-seed-4', { kind: 'maintenance', task: 'Fix the leak.' }),
      start('msg-seed-3'),
      resolve('msg-seed-3', { kind: 'maintenance', task: 'Fix the Wi-Fi.' }),
    );
    const ids = [
      ...state.activityLog,
      ...state.staffNotifications,
      ...state.alerts,
      ...state.maintenanceTasks,
      ...state.messages,
    ].map((record) => record.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is pure: the same action on the same state gives the same result', () => {
    const state = run(seedState(), start('msg-seed-4'));
    const action = resolve('msg-seed-4', { kind: 'maintenance', task: 'Fix the leak.' });
    expect(dashboardReducer(state, action)).toEqual(dashboardReducer(state, action));
    expect(state.maintenanceTasks).toHaveLength(0);
  });

  it('caps the activity log', () => {
    let state = seedState();
    for (let count = 0; count < FEED_LIMITS.activityLog + 25; count += 1) {
      state = dashboardReducer(state, { type: 'crewNote/added', text: `Note ${count}`, timestamp });
    }
    expect(state.activityLog).toHaveLength(FEED_LIMITS.activityLog);
  });
});
