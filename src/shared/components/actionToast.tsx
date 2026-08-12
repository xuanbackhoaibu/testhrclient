import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';

export function showActionToast({
  id,
  title,
  message,
  actionLabel = 'Hoàn tác',
  color = 'blue',
  onAction,
}: {
  id?: string;
  title: string;
  message: string;
  actionLabel?: string;
  color?: string;
  onAction: () => void;
}) {
  const notificationId = id ?? `action-toast-${Date.now()}`;

  notifications.show({
    id: notificationId,
    color,
    title,
    message: (
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Text size="sm">{message}</Text>
        <Button
          size="xs"
          variant="light"
          color={color}
          onClick={() => {
            onAction();
            notifications.hide(notificationId);
          }}
        >
          {actionLabel}
        </Button>
      </Group>
    ),
  });

  return notificationId;
}
