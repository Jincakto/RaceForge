import type { UserDto } from './api.ts';
export interface PageDto<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface RegistrationDto { requestId: number; user: UserDto; requestedRole: {roleId: number; roleName: string}; status: string; reviewNote: string | null; createdAt: string }
