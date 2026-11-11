import type { SectionId, StatFilter } from '../types';

export const SECTION_IDS: readonly SectionId[] = ['messages', 'cleaning', 'reviews'];

export const tabId = (section: SectionId) => `tab-${section}`;
export const panelId = (section: SectionId) => `panel-${section}`;

/** The workspace each stat filter narrows. Choosing a filter opens its workspace. */
export const FILTER_SECTION: Readonly<Record<StatFilter, SectionId>> = {
  activeStays: 'messages',
  upcomingCheckIns: 'messages',
  awaitingReply: 'messages',
  pendingCleanings: 'cleaning',
};

/** DOM id of a message card, so other panels can scroll to and focus it. */
export const messageElementId = (messageId: string) => `message-${messageId}`;
