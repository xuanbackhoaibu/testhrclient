import { Button, Group, Modal, Stack, Text } from '@mantine/core';

interface ConfirmActionModalProps {
  opened: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  color?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmActionModal({
  opened,
  title,
  message,
  confirmLabel = 'Xác nhận',
  loading,
  color = 'red',
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {message}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button color={color} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
