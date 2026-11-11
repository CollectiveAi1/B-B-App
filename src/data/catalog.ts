import type { Catalog } from '../types';

export const CATALOG: Catalog = {
  properties: [
    {
      id: 'cozy-cottage',
      name: 'The Cozy Cottage',
      area: 'Downtown',
      checklist: [
        { id: 'cc1', label: 'Wipe kitchen counters and sink', photoRequired: true },
        { id: 'cc2', label: 'Check refrigerator for leftover food', photoRequired: false },
        { id: 'cc3', label: 'Clean bathroom mirror, toilet, and shower', photoRequired: false },
        { id: 'cc4', label: 'Strip bed and start laundry', photoRequired: true },
        { id: 'cc5', label: 'Make bed with fresh linens', photoRequired: false },
        { id: 'cc6', label: 'Vacuum all floors and rugs', photoRequired: false },
        {
          id: 'cc7',
          label: 'Restock toiletries (soap, shampoo, toilet paper)',
          photoRequired: false,
        },
      ],
    },
    {
      id: 'lakeside-cabin',
      name: 'Lakeside Cabin',
      area: 'Lakeside',
      checklist: [
        { id: 'lc1', label: 'Sweep deck and tidy outdoor furniture', photoRequired: false },
        {
          id: 'lc2',
          label: 'Clean kitchen appliances (microwave, coffee maker)',
          photoRequired: false,
        },
        { id: 'lc3', label: 'Clean both bathrooms', photoRequired: false },
        { id: 'lc4', label: 'Strip all three beds and start laundry', photoRequired: true },
        { id: 'lc5', label: 'Make beds with fresh linens', photoRequired: false },
        { id: 'lc6', label: 'Empty fireplace ash if used', photoRequired: false },
        { id: 'lc7', label: 'Vacuum and mop all floors', photoRequired: false },
        { id: 'lc8', label: 'Restock coffee, sugar, and tea', photoRequired: false },
      ],
    },
    {
      id: 'penthouse',
      name: 'The Penthouse',
      area: 'Uptown',
      checklist: [
        { id: 'ph1', label: 'Clean all glass surfaces and windows', photoRequired: true },
        { id: 'ph2', label: 'Wipe down kitchen island and all counters', photoRequired: false },
        {
          id: 'ph3',
          label: 'Clean master bathroom suite (tub, shower, double vanity)',
          photoRequired: false,
        },
        { id: 'ph4', label: 'Clean guest bathroom', photoRequired: false },
        { id: 'ph5', label: 'Strip both beds and start laundry', photoRequired: false },
        { id: 'ph6', label: 'Make beds with high-thread-count linens', photoRequired: true },
        { id: 'ph7', label: 'Polish all stainless steel appliances', photoRequired: false },
        { id: 'ph8', label: 'Restock minibar and Nespresso pods', photoRequired: false },
        { id: 'ph9', label: 'Vacuum all carpets and rugs', photoRequired: false },
      ],
    },
  ],

  cleaningStaff: [
    { id: 'cleaner-maria', name: 'Maria Garcia' },
    { id: 'cleaner-david', name: 'David Chen' },
    { id: 'cleaner-fatima', name: 'Fatima Al-Jamil' },
  ],

  maintenanceStaff: [
    {
      id: 'maint-john',
      name: 'John Piper',
      keywords: ['leak', 'plumb', 'sink', 'faucet', 'toilet', 'drip', 'water', 'drain', 'shower'],
      area: 'Downtown',
      generalist: false,
    },
    {
      id: 'maint-walter',
      name: 'Walter Pipes',
      keywords: ['leak', 'plumb', 'sink', 'faucet', 'toilet', 'drip', 'water', 'drain', 'shower'],
      area: 'Downtown',
      generalist: false,
    },
    {
      id: 'maint-eleanor',
      name: 'Eleanor Spark',
      keywords: ['electric', 'outlet', 'light', 'power', 'wifi', 'internet', 'router', 'password'],
      area: 'Uptown',
      generalist: false,
    },
    {
      id: 'maint-bob',
      name: 'Bob Builder',
      keywords: ['door', 'window', 'lock', 'hinge', 'furniture'],
      area: 'any',
      generalist: true,
    },
  ],
};
