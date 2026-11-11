import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReplyRequest } from '../../shared/assistant';
import { dueAutomatedMessages, type DueMessage } from '../domain/automatedMessages';
import { findProperty } from '../domain/catalog';
import {
  AssistantError,
  type AssistantClient,
  type AssistantMode,
} from '../services/assistantClient';
import type { DashboardAction } from '../state/actions';
import type { DashboardState } from '../state/dashboardState';
import { dashboardReducer } from '../state/reducer';
import type {
  Booking,
  Catalog,
  CleaningStatus,
  GuestMessage,
  InboxCheckSource,
  MaintenanceStatus,
  Rating,
} from '../types';
import { useNow } from './useNow';

/** Replies in flight at once. Two keeps the inbox moving without bursting the model's rate limit. */
const MAX_CONCURRENT_REPLIES = 2;
/** Stand-in for the network round trip of a real inbox fetch. */
const INBOX_LATENCY_MS = 1_200;
const INBOX_POLL_INTERVAL_MS = 5 * 60 * 1000;

const ISO_DATE = 'yyyy-MM-dd';

function toReplyInput(
  message: GuestMessage,
  bookings: readonly Booking[],
  catalog: Catalog,
): Omit<ReplyRequest, 'task'> {
  const booking = bookings.find((candidate) => candidate.id === message.bookingId);
  const property = booking && findProperty(catalog, booking.propertyId);
  return {
    guestName: message.guestName,
    message: message.body,
    stay:
      booking && property
        ? {
            propertyName: property.name,
            checkIn: format(booking.checkIn, ISO_DATE),
            checkOut: format(booking.checkOut, ISO_DATE),
          }
        : null,
  };
}

export interface DashboardCommands {
  retryMessage: (messageId: string) => void;
  setCleaningStatus: (taskId: string, status: CleaningStatus) => void;
  toggleChecklistItem: (taskId: string, itemId: string, done: boolean) => void;
  attachChecklistPhoto: (taskId: string, itemId: string, photoUrl: string) => void;
  setMaintenanceStatus: (taskId: string, status: MaintenanceStatus) => void;
  toggleClock: (staffId: string) => void;
  addCrewNote: (text: string) => void;
  reportIncident: (report: { staffId: string; propertyId: string; description: string }) => void;
  addReview: (review: { bookingId: string; rating: Rating; comment: string }) => void;
}

export interface Dashboard {
  state: DashboardState;
  now: Date;
  /** 'checking' until the first status call returns. Nothing is sent to the assistant before then. */
  assistantMode: AssistantMode | 'checking';
  isCheckingInbox: boolean;
  checkInbox: () => void;
  commands: DashboardCommands;
}

/**
 * Owns dashboard state and the three background jobs around it: answering new
 * guest messages, sending scheduled messages, and polling the inbox.
 *
 * State changes go through the reducer. The effects here only start work and
 * report results back as actions, so each job can be reasoned about on its own.
 */
