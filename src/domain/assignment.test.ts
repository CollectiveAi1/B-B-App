import { describe, expect, it } from 'vitest';
import { CATALOG } from '../data/catalog';
import type { MaintenanceStatus, MaintenanceTask } from '../types';
import { pickAssignee } from './assignment';

const staff = CATALOG.maintenanceStaff;

function task(assigneeId: string, status: MaintenanceStatus = 'todo'): MaintenanceTask {
  return {
    id: `repair-${Math.random()}`,
    createdAt: new Date(0),
    propertyId: 'cozy-cottage',
    description: 'Earlier job',
    status,
    sourceMessageId: 'msg',
    assigneeId,
  };
}

const assign = (
  text: string,
  area: 'Downtown' | 'Lakeside' | 'Uptown',
  tasks: MaintenanceTask[] = [],
) => pickAssignee({ text, area, staff, tasks })?.name;

describe('pickAssignee', () => {
  it('sends plumbing to a plumber and electrical work to the electrician', () => {
    expect(assign('Fix slow water leak under the kitchen sink.', 'Downtown')).toBe('John Piper');
    expect(assign('Bedroom outlet has no power and the light flickers', 'Uptown')).toBe(
      'Eleanor Spark',
    );
  });

  it('reads through hyphens and apostrophes ("Wi-Fi" matches "wifi")', () => {
    expect(assign("Troubleshoot and fix the Wi-Fi. The Wi-Fi isn't working", 'Uptown')).toBe(
      'Eleanor Spark',
    );
  });

  it('does not hand trade work to the generalist just because the task says "fix"', () => {
    expect(assign('Fix the leaking toilet', 'Lakeside')).not.toBe('Bob Builder');
  });

  it('matches word prefixes, not fragments inside other words', () => {
    // "slight" contains "light" but must not count as electrical work.
    expect(assign('There is a slight draught in the hallway', 'Uptown')).toBe('Bob Builder');
  });

  it('gives unmatched jobs to the generalist', () => {
    expect(assign('The wardrobe rail has come loose', 'Lakeside')).toBe('Bob Builder');
    expect(assign('The back door lock is broken', 'Lakeside')).toBe('Bob Builder');
  });

  it('prefers someone based in the same area, and falls back when nobody is', () => {
    // Both plumbers are Downtown, so a Lakeside leak still goes to a plumber.
    expect(['John Piper', 'Walter Pipes']).toContain(assign('Kitchen sink leak', 'Lakeside'));
    // The electrician is Uptown, the generalist travels: a Downtown job mentioning
    // both a light and a door has one local match.
    expect(assign('The light by the door is broken', 'Downtown')).toBe('Bob Builder');
  });

  it('picks the person with the fewest open tasks', () => {
    expect(assign('Dripping faucet', 'Downtown', [task('maint-john')])).toBe('Walter Pipes');
  });

  it('ignores completed tasks when measuring workload', () => {
    const tasks = [task('maint-john', 'completed'), task('maint-walter')];
    expect(assign('Dripping faucet', 'Downtown', tasks)).toBe('John Piper');
  });

  it('rotates between equally free people', () => {
    const tasks: MaintenanceTask[] = [];
    const order = Array.from({ length: 4 }, () => {
      const assignee = pickAssignee({ text: 'Dripping faucet', area: 'Downtown', staff, tasks });
      if (assignee) tasks.push(task(assignee.id, 'completed'));
      return assignee?.name;
    });
    expect(order).toEqual(['John Piper', 'Walter Pipes', 'John Piper', 'Walter Pipes']);
  });

  it('returns null when there is nobody to assign', () => {
    expect(pickAssignee({ text: 'Leak', area: 'Downtown', staff: [], tasks: [] })).toBeNull();
    const specialistsOnly = staff.filter((member) => !member.generalist);
    expect(
      pickAssignee({
        text: 'Loose wardrobe rail',
        area: 'Downtown',
        staff: specialistsOnly,
        tasks: [],
      }),
    ).toBeNull();
  });
});
