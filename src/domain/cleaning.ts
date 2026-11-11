import type { Booking, CleaningTask, Property } from '../types';

export function createCleaningTask(id: string, booking: Booking, property: Property): CleaningTask {
  return {
    id,
    bookingId: booking.id,
    propertyId: property.id,
    guestName: booking.guestName,
    checkOut: booking.checkOut,
    status: 'pending',
    checklist: property.checklist.map((item) => ({ itemId: item.id, done: false, photoUrl: null })),
  };
}

export interface ChecklistProgress {
  done: number;
  total: number;
  percent: number;
}

export function checklistProgress(task: CleaningTask): ChecklistProgress {
  const total = task.checklist.length;
  const done = task.checklist.filter((item) => item.done).length;
  return { done, total, percent: total === 0 ? 100 : Math.round((done / total) * 100) };
}

export function isChecklistComplete(task: CleaningTask): boolean {
  return task.checklist.every((item) => item.done);
}
