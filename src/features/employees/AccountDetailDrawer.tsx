import {
  Alert,
  Badge,
  Button,
  Code,
  CopyButton,
  Drawer,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  activateAccount,
  getAuthUserByEmployeeId,
  lockAccount,
  resetPassword,
  revokeSessions,
  sendActivation,
} from '../auth-admin/authAdminApi';
import { ACCOUNT_STATUS_LABELS } from '../auth-admin/authAdminTypes';
import { useAuth } from '../auth/useAuth';
import { HR_PERMISSIONS } from '../auth/permissions';
import type { Employee } from './employeeTypes';
import { formatDateTime } from '../../shared/utils/date';

interface Props {
  employee: Employee;
  opened: boolean;
  onClose: () => void;
}

function statusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'green';
    case 'PENDING_ACTIVATION': case 'INACTIVE': return 'yellow';
    case 'SUSPENDED': case 'LOCKED': return 'orange';
    case 'DISABLED': case 'DEACTIVATED': return 'red';
    default: return 'gray';
  }
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed" w={180} style={{ flexShrink: 0 }}>{label}</Text>
      <Text size="sm" style={{ wordBreak: 'break-all' }}>{children}</Text>
    </Group>
  );
}

export function AccountDetailDrawer({ employee, opened, onClose }: Props) {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const canRead = can(HR_PERMISSIONS.ACCOUNT_READ);
  const canResetPassword = can(HR_PERMISSIONS.ACCOUNT_RESET_PASSWORD);
  const canLock = can(HR_PERMISSIONS.ACCOUNT_LOCK);
  const canRestore = can(HR_PERMISSIONS.ACCOUNT_RESTORE);

  const { data: authUser, isLoading, error, refetch } = useQuery({
    queryKey: ['auth-user-by-employee', employee.id],
    queryFn: () => getAuthUserByEmployeeId(employee.id),
    enabled: opened && canRead && Boolean(employee.authUserId),
    retry: (count, err: unknown) =>
      count < 1 && (err as { statusCode?: number })?.statusCode !== 404,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['auth-user-by-employee', employee.id] }),
      queryClient.invalidateQueries({ queryKey: ['employees'] }),
    ]);
  };

  const resetPasswordMutation = useMutation({
    mutationFn: () => resetPassword(authUser!.authUserId),
    onSuccess: (data) => {
      notifications.show({
        color: 'green',
        title: 'Đã reset mật khẩu',
        message: `Mật khẩu tạm: ${data.tempPassword} — bàn giao ngay cho nhân sự.`,
        autoClose: false,
      });
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Lỗi reset mật khẩu.' });
    },
  });

  const sendActivationMutation = useMutation({
    mutationFn: () => sendActivation(authUser!.authUserId),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã gửi email kích hoạt.' });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Lỗi gửi email.' });
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => lockAccount(authUser!.authUserId, 'HR admin locked'),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã khóa tài khoản.' });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Lỗi khóa tài khoản.' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => activateAccount(authUser!.authUserId, 'HR admin activated'),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã kích hoạt tài khoản.' });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Lỗi kích hoạt.' });
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: () => revokeSessions(authUser!.authUserId, 'HR admin revoke'),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã thu hồi tất cả phiên đăng nhập.' });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Lỗi thu hồi sessions.' });
    },
  });

  const anyBusy =
    resetPasswordMutation.isPending ||
    sendActivationMutation.isPending ||
    lockMutation.isPending ||
    activateMutation.isPending ||
    revokeSessionsMutation.isPending;

  const isPending = authUser?.accountStatus === 'PENDING_ACTIVATION' || authUser?.accountStatus === 'INACTIVE';
  const isLocked = authUser?.accountStatus === 'LOCKED' || authUser?.accountStatus === 'SUSPENDED';
  const isActive = authUser?.accountStatus === 'ACTIVE';

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={`Tài khoản — ${employee.fullName}`}
      position="right"
      size="md"
    >
      {!canRead ? (
        <Alert color="blue">Bạn không có quyền xem thông tin tài khoản.</Alert>
      ) : isLoading ? (
        <Group justify="center" py="xl"><Loader /></Group>
      ) : error || !authUser ? (
        <Stack gap="sm">
          <Alert color="red" title="Không tải được thông tin tài khoản">
            Không kết nối được auth service.
          </Alert>
          <Button variant="light" onClick={() => void refetch()}>Thử lại</Button>
        </Stack>
      ) : (
        <Stack gap="lg">
          <Stack gap={6}>
            <Title order={6} c="dimmed">Thông tin tài khoản</Title>

            <InfoRow label="Auth User ID">
              <Group gap={4}>
                <Code>{authUser.authUserId}</Code>
                <CopyButton value={authUser.authUserId}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Đã copy' : 'Copy'}>
                      <Button size="xs" variant="subtle" p={2} onClick={copy}>
                        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      </Button>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </InfoRow>

            {authUser.username && (
              <InfoRow label="Username">{authUser.username}</InfoRow>
            )}
            <InfoRow label="Email đăng nhập">{authUser.email}</InfoRow>
            <InfoRow label="Trạng thái">
              <Badge color={statusColor(authUser.accountStatus)}>
                {ACCOUNT_STATUS_LABELS[authUser.accountStatus] ?? authUser.accountStatus}
              </Badge>
            </InfoRow>
            <InfoRow label="Bắt buộc đổi mật khẩu">
              {authUser.mustChangePassword ? (
                <Badge color="orange" variant="light">Bắt buộc đổi</Badge>
              ) : (
                <Text size="sm" c="dimmed">Không</Text>
              )}
            </InfoRow>
            <InfoRow label="Permission version">{String(authUser.permissionVersion ?? '—')}</InfoRow>
            <InfoRow label="Token version">{String(authUser.tokenVersion ?? '—')}</InfoRow>
            <InfoRow label="Lần đăng nhập gần nhất">
              {authUser.lastLoginAt ? formatDateTime(authUser.lastLoginAt) : 'Chưa đăng nhập'}
            </InfoRow>
            <InfoRow label="Hoạt động gần nhất">
              {authUser.lastSeen ? formatDateTime(authUser.lastSeen) : '—'}
            </InfoRow>
            {authUser.createdAt && (
              <InfoRow label="Ngày tạo tài khoản">{formatDateTime(authUser.createdAt)}</InfoRow>
            )}
          </Stack>

          <Stack gap={6}>
            <Title order={6} c="dimmed">Thao tác</Title>
            <Group wrap="wrap" gap="sm">
              {canResetPassword && (
                <Button
                  size="sm"
                  variant="light"
                  color="orange"
                  loading={resetPasswordMutation.isPending}
                  disabled={anyBusy}
                  onClick={() => resetPasswordMutation.mutate()}
                >
                  Reset mật khẩu
                </Button>
              )}

              {canResetPassword && isPending && (
                <Button
                  size="sm"
                  variant="light"
                  loading={sendActivationMutation.isPending}
                  disabled={anyBusy}
                  onClick={() => sendActivationMutation.mutate()}
                >
                  Gửi email kích hoạt
                </Button>
              )}

              {canLock && isActive && (
                <Button
                  size="sm"
                  variant="light"
                  color="red"
                  loading={lockMutation.isPending}
                  disabled={anyBusy}
                  onClick={() => lockMutation.mutate()}
                >
                  Khóa tài khoản
                </Button>
              )}

              {canRestore && isLocked && (
                <Button
                  size="sm"
                  variant="light"
                  color="green"
                  loading={activateMutation.isPending}
                  disabled={anyBusy}
                  onClick={() => activateMutation.mutate()}
                >
                  Mở khóa
                </Button>
              )}

              <Button
                size="sm"
                variant="subtle"
                color="gray"
                loading={revokeSessionsMutation.isPending}
                disabled={anyBusy}
                onClick={() => revokeSessionsMutation.mutate()}
              >
                Thu hồi sessions
              </Button>
            </Group>
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}
