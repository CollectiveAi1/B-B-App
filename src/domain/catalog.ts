import type { Catalog, CleaningStaff, MaintenanceStaff, Property } from '../types';

export function findProperty(catalog: Catalog, propertyId: string): Property | undefined {
  return catalog.properties.find((property) => property.id === propertyId);
}

/** Display name for a property id. Falls back to a label instead of leaking the raw id into the UI. */
export function propertyName(catalog: Catalog, propertyId: string): string {
  return findProperty(catalog, propertyId)?.name ?? 'Unknown property';
}

export function findCleaningStaff(catalog: Catalog, staffId: string): CleaningStaff | undefined {
  return catalog.cleaningStaff.find((member) => member.id === staffId);
}

export function findMaintenanceStaff(
  catalog: Catalog,
  staffId: string | null,
): MaintenanceStaff | undefined {
  return catalog.maintenanceStaff.find((member) => member.id === staffId);
}
