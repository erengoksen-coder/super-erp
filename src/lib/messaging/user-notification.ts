import { toast } from 'sonner';

/**
 * Super ERP - User Notification System
 * Handles real-time notifications and alerts for users.
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

export function notifyUser(notification: Partial<AppNotification>) {
  const type = notification.type || 'info';
  const title = notification.title || 'Bildirim';
  const message = notification.message || '';

  switch (type) {
    case 'success':
      toast.success(title, { description: message });
      break;
    case 'error':
      toast.error(title, { description: message });
      break;
    case 'warning':
      toast.warning(title, { description: message });
      break;
    default:
      toast.info(title, { description: message });
  }
}

export const notificationService = {
  send: notifyUser,
  // Future: Add methods for push notifications or database persistence
};