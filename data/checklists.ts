import { ChecklistItem } from '../types';

export const PROPERTY_CHECKLISTS: Record<string, ChecklistItem[]> = {
  'The Cozy Cottage': [
    { id: 'cc1', text: 'Wipe kitchen counters and sink', photoRequired: true },
    { id: 'cc2', text: 'Check refrigerator for leftover food' },
    { id: 'cc3', text: 'Clean bathroom mirror, toilet, and shower' },
    { id: 'cc4', text: 'Strip bed and start laundry', photoRequired: true },
    { id: 'cc5', text: 'Make bed with fresh linens' },
    { id: 'cc6', text: 'Vacuum all floors and rugs' },
    { id: 'cc7', text: 'Restock toiletries (soap, shampoo, toilet paper)' },
  ],
  'Lakeside Cabin': [
    { id: 'lc1', text: 'Sweep deck and tidy outdoor furniture' },
    { id: 'lc2', text: 'Clean kitchen appliances (microwave, coffee maker)' },
    { id: 'lc3', text: 'Clean bathrooms (2)' },
    { id: 'lc4', text: 'Strip all beds (3) and start laundry', photoRequired: true },
    { id: 'lc5', text: 'Make beds with fresh linens' },
    { id: 'lc6', text: 'Empty fireplace ash if used' },
    { id: 'lc7', text: 'Vacuum and mop all floors' },
    { id: 'lc8', text: 'Restock coffee, sugar, and tea' },
  ],
  'The Penthouse': [
    { id: 'ph1', text: 'Clean all glass surfaces and windows', photoRequired: true },
    { id: 'ph2', text: 'Wipe down kitchen island and all counters' },
    { id: 'ph3', text: 'Clean master bathroom suite (tub, shower, double vanity)' },
    { id: 'ph4', text: 'Clean guest bathroom' },
    { id: 'ph5', text: 'Strip beds (2) and start laundry' },
    { id: 'ph6', text: 'Make beds with high-thread-count linens', photoRequired: true },
    { id: 'ph7', text: 'Polish all stainless steel appliances' },
    { id: 'ph8', text: 'Restock minibar and Nespresso pods' },
    { id: 'ph9', text: 'Vacuum all carpets and rugs' },
  ],
  // Add other properties here
};