export function useDashboard(
  client: AssistantClient,
  createInitialState: (now: Date) => DashboardState,
): Dashboard {
  const [state, dispatch] = useReducer(dashboardReducer, undefined, () =>
    createInitialState(new Date()),
  );
  const now = useNow();
  const [assistantMode, setAssistantMode] = useState<AssistantMode | 'checking'>('checking');
  const [isCheckingInbox, setIsCheckingInbox] = useState(false);

  useEffect(() => {
    let subscribed = true;
    const detect = async () => {
      const mode = await client.resolveMode();
      if (subscribed) setAssistantMode(mode);
    };
    void detect();
    return () => {
      subscribed = false;
    };
  }, [client]);

  useEffect(() => {
    dispatch({ type: 'clock/ticked', now });
  }, [now]);

  /* ── Answer guest messages ───────────────────────────────────────────── */

  // Ids with a request in flight. A ref, not state: it must survive re-renders
  // and React's double-invoked effects in development without triggering either.
  const repliesInFlight = useRef(new Set<string>());

  useEffect(() => {
    if (assistantMode === 'checking') return;
    const freeSlots = MAX_CONCURRENT_REPLIES - repliesInFlight.current.size;
    if (freeSlots <= 0) return;

    // 'processing' with no request in flight means a request was lost, so it is
    // picked up again here instead of sitting on "Processing" forever.
    const waiting = state.messages
      .filter(
        (message): message is GuestMessage =>
          message.kind === 'guest' &&
          (message.status === 'new' || message.status === 'processing') &&
          !repliesInFlight.current.has(message.id),
      )
      .toSorted((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(0, freeSlots);

    const answer = async (message: GuestMessage) => {
      let outcome: DashboardAction;
      try {
        const { result, usedSearch } = await client.reply(
          toReplyInput(message, state.bookings, state.catalog),
        );
        outcome = {
          type: 'message/resolved',
          messageId: message.id,
          result,
          usedSearch,
          timestamp: new Date(),
        };
      } catch (error) {
        outcome = {
          type: 'message/failed',
          messageId: message.id,
          reason:
            error instanceof AssistantError
              ? error.message
              : 'The assistant could not process this message.',
          timestamp: new Date(),
        };
      }
      // Free the slot before dispatching, so the render this action causes sees it as available.
      repliesInFlight.current.delete(message.id);
      dispatch(outcome);
    };

    for (const message of waiting) {
      repliesInFlight.current.add(message.id);
      dispatch({ type: 'message/processingStarted', messageId: message.id });
      void answer(message);
    }
  }, [assistantMode, client, state.messages, state.bookings, state.catalog]);

  /* ── Send scheduled messages ─────────────────────────────────────────── */

  const scheduledInFlight = useRef(new Set<string>());

  useEffect(() => {
    if (assistantMode === 'checking') return;

    const send = async ({ booking, trigger }: DueMessage, propertyName: string, key: string) => {
      try {
        const { text, origin } = await client.scheduledMessage({
          kind: trigger,
          guestName: booking.guestName,
          propertyName,
        });
        scheduledInFlight.current.delete(key);
        dispatch({
          type: 'automatedMessage/sent',
          bookingId: booking.id,
          trigger,
          body: text,
          origin,
          timestamp: new Date(),
        });
      } catch {
        // The booking stays unmarked, so the next clock tick tries again.
        scheduledInFlight.current.delete(key);
      }
    };

    for (const due of dueAutomatedMessages(state.bookings, now)) {
      const key = `${due.booking.id}:${due.trigger}`;
      const property = findProperty(state.catalog, due.booking.propertyId);
      if (!property || scheduledInFlight.current.has(key)) continue;
      scheduledInFlight.current.add(key);
      void send(due, property.name, key);
    }
  }, [assistantMode, client, now, state.bookings, state.catalog]);

  /* ── Poll the inbox ──────────────────────────────────────────────────── */

  const inboxTimer = useRef<number | null>(null);

  const runInboxCheck = useCallback((source: InboxCheckSource) => {
    if (inboxTimer.current !== null) return;
    setIsCheckingInbox(true);
    inboxTimer.current = window.setTimeout(() => {
      inboxTimer.current = null;
      setIsCheckingInbox(false);
      dispatch({ type: 'inbox/checked', source, timestamp: new Date() });
    }, INBOX_LATENCY_MS);
  }, []);

  useEffect(() => {
    const poll = window.setInterval(() => runInboxCheck('scheduled'), INBOX_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(poll);
      if (inboxTimer.current !== null) {
        window.clearTimeout(inboxTimer.current);
        inboxTimer.current = null;
      }
    };
  }, [runInboxCheck]);

  const checkInbox = useCallback(() => runInboxCheck('manual'), [runInboxCheck]);

  /* ── Commands for the UI ─────────────────────────────────────────────── */

  const commands = useMemo<DashboardCommands>(
    () => ({
      retryMessage: (messageId) => dispatch({ type: 'message/retryRequested', messageId }),
      setCleaningStatus: (taskId, status) =>
        dispatch({ type: 'cleaning/statusChanged', taskId, status, timestamp: new Date() }),
      toggleChecklistItem: (taskId, itemId, done) =>
        dispatch({ type: 'cleaning/itemToggled', taskId, itemId, done, timestamp: new Date() }),
      attachChecklistPhoto: (taskId, itemId, photoUrl) =>
        dispatch({
          type: 'cleaning/photoAttached',
          taskId,
          itemId,
          photoUrl,
          timestamp: new Date(),
        }),
      setMaintenanceStatus: (taskId, status) =>
        dispatch({ type: 'maintenance/statusChanged', taskId, status, timestamp: new Date() }),
      toggleClock: (staffId) =>
        dispatch({ type: 'staff/clockToggled', staffId, timestamp: new Date() }),
      addCrewNote: (text) => dispatch({ type: 'crewNote/added', text, timestamp: new Date() }),
      reportIncident: (report) =>
        dispatch({ type: 'incident/reported', ...report, timestamp: new Date() }),
      addReview: (review) => dispatch({ type: 'review/added', ...review, timestamp: new Date() }),
    }),
    [],
  );

  return { state, now, assistantMode, isCheckingInbox, checkInbox, commands };
}
