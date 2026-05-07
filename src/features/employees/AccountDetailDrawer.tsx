import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Code,
  CopyButton,
  Drawer,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
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
import {
  ACCOUNT_STATUS_LABELS,
  extractTemporaryPassword,
  type ResetPasswordResult,
} from '../auth-admin/authAdminTypes';
import { HR_PERMISSIONS } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import { formatDateTime } from '../../shared/utils/date';
import type { Employee } from './employeeTypes';

interface Props {
  employee: Employee;
  opened: boolean;
  onClose: () => void;
}

function statusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'green';
    case 'PENDING_ACTIVATION':
    case 'INACTIVE':
      return 'yellow';
    case 'SUSPENDED':
    case 'LOCKED':
      return 'orange';
    case 'DISABLED':
    case 'DEACTIVATED':
      return 'red';
    default:
      return 'gray';
  }
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed" w={180} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text size="sm" style={{ wordBreak: 'break-all' }}>
        {children}
      </Text>
    </Group>
  );
}

export function AccountDetailDrawer({ employee, opened, onClose }: Props) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null);

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
    mutationFn: () =>
      resetPassword(authUser!.authUserId, {
        autoGenerate: true,
        mustChangePassword: true,
        notifyUser: false,
      }),
    onSuccess: async (data) => {
      setResetResult(data);
      notifications.show({
        color: 'green',
        title: 'Da reset mat khau',
        message: 'Mat khau tam dang duoc hien thi trong modal ket qua.',
      });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        message:
          (err as { message?: string })?.message ?? 'Loi reset mat khau.',
      });
    },
  });

  const sendActivationMutation = useMutation({
    mutationFn: () => sendActivation(authUser!.authUserId),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Da gui email kich hoat.' });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        message: (err as { message?: string })?.message ?? 'Loi gui email.',
      });
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => lockAccount(authUser!.authUserId, 'HR admin locked'),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Da khoa tai khoan.' });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        message:
          (err as { message?: string })?.message ?? 'Loi khoa tai khoan.',
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => activateAccount(authUser!.authUserId, 'HR admin activated'),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Da kich hoat tai khoan.' });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        message: (err as { message?: string })?.message ?? 'Loi kich hoat.',
      });
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: () => revokeSessions(authUser!.authUserId, 'HR admin revoke'),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        message: 'Da thu hoi tat ca phien dang nhap.',
      });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        message:
          (err as { message?: string })?.message ?? 'Loi thu hoi sessions.',
      });
    },
  });

  const anyBusy =
    resetPasswordMutation.isPending ||
    sendActivationMutation.isPending ||
    lockMutation.isPending ||
    activateMutation.isPending ||
    revokeSessionsMutation.isPending;

  const isPending =
    authUser?.accountStatus === 'PENDING_ACTIVATION' ||
    authUser?.accountStatus === 'INACTIVE';
  const isLocked =
    authUser?.accountStatus === 'LOCKED' ||
    authUser?.accountStatus === 'SUSPENDED';
  const isActive = authUser?.accountStatus === 'ACTIVE';

  return (
    <>
      <Drawer
        opened={opened}
        onClose={() => {
          setResetResult(null);
          onClose();
        }}
        title={`Tai khoan - ${employee.fullName}`}
        position="right"
        size="md"
      >
        {!canRead ? (
          <Alert color="blue">
            Ban khong co quyen xem thong tin tai khoan.
          </Alert>
        ) : isLoading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : error || !authUser ? (
          <Stack gap="sm">
            <Alert color="red" title="Khong tai duoc thong tin tai khoan">
              Khong ket noi duoc auth service.
            </Alert>
            <Button variant="light" onClick={() => void refetch()}>
              Thu lai
            </Button>
          </Stack>
        ) : (
          <Stack gap="lg">
            <Stack gap={6}>
              <Title order={6} c="dimmed">
                Thong tin tai khoan
              </Title>

              <InfoRow label="Auth User ID">
                <Group gap={4}>
                  <Code>{authUser.authUserId}</Code>
                  <CopyButton value={authUser.authUserId}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Da copy' : 'Copy'}>
                        <Button size="xs" variant="subtle" p={2} onClick={copy}>
                          {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                        </Button>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </InfoRow>

              {authUser.username ? (
                <InfoRow label="Username">{authUser.username}</InfoRow>
              ) : null}
              <InfoRow label="Email dang nhap">{authUser.email}</InfoRow>
              <InfoRow label="Trang thai">
                <Badge color={statusColor(authUser.accountStatus)}>
                  {ACCOUNT_STATUS_LABELS[authUser.accountStatus] ??
                    authUser.accountStatus}
                </Badge>
              </InfoRow>
              <InfoRow label="Bat buoc doi mat khau">
                {authUser.mustChangePassword ? (
                  <Badge color="orange" variant="light">
                    Bat buoc doi
                  </Badge>
                ) : (
                  <Text size="sm" c="dimmed">
                    Khong
                  </Text>
                )}
              </InfoRow>
              <InfoRow label="Permission version">
                {String(authUser.permissionVersion ?? '-')}
              </InfoRow>
              <InfoRow label="Token version">
                {String(authUser.tokenVersion ?? '-')}
              </InfoRow>
              <InfoRow label="Lan dang nhap gan nhat">
                {authUser.lastLoginAt
                  ? formatDateTime(authUser.lastLoginAt)
                  : 'Chua dang nhap'}
              </InfoRow>
              <InfoRow label="Hoat dong gan nhat">
                {authUser.lastSeen ? formatDateTime(authUser.lastSeen) : '-'}
              </InfoRow>
              {authUser.createdAt ? (
                <InfoRow label="Ngay tao tai khoan">
                  {formatDateTime(authUser.createdAt)}
                </InfoRow>
              ) : null}
            </Stack>

            <Stack gap={6}>
              <Title order={6} c="dimmed">
                Thao tac
              </Title>
              <Group wrap="wrap" gap="sm">
                {canResetPassword ? (
                  <Button
                    size="sm"
                    variant="light"
                    color="orange"
                    loading={resetPasswordMutation.isPending}
                    disabled={anyBusy}
                    onClick={() => resetPasswordMutation.mutate()}
                  >
                    Reset mat khau
                  </Button>
                ) : null}

                {canResetPassword && isPending ? (
                  <Button
                    size="sm"
                    variant="light"
                    loading={sendActivationMutation.isPending}
                    disabled={anyBusy}
                    onClick={() => sendActivationMutation.mutate()}
                  >
                    Gui email kich hoat
                  </Button>
                ) : null}

                {canLock && isActive ? (
                  <Button
                    size="sm"
                    variant="light"
                    color="red"
                    loading={lockMutation.isPending}
                    disabled={anyBusy}
                    onClick={() => lockMutation.mutate()}
                  >
                    Khoa tai khoan
                  </Button>
                ) : null}

                {canRestore && isLocked ? (
                  <Button
                    size="sm"
                    variant="light"
                    color="green"
                    loading={activateMutation.isPending}
                    disabled={anyBusy}
                    onClick={() => activateMutation.mutate()}
                  >
                    Mo khoa
                  </Button>
                ) : null}

                <Button
                  size="sm"
                  variant="subtle"
                  color="gray"
                  loading={revokeSessionsMutation.isPending}
                  disabled={anyBusy}
                  onClick={() => revokeSessionsMutation.mutate()}
                >
                  Thu hoi sessions
                </Button>
              </Group>
            </Stack>
          </Stack>
        )}
      </Drawer>

      <Modal
        opened={Boolean(resetResult)}
        onClose={() => setResetResult(null)}
        title="Mat khau tam thoi"
        size="sm"
      >
        {resetResult ? (
          <Stack>
            <Alert color="orange" title="Mat khau chi hien thi mot lan">
              Ban giao ngay cho nguoi dung qua kenh an toan.
            </Alert>

            <TextInput
              value={extractTemporaryPassword(resetResult) ?? ''}
              readOnly
              styles={{
                input: {
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                },
              }}
            />

            {extractTemporaryPassword(resetResult) ? (
              <CopyButton value={extractTemporaryPassword(resetResult) ?? ''}>
                {({ copied, copy }) => (
                  <Button
                    variant={copied ? 'filled' : 'light'}
                    color={copied ? 'teal' : 'blue'}
                    onClick={copy}
                  >
                    {copied ? 'Da copy' : 'Copy mat khau'}
                  </Button>
                )}
              </CopyButton>
            ) : null}

            <Text size="sm" c="dimmed">
              {resetResult.mustChangePassword
                ? 'Nguoi dung se phai doi mat khau khi dang nhap bang mat khau nay.'
                : 'Nguoi dung co the su dung ngay mat khau nay de vao he thong.'}
            </Text>

            <Button onClick={() => setResetResult(null)}>Dong</Button>
          </Stack>
        ) : null}
      </Modal>
    </>
  );
}
