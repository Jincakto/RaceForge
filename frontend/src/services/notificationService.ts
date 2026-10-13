import { requestPlain, json } from './api.ts';
import { numericId, type NotificationDto } from '../types/api.ts';
// NotificationController returns plain JSON (no ApiResponse envelope).
export const notificationService = {
  list: () => requestPlain<NotificationDto[]>('/api/notifications'),
  unreadCount: () => requestPlain<{ unreadCount: number }>('/api/notifications/unread-count'),
  markRead: (id: number) => requestPlain<NotificationDto>(`/api/notifications/${numericId(id)}/read`, json('PATCH')),
};
export function toNotification(n: NotificationDto) {
  const t = (n.notificationType || '').toLowerCase();
  const type = ['health', 'training', 'race', 'system', 'lock', 'rehab', 'approval', 'inventory', 'incident'].find(k => t.includes(k)) || 'system';
  return { id: n.notificationId, type, message: n.title ? `${n.title}: ${n.message}` : n.message, time: new Date(n.createdAt).toLocaleString('vi-VN'), read: n.read };
}
