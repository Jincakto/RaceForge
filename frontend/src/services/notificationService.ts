import { request, json } from './api.ts';
import { numericId } from '../types/api.ts';
export interface NotificationDto { notificationId: number; title: string; message: string; read: boolean; createdAt: string; notificationType: string }
export const notificationService = {
  list: () => request<NotificationDto[]>('/api/notifications', {}, {raw: true}),
  read: (id: number) => request<NotificationDto>(`/api/notifications/${numericId(id)}/read`, json('PATCH'), {raw: true}),
};
