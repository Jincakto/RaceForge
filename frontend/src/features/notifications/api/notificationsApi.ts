import { request, idPath } from '../../../shared/api/api';
interface NotificationResponse {
  notificationId: number;
  notificationType: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export const listNotifications = () =>
  request<NotificationResponse[]>('/notifications');

export const markNotificationRead = (id: string) =>
  request<NotificationResponse>(`/notifications/${idPath(id)}/read`, 'PATCH');
