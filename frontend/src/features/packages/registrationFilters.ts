import type { Enrollment, Horse } from '../../shared/data/data';

export interface RegistrationFilters { horseId: string; status: string; paymentStatus: string; search: string; }
export const EMPTY_REGISTRATION_FILTERS: RegistrationFilters = { horseId: '', status: '', paymentStatus: '', search: '' };
export const REGISTRATION_STATUSES = ['PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED'];
export function filterRegistrations(rows: Enrollment[], horses: Horse[], filters: RegistrationFilters): Enrollment[] {
  const query = filters.search.trim().toLocaleLowerCase();
  return rows.filter(row => (!filters.horseId || row.horseId === filters.horseId)
    && (!filters.status || row.apiStatus === filters.status)
    && (!filters.paymentStatus || row.paymentStatus === filters.paymentStatus)
    && (!query || `${row.id} ${row.packageName} ${horses.find(h => h.id === row.horseId)?.name || ''}`.toLocaleLowerCase().includes(query)));
}
