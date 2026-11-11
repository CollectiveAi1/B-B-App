import { useCallback, useState } from 'react';
import { ActivityLog } from './components/ActivityLog';
import { AppHeader } from './components/AppHeader';
import { CleaningPanel } from './components/cleaning/CleaningPanel';
import { MessagesPanel } from './components/messages/MessagesPanel';
import { AlertsPanel } from './components/rail/AlertsPanel';
import { BookingsPanel } from './components/rail/BookingsPanel';
import { MaintenancePanel } from './components/rail/MaintenancePanel';
import { StaffChannelPanel } from './components/rail/StaffChannelPanel';
import { ReviewsPanel } from './components/reviews/ReviewsPanel';
import { SectionNav } from './components/SectionNav';
import { StatBar } from './components/StatBar';
import { createSeedState } from './data/seed';
import { FILTER_SECTION, panelId, tabId } from './domain/sections';
import { NowContext } from './hooks/nowContext';
import { useDashboard } from './hooks/useDashboard';
import { useHashSection } from './hooks/useHashSection';
import type { AssistantClient } from './services/assistantClient';
import type { DashboardState } from './state/dashboardState';
import {
  selectBookingList,
  selectCleaningTasks,
  selectMessages,
  selectReviewableBookings,
  selectReviews,
  selectStats,
} from './state/selectors';
import type { SectionId, StatFilter } from './types';

interface AppProps {
  client: AssistantClient;
  /** Builds the opening state. Tests pass their own fixture. */
  createInitialState?: (now: Date) => DashboardState;
}

export default function App({ client, createInitialState = createSeedState }: AppProps) {
  const { state, now, assistantMode, isCheckingInbox, checkInbox, commands } = useDashboard(
    client,
    createInitialState,
  );
  const [section, setSection] = useHashSection();
  const [filter, setFilter] = useState<StatFilter | null>(null);
  // A fresh object per click, so asking for the same message twice scrolls to it twice.
  const [highlight, setHighlight] = useState<{ messageId: string } | null>(null);

  const selectSection = (next: SectionId) => {
    setSection(next);
    // A filter belongs to one workspace, so leaving that workspace clears it.
    setFilter((current) => (current && FILTER_SECTION[current] !== next ? null : current));
  };

  const toggleFilter = (next: StatFilter) => {
    if (filter === next) {
      setFilter(null);
      return;
    }
    setFilter(next);
    setSection(FILTER_SECTION[next]);
  };

  const viewMessage = (messageId: string) => {
    setSection('messages');
    setFilter(null);
    setHighlight({ messageId });
  };

  const clearFilter = useCallback(() => setFilter(null), []);
  const clearHighlight = useCallback(() => setHighlight(null), []);

  const stats = selectStats(state, now);

  return (
    <NowContext value={now}>
      <a
        href="#main"
        className="sr-only rounded-sm bg-surface px-4 py-2 text-sm font-medium text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-30"
      >
        Skip to main content
      </a>

      {/* Bottom padding clears the tab bar that is fixed to the screen on phones. */}
      <div className="mx-auto max-w-[90rem] px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
        <AppHeader
          assistantMode={assistantMode}
          isCheckingInbox={isCheckingInbox}
          lastInboxCheck={state.lastInboxCheck}
          onCheckInbox={checkInbox}
        />
        <StatBar stats={stats} activeFilter={filter} onToggleFilter={toggleFilter} />
        <SectionNav
          active={section}
          counts={{ messages: stats.awaitingReply, cleaning: stats.pendingCleanings }}
          onSelect={selectSection}
        />

        <main
          id="main"
          tabIndex={-1}
          className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]"
        >
          <div
            role="tabpanel"
            id={panelId(section)}
            aria-labelledby={tabId(section)}
            className="min-w-0"
          >
            {section === 'messages' ? (
              <MessagesPanel
                messages={selectMessages(state, filter, now)}
                state={state}
                filter={filter}
                highlight={highlight}
                onClearFilter={clearFilter}
                onHighlightDone={clearHighlight}
                onRetry={commands.retryMessage}
              />
            ) : null}
            {section === 'cleaning' ? (
              <CleaningPanel
                tasks={selectCleaningTasks(state, filter)}
                state={state}
                commands={commands}
                filtered={filter === 'pendingCleanings'}
                onClearFilter={clearFilter}
              />
            ) : null}
            {section === 'reviews' ? (
              <ReviewsPanel
                reviews={selectReviews(state)}
                reviewableBookings={selectReviewableBookings(state, now)}
                catalog={state.catalog}
                onAddReview={commands.addReview}
              />
            ) : null}
          </div>

          <aside aria-label="Operations" className="flex min-w-0 flex-col gap-6">
            <MaintenancePanel
              tasks={state.maintenanceTasks}
              catalog={state.catalog}
              onStatusChange={commands.setMaintenanceStatus}
              onViewMessage={viewMessage}
            />
            <BookingsPanel list={selectBookingList(state, filter, now)} catalog={state.catalog} />
            <StaffChannelPanel notifications={state.staffNotifications} />
            <AlertsPanel alerts={state.alerts} />
          </aside>

          <div className="min-w-0 lg:col-span-2">
            <ActivityLog entries={state.activityLog} />
          </div>
        </main>
      </div>
    </NowContext>
  );
}
