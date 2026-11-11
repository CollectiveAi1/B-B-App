import type { Area, MaintenanceStaff, MaintenanceTask } from '../types';

export interface AssignmentInput {
  /** The task description plus the guest's own words. */
  text: string;
  area: Area;
  staff: readonly MaintenanceStaff[];
  tasks: readonly MaintenanceTask[];
}

/** "Wi-Fi isn't working" → ["wifi", "isnt", "working"], so hyphens and apostrophes cannot hide a keyword. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/(\w)['’-](?=\w)/g, '$1')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Prefix matching lets "leak" catch "leaking" without "light" catching "slight". */
function keywordScore(member: MaintenanceStaff, tokens: readonly string[]): number {
  return member.keywords.filter((keyword) => tokens.some((token) => token.startsWith(keyword)))
    .length;
}

function countTasks(
  tasks: readonly MaintenanceTask[],
  staffId: string,
  include: (task: MaintenanceTask) => boolean,
): number {
  return tasks.filter((task) => task.assigneeId === staffId && include(task)).length;
}

const isOpen = (task: MaintenanceTask) => task.status !== 'completed';

/**
 * Chooses who gets a repair.
 *
 * 1. Trade: whoever matches the most keywords. No match falls to a generalist.
 * 2. Distance: people based in the property's area, when there are any.
 * 3. Workload: fewest open tasks.
 * 4. Fairness: fewest tasks ever assigned, so equally free people take turns.
 *
 * Every tie-break reads from the task list, so the result is the same for the
 * same inputs and needs no counters kept on the side.
 */
export function pickAssignee({
  text,
  area,
  staff,
  tasks,
}: AssignmentInput): MaintenanceStaff | null {
  const tokens = tokenize(text);
  const scored = staff.map((member) => ({ member, score: keywordScore(member, tokens) }));
  const bestScore = Math.max(0, ...scored.map((entry) => entry.score));

  const byTrade =
    bestScore > 0
      ? scored.filter((entry) => entry.score === bestScore).map((entry) => entry.member)
      : staff.filter((member) => member.generalist);
  if (byTrade.length === 0) return null;

  const local = byTrade.filter((member) => member.area === area || member.area === 'any');
  const candidates = local.length > 0 ? local : byTrade;

  const ranked = candidates
    .map((member, order) => ({
      member,
      order,
      open: countTasks(tasks, member.id, isOpen),
      total: countTasks(tasks, member.id, () => true),
    }))
    .toSorted((a, b) => a.open - b.open || a.total - b.total || a.order - b.order);

  return ranked[0]?.member ?? null;
}
