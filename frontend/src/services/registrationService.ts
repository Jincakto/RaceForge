import { request, json } from './api.ts';
import { query } from './query.ts';
import { numericId } from '../types/api.ts';
import type { PageDto, RegistrationDto } from '../types/account.ts';
export const registrationService = {
  list: (search = '', status = '', page = 0) => request<PageDto<RegistrationDto>>(`/api/registration-requests?${query({search, status, page, size: 20})}`),
  approve: (id: number, note: string) => request<RegistrationDto>(`/api/registration-requests/${numericId(id)}/approve`, json('POST', {note})),
  reject: (id: number, reason: string) => request<RegistrationDto>(`/api/registration-requests/${numericId(id)}/reject`, json('POST', {reason})),
};
