import { createSeedState } from '../data/seed';
import type { DashboardAction } from '../state/actions';
import type { DashboardState } from '../state/dashboardState';
import { dashboardReducer } from '../state/reducer';
import type { GuestMessage } from '../types';

/** A fixed "now" so seeded stays, reminders, and relative times are the same on every run. */
export const NOW = new Date(2026, 10, 10, 12, 0, 0);

export const minutesAfter = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

export function seedState(): DashboardState {
  return createSeedState(NOW);
}

export function run(state: DashboardState, ...actions: DashboardAction[]): DashboardState {
  return actions.reduce(dashboardReducer, state);
}

export function guestMessage(state: DashboardState, messageId: string): GuestMessage {
  const message = state.messages.find((candidate) => candidate.id === messageId);
  if (message?.kind !== 'guest') throw new Error(`No guest message with id ${messageId}`);
  return message;
}
