import { request, json } from './api.ts';
import { query } from './query.ts';
import { numericId, type UserDto } from '../types/api.ts';
import type { PageDto } from '../types/account.ts';
export const staffService = {
  list: (search = '', status = '', page = 0) => request<PageDto<UserDto>>(`/api/users?${query({search, status, page, size: 20})}`),
  status: (id: number, status: string) => request<UserDto>(`/api/users/${numericId(id)}/status`, json('PATCH', {status})),
};
