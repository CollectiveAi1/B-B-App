import type { DashboardCommands } from '../../hooks/useDashboard';
import type { DashboardState } from '../../state/dashboardState';
import type { CleaningTask } from '../../types';
import { CrewNotes } from './CrewNotes';
import { IncidentReports } from './IncidentReports';
import { TimeClock } from './TimeClock';
import { TurnoverList } from './TurnoverList';

interface CleaningPanelProps {
  tasks: readonly CleaningTask[];
  state: DashboardState;
  commands: DashboardCommands;
  filtered: boolean;
  onClearFilter: () => void;
}

/** The cleaning crew's workspace: the turnover schedule, then the tools around it. */
export function CleaningPanel({
  tasks,
  state,
  commands,
  filtered,
  onClearFilter,
}: CleaningPanelProps) {
  return (
    <div className="@container space-y-6">
      <TurnoverList
        tasks={tasks}
        catalog={state.catalog}
        filtered={filtered}
        onClearFilter={onClearFilter}
        onStatusChange={commands.setCleaningStatus}
        onToggleItem={commands.toggleChecklistItem}
        onAttachPhoto={commands.attachChecklistPhoto}
      />
      {/* Two columns once this column is wide enough, whatever the screen size. */}
      <div className="grid items-start gap-6 @2xl:grid-cols-2">
        <div className="space-y-6">
          <TimeClock
            staff={state.catalog.cleaningStaff}
            clockedIn={state.clockedIn}
            onToggle={commands.toggleClock}
          />
          <CrewNotes notes={state.crewNotes} onAdd={commands.addCrewNote} />
        </div>
        <IncidentReports
          catalog={state.catalog}
          incidents={state.incidents}
          onReport={commands.reportIncident}
        />
      </div>
    </div>
  );
}
