import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { bulkProvisionFromBatch } from '../auth-admin/authAdminApi';

interface Props {
  open: boolean;
  batchId: string;
  importedCount: number;
  onClose: () => void;
}

export function PostImportAccountModal({ open, batchId, importedCount, onClose }: Props) {
  const [createAccounts, setCreateAccounts] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);

  const provisionMutation = useMutation({
    mutationFn: () =>
      bulkProvisionFromBatch({
        batchId,
        defaultRoles: ['EMPLOYEE'],
        initialStatus: 'ACTIVE',
        sendActivationEmail: sendEmail,
      }),
    onSuccess: (result) => {
      notifications.show({
        color: 'green',
        title: 'Cấp tài khoản hoàn tất',
        message: `Đã tạo ${result.created}/${result.total} tài khoản.${result.failed ? ` Thất bại: ${result.failed}.` : ''}`,
      });
      onClose();
    },
    onError: (err: unknown) => {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 501) {
        notifications.show({
          color: 'yellow',
          title: 'Tính năng chưa hỗ trợ',
          message: 'Cấp tài khoản hàng loạt qua import chưa được hỗ trợ. Vui lòng tạo từng tài khoản trong tab Tài khoản.',
          autoClose: false,
        });
      } else {
        notifications.show({
          color: 'red',
          title: 'Cấp tài khoản thất bại',
          message: (err as { message?: string })?.message ?? 'Đã xảy ra lỗi.',
        });
      }
    },
  });

  function handleConfirm() {
    if (!createAccounts) {
      onClose();
      return;
    }
    provisionMutation.mutate();
  }

  return (
    <Modal
      title="Import thành công"
      opened={open}
      onClose={onClose}
      size="md"
    >
      <Stack gap="md">
        <Alert color="green">
          Đã import <strong>{importedCount}</strong> nhân sự mới thành công.
        </Alert>

        <Checkbox
          label="Tạo tài khoản đăng nhập cho nhân sự mới"
          checked={createAccounts}
          onChange={(e) => setCreateAccounts(e.currentTarget.checked)}
        />

        {createAccounts && (
          <Stack gap="xs" pl="md">
            <Checkbox
              label="Gửi email kích hoạt"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.currentTarget.checked)}
            />
            <Text size="xs" c="dimmed">
              Tài khoản sẽ ở trạng thái <strong>Hoạt động</strong>. Nhân sự đã có tài khoản sẽ bị bỏ qua.
            </Text>
          </Stack>
        )}

        <Group justify="flex-end">
          {createAccounts && (
            <Button variant="default" onClick={onClose}>Bỏ qua</Button>
          )}
          <Button
            loading={provisionMutation.isPending}
            onClick={handleConfirm}
          >
            {createAccounts ? 'Tạo tài khoản' : 'Đóng'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
