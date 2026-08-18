import { notifications } from '@mantine/notifications';

/**
 * Thay cho `message` của antd: cùng chữ ký gọi (`toast.error('...')`) nhưng
 * dùng @mantine/notifications vốn đã là hệ thống toast của app.
 */
export const toast = {
  success(message: string) {
    notifications.show({ message, color: 'green' });
  },
  error(message: string) {
    notifications.show({ message, color: 'red' });
  },
  info(message: string) {
    notifications.show({ message, color: 'blue' });
  },
  warning(message: string) {
    notifications.show({ message, color: 'yellow' });
  },
};
