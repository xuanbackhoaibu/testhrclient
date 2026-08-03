import {
  Alert,
  Badge,
  Button,
  Code,
  CopyButton,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconCopy,
  IconLock,
  IconLockOpen,
  IconMail,
  IconPlus,
  IconPower,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  getAuthUserByEmployeeId,
  provisionFromEmployee,
  revokeSessions,
  sendActivation,
  updateAccountStatus,
} from '../../../features/auth-admin/authAdminApi';
import { ACCOUNT_STATUS_LABELS } from '../../../features/auth-admin/authAdminTypes';
import { AUTH_ADMIN_PERMISSIONS } from '../../../features/auth/permissions';
import { useAuth } from '../../../features/auth/useAuth';
import type { Employee } from '../../../features/employees/employeeTypes';
import { api } from '../../../shared/api/httpClient';
import { LoadingState } from '../../../shared/components/LoadingState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { formatDateTime } from '../../../shared/utils/date';

interface Props {
  employee: Employee;
}

function accountStatusColor(status: string): string {
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
      <Text size="sm" c="dimmed" w={160} style={{ flexShrink: 0 }}>{label}</Text>
      <Text size="sm">{children}</Text>
    </Group>
  );
}

export function AccountTab({ employee }: Props) {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [provisionedPassword, setProvisionedPassword] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | {
    title: string;
    description: string;
    onConfirm: () => void;
  }>(null);

  const canRead = can(AUTH_ADMIN_PERMISSIONS.USERS_READ);
  const canCreate = can(AUTH_ADMIN_PERMISSIONS.USERS_PROVISION);
  const canSendActivation = can(AUTH_ADMIN_PERMISSIONS.USERS_SEND_ACTIVATION);
  const canUpdateStatus = can(AUTH_ADMIN_PERMISSIONS.USERS_UPDATE);
  const canRevokeSessions = can(AUTH_ADMIN_PERMISSIONS.USERS_REVOKE_SESSIONS);

  const { data: authUser, isLoading, error, refetch } = useQuery({
    queryKey: ['auth-user-by-employee', employee.id],
    queryFn: () => getAuthUserByEmployeeId(employee.id),
    enabled: canRead && Boolean(employee.authUserId),
    retry: (failCount, err: unknown) =>
      failCount < 1 && (err as { statusCode?: number })?.statusCode !== 404,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['auth-user-by-employee', employee.id] }),
      queryClient.invalidateQueries({ queryKey: ['employee-detail', employee.id] }),
    ]);
  };

  const provisionMutation = useMutation({
    mutationFn: async () => {
      const result = await provisionFromEmployee({
        hrmEmployeeId: employee.id,
        expectedEmployeeCode: employee.employeeCode,
        sendActivationEmail: false,
      });
      await api.patch(`/employees/${employee.id}/auth-link`, {
        authUserId: result.authUserId,
        accountStatus: result.accountStatus,
      });
      return result;
    },
    onSuccess: async (result) => {
      setCreateModalOpen(false);
      if (result.status === 'created' && result.initialCredential) {
        setProvisionedPassword(result.initialCredential);
      }
      notifications.show({
        color: 'green',
        message:
          result.status === 'created'
            ? 'Tạo tài khoản thành công.'
            : result.status === 'updated'
              ? 'Nhân sự đã có tài khoản — đã đồng bộ email/thông tin.'
              : 'Nhân sự đã có tài khoản — đã đồng bộ trạng thái.',
      });
      await invalidate();
    },
  });

  const sendActivationMutation = useMutation({
    mutationFn: () => sendActivation(authUser!.authUserId),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã gửi email kích hoạt.' });
      setConfirmAction(null);
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Gửi email kích hoạt thất bại.' });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: () =>
      updateAccountStatus(authUser!.authUserId, {
        status: 'SUSPENDED',
        revokeSessions: true,
        reason: 'HR admin suspended',
      }),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã tạm khóa tài khoản.' });
      setConfirmAction(null);
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Tạm khóa tài khoản thất bại.' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: () =>
      updateAccountStatus(authUser!.authUserId, {
        status: 'ACTIVE',
        reason: 'HR admin activated',
      }),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã kích hoạt tài khoản.' });
      setConfirmAction(null);
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Kích hoạt tài khoản thất bại.' });
    },
  });

  const disableMutation = useMutation({
    mutationFn: () =>
      updateAccountStatus(authUser!.authUserId, {
        status: 'DISABLED',
        revokeSessions: true,
        reason: 'HR admin disabled',
      }),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã vô hiệu hóa tài khoản.' });
      setConfirmAction(null);
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Vô hiệu hóa tài khoản thất bại.' });
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: () => revokeSessions(authUser!.authUserId, 'HR admin revoke sessions'),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã thu hồi tất cả phiên đăng nhập.' });
      setConfirmAction(null);
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Thu hồi session thất bại.' });
    },
  });

  if (!canRead) {
    return (
      <Alert color="blue" title="Không có quyền">
        Bạn không có quyền xem thông tin tài khoản nhân sự.
      </Alert>
    );
  }

  const hasAccount = Boolean(employee.authUserId);

  if (!hasAccount) {
    return (
      <Stack gap="md">
        {provisionedPassword ? (
          <Alert color="green" title="Tài khoản đã được tạo thành công">
            <Stack gap="xs">
              <Text size="sm">
                Tài khoản được tạo với <strong>mật khẩu mặc định</strong>. Hãy bàn giao cho nhân sự.
              </Text>
              <Group gap="xs" align="center">
                <TextInput
                  value={provisionedPassword}
                  readOnly
                  style={{ flex: 1 }}
                  styles={{ input: { fontFamily: 'monospace', fontWeight: 600 } }}
                />
                <CopyButton value={provisionedPassword}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Đã copy' : 'Copy mật khẩu'}>
                      <Button variant={copied ? 'filled' : 'light'} color={copied ? 'teal' : 'blue'} onClick={copy} leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}>
                        {copied ? 'Đã copy' : 'Copy'}
                      </Button>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              <Text size="xs" c="dimmed">
                Nhân sự bắt buộc đổi mật khẩu khi đăng nhập lần đầu. Mật khẩu này không thể xem lại sau khi đóng màn hình.
              </Text>
            </Stack>
          </Alert>
        ) : (
          <Alert color="yellow" title="Chưa có tài khoản đăng nhập">
            Tạo tài khoản để cấp quyền truy cập vào hệ thống cho nhân sự này.
          </Alert>
        )}
        {canCreate && !provisionedPassword && (
          <>
            <div>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setCreateModalOpen(true)}
              >
                Tạo tài khoản
              </Button>
            </div>

            <Modal
              title="Xác nhận tạo tài khoản"
              opened={createModalOpen}
              onClose={() => setCreateModalOpen(false)}
              size="md"
            >
              <Stack gap="xs" mb="md">
                <InfoRow label="Họ tên">{employee.fullName}</InfoRow>
                <InfoRow label="Mã nhân sự">{employee.employeeCode}</InfoRow>
                <InfoRow label="Email">
                  {employee.companyEmail ?? employee.personalEmail ?? (
                    <Text c="red" size="sm">Chưa có email</Text>
                  )}
                </InfoRow>
                <InfoRow label="Đơn vị">{employee.unitName ?? '-'}</InfoRow>
                <InfoRow label="Phòng ban">{employee.departmentName ?? '-'}</InfoRow>
              </Stack>
              <Text size="sm" c="dimmed" mb="md">
                Tài khoản sẽ được tạo ở trạng thái <strong>Hoạt động</strong> với mật khẩu ban đầu do hệ thống sinh tự động. Mật khẩu chỉ hiển thị một lần sau khi tạo.
              </Text>
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setCreateModalOpen(false)}>Hủy</Button>
                <Button
                  loading={provisionMutation.isPending}
                  disabled={provisionMutation.isPending}
                  onClick={() => provisionMutation.mutate()}
                >
                  Tạo tài khoản
                </Button>
              </Group>
            </Modal>
          </>
        )}
      </Stack>
    );
  }

  if (isLoading) return <LoadingState />;

  if (error || !authUser) {
    return (
      <Stack gap="md">
        <Alert color="blue" title="Auth User ID">
          <Group gap="xs">
            <Code>{employee.authUserId}</Code>
            <CopyButton value={employee.authUserId ?? ''}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Đã copy' : 'Copy'}>
                  <Button size="xs" variant="subtle" onClick={copy}>
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Alert>
        <ErrorState
          title="Không thể tải thông tin tài khoản"
          description="Không thể kết nối đến auth service."
          onRetry={() => void refetch()}
        />
      </Stack>
    );
  }

  const accountStatus = authUser.accountStatus;
  const isSuspended = accountStatus === 'SUSPENDED' || accountStatus === 'LOCKED';
  const isDisabled = accountStatus === 'DISABLED' || accountStatus === 'DEACTIVATED';
  const isPending = accountStatus === 'PENDING_ACTIVATION' || accountStatus === 'INACTIVE';
  const isActive = accountStatus === 'ACTIVE';

  const anyBusy =
    provisionMutation.isPending ||
    sendActivationMutation.isPending ||
    suspendMutation.isPending ||
    activateMutation.isPending ||
    disableMutation.isPending ||
    revokeSessionsMutation.isPending;

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="xs">
        <InfoRow label="Auth User ID">
          <Group gap={4}>
            <Code>{authUser.authUserId}</Code>
            <CopyButton value={authUser.authUserId}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Đã copy' : 'Copy'}>
                  <Button size="xs" variant="subtle" onClick={copy} p={2}>
                    {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </InfoRow>
        <InfoRow label="Email đăng nhập">{authUser.email}</InfoRow>
        <InfoRow label="Trạng thái">
          <Badge color={accountStatusColor(accountStatus)}>
            {ACCOUNT_STATUS_LABELS[accountStatus] ?? accountStatus}
          </Badge>
        </InfoRow>
        <InfoRow label="Permission Version">{authUser.permissionVersion ?? '-'}</InfoRow>
        <InfoRow label="Token Version">{authUser.tokenVersion ?? '-'}</InfoRow>
        <InfoRow label="Hoạt động lần cuối">
          {authUser.lastSeen ? formatDateTime(authUser.lastSeen) : 'Chưa đăng nhập'}
        </InfoRow>
      </SimpleGrid>

      <div>
        <Title order={6} mb="sm">Thao tác tài khoản</Title>
        <Group wrap="wrap" gap="sm">
          {canSendActivation && isPending && (
            <Button
              leftSection={<IconMail size={16} />}
              variant="light"
              loading={sendActivationMutation.isPending}
              disabled={anyBusy}
              onClick={() =>
                setConfirmAction({
                  title: 'Gửi email kích hoạt?',
                  description: 'Email kích hoạt sẽ được gửi đến địa chỉ email đã đăng ký.',
                  onConfirm: () => sendActivationMutation.mutate(),
                })
              }
            >
              Gửi email kích hoạt
            </Button>
          )}

          {canUpdateStatus && (isSuspended || isDisabled) && (
            <Button
              leftSection={<IconLockOpen size={16} />}
              variant="light"
              color="green"
              loading={activateMutation.isPending}
              disabled={anyBusy}
              onClick={() =>
                setConfirmAction({
                  title: 'Kích hoạt tài khoản?',
                  description: 'Tài khoản sẽ được khôi phục trạng thái hoạt động.',
                  onConfirm: () => activateMutation.mutate(),
                })
              }
            >
              Kích hoạt tài khoản
            </Button>
          )}

          {canUpdateStatus && isActive && (
            <Button
              leftSection={<IconLock size={16} />}
              variant="light"
              color="orange"
              loading={suspendMutation.isPending}
              disabled={anyBusy}
              onClick={() =>
                setConfirmAction({
                  title: 'Tạm khóa tài khoản?',
                  description: 'Tài khoản sẽ bị khóa và tất cả phiên đăng nhập hiện tại sẽ bị thu hồi.',
                  onConfirm: () => suspendMutation.mutate(),
                })
              }
            >
              Tạm khóa
            </Button>
          )}

          {canUpdateStatus && !isDisabled && (
            <Button
              leftSection={<IconPower size={16} />}
              variant="light"
              color="red"
              loading={disableMutation.isPending}
              disabled={anyBusy}
              onClick={() =>
                setConfirmAction({
                  title: 'Vô hiệu hóa tài khoản?',
                  description: 'Tài khoản sẽ bị vô hiệu hóa vĩnh viễn và không thể đăng nhập.',
                  onConfirm: () => disableMutation.mutate(),
                })
              }
            >
              Vô hiệu hóa
            </Button>
          )}

          {canRevokeSessions && (
            <Button
              variant="light"
              loading={revokeSessionsMutation.isPending}
              disabled={anyBusy}
              onClick={() =>
                setConfirmAction({
                  title: 'Thu hồi tất cả phiên đăng nhập?',
                  description: 'Người dùng sẽ bị đăng xuất khỏi tất cả thiết bị.',
                  onConfirm: () => revokeSessionsMutation.mutate(),
                })
              }
            >
              Thu hồi sessions
            </Button>
          )}
        </Group>
      </div>

      <Modal
        title={confirmAction?.title ?? ''}
        opened={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        size="sm"
      >
        <Text size="sm" mb="lg">{confirmAction?.description}</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmAction(null)}>Hủy</Button>
          <Button
            loading={anyBusy}
            onClick={() => confirmAction?.onConfirm()}
          >
            Xác nhận
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
