import { useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ConfirmActionModalProps {
  opened: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  color?: string;
  danger?: boolean;
  requiredText?: string;
  requiredTextLabel?: string;
  requireReason?: boolean;
  reasonLabel?: string;
  onClose: () => void;
  onConfirm: (payload?: { reason?: string }) => void;
}

export function ConfirmActionModal({
  opened,
  title,
  message,
  confirmLabel = 'Xác nhận',
  loading,
  color = 'red',
  danger = false,
  requiredText,
  requiredTextLabel = 'Nhập tên bản ghi để xác nhận',
  requireReason = false,
  reasonLabel = 'Lý do thực hiện',
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const textMatched = !requiredText || confirmText.trim() === requiredText.trim();
  const reasonProvided = !requireReason || reason.trim().length >= 3;
  const disabled = loading || !textMatched || !reasonProvided;

  function handleClose() {
    setConfirmText('');
    setReason('');
    onClose();
  }

  function handleConfirm() {
    onConfirm({ reason: reason.trim() || undefined });
  }

  return (
    <Modal opened={opened} onClose={handleClose} title={title} centered className="confirm-action-modal">
      <Stack gap="md">
        {danger ? (
          <Alert color={color} icon={<IconAlertTriangle size={18} />} title="Hành động cần xác nhận kỹ">
            Hành động này có thể ảnh hưởng dữ liệu hoặc quy trình đang vận hành.
          </Alert>
        ) : null}
        <Text size="sm" c="dimmed">
          {message}
        </Text>
        {requiredText ? (
          <TextInput
            label={requiredTextLabel}
            description={`Nhập chính xác: ${requiredText}`}
            value={confirmText}
            onChange={(event) => setConfirmText(event.currentTarget.value)}
            error={confirmText && !textMatched ? 'Nội dung xác nhận chưa khớp.' : undefined}
            disabled={loading}
          />
        ) : null}
        {requireReason ? (
          <Textarea
            label={reasonLabel}
            placeholder="Nhập lý do để lưu vết thao tác"
            minRows={3}
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            error={reason && !reasonProvided ? 'Lý do cần ít nhất 3 ký tự.' : undefined}
            disabled={loading}
          />
        ) : null}
        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button color={color} loading={loading} disabled={disabled} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
