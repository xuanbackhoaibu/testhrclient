import type { ComponentProps } from 'react';
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
import { useDisclosure } from '@mantine/hooks';
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
import { AUTH_ADMIN_PERMISSIONS } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import { formatDateTime } from '../../shared/utils/date';
import type { Employee } from './employeeTypes';
import { InfoRow as InfoRowBase } from '../../shared/components/InfoRow';

/** InfoRow của màn này: cố định bề rộng nhãn để các dòng thẳng cột. */
function InfoRow(props: Omit<ComponentProps<typeof InfoRowBase>, 'labelWidth'>) {
  return <InfoRowBase labelWidth={180} breakAll {...props} />;
}


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

export function AccountDetailDrawer({ employee, opened, onClose }: Props) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [confirmResetOpened, confirmReset] = useDisclosure(false);
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null);

  const canRead = can(AUTH_ADMIN_PERMISSIONS.USERS_READ);
  const canResetPassword = can(AUTH_ADMIN_PERMISSIONS.USERS_UPDATE);
  const canSendActivation = can(AUTH_ADMIN_PERMISSIONS.USERS_SEND_ACTIVATION);
  const canUpdateStatus = can(AUTH_ADMIN_PERMISSIONS.USERS_UPDATE);
  const canRevokeSessions = can(AUTH_ADMIN_PERMISSIONS.USERS_REVOKE_SESSIONS);

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
        // QUY ƯỚC NGHIỆP VỤ — KHÔNG ĐỔI SANG autoGenerate:
        // nút này phải trả tài khoản về mật khẩu mặc định của công ty, không
        // phải mật khẩu ngẫu nhiên. Giá trị mặc định do backend giữ, frontend
        // không hardcode. Chỉ màn quản trị /accounts mới cho phép sinh ngẫu nhiên.
        useDefaultPassword: true,
        mustChangePassword: true,
        notifyUser: false,
        reason: 'HR admin reset to default password',
      }),
    onSuccess: async (data) => {
      confirmReset.close();
      setResetResult(data);
      notifications.show({
        color: 'green',
        title: 'Đã reset mật khẩu',
        message: 'Nhân sự bắt buộc đổi mật khẩu khi đăng nhập lần đầu.',
      });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        message:
          (err as { message?: string })?.message ?? 'Lỗi reset mật khẩu.',
      });
    },
  });

  const sendActivationMutation = useMutation({
    mutationFn: () => sendActivation(authUser!.authUserId),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã gửi email kích hoạt.' });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        message: (err as { message?: string })?.message ?? 'Lỗi gửi email.',
      });
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => lockAccount(authUser!.authUserId, 'HR admin locked'),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã khóa tài khoản.' });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        message:
          (err as { message?: string })?.message ?? 'Lỗi khóa tài khoản.',
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => activateAccount(authUser!.authUserId, 'HR admin activated'),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã kích hoạt tài khoản.' });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        message: (err as { message?: string })?.message ?? 'Lỗi kích hoạt.',
      });
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: () => revokeSessions(authUser!.authUserId, 'HR admin revoke'),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        message: 'Đã thu hồi tất cả phiên đăng nhập.',
      });
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        message:
          (err as { message?: string })?.message ?? 'Lỗi thu hồi session.',
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
          confirmReset.close();
          setResetResult(null);
          onClose();
        }}
        title={`Tài khoản - ${employee.fullName}`}
        position="right"
        size="md"
      >
        {!canRead ? (
          <Alert color="blue">
            Bạn không có quyền xem thông tin tài khoản.
          </Alert>
        ) : isLoading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : error || !authUser ? (
          <Stack gap="sm">
            <Alert color="red" title="Không tải được thông tin tài khoản">
              Không kết nối được auth service.
            </Alert>
            <Button variant="light" onClick={() => void refetch()}>
              Thử lại
            </Button>
          </Stack>
        ) : (
          <Stack gap="lg">
            <Stack gap={6}>
              <Title order={6} c="dimmed">
                Thông tin tài khoản
              </Title>

              <InfoRow label="Auth User ID">
                <Group gap={4}>
                  <Code>{authUser.authUserId}</Code>
                  <CopyButton value={authUser.authUserId}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Đã sao chép' : 'Sao chép'}>
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
              <InfoRow label="Email đăng nhập">{authUser.email}</InfoRow>
              <InfoRow label="Trạng thái">
                <Badge color={statusColor(authUser.accountStatus)}>
                  {ACCOUNT_STATUS_LABELS[authUser.accountStatus] ??
                    authUser.accountStatus}
                </Badge>
              </InfoRow>
              <InfoRow label="Bắt buộc đổi mật khẩu">
                {authUser.mustChangePassword ? (
                  <Badge color="orange" variant="light">
                    Bắt buộc đổi
                  </Badge>
                ) : (
                  <Text size="sm" c="dimmed">
                    Không
                  </Text>
                )}
              </InfoRow>
              <InfoRow label="Permission version">
                {String(authUser.permissionVersion ?? '-')}
              </InfoRow>
              <InfoRow label="Token version">
                {String(authUser.tokenVersion ?? '-')}
              </InfoRow>
              <InfoRow label="Lần đăng nhập gần nhất">
                {authUser.lastLoginAt
                  ? formatDateTime(authUser.lastLoginAt)
                  : 'Chưa đăng nhập'}
              </InfoRow>
              <InfoRow label="Hoạt động gần nhất">
                {authUser.lastSeen ? formatDateTime(authUser.lastSeen) : '-'}
              </InfoRow>
              {authUser.createdAt ? (
                <InfoRow label="Ngày tạo tài khoản">
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
                    onClick={confirmReset.open}
                  >
                    Reset mật khẩu
                  </Button>
                ) : null}

                {canSendActivation && isPending ? (
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

                {canUpdateStatus && isActive ? (
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
                ) : null}

                {canUpdateStatus && isLocked ? (
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

                {canRevokeSessions ? (
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
                ) : null}
              </Group>
            </Stack>
          </Stack>
        )}
      </Drawer>

      <Modal
        opened={confirmResetOpened}
        onClose={confirmReset.close}
        title="Xác nhận reset mật khẩu"
        size="sm"
      >
        <Stack>
          <Text size="sm">
            Bạn có chắc muốn reset mật khẩu của tài khoản{' '}
            <Text span fw={600}>
              {employee.fullName}
            </Text>{' '}
            ve mac dinh?
          </Text>
          <Alert color="orange" variant="light">
            Tài khoản sẽ được đưa về mật khẩu mặc định của công ty và bị thu hồi
            toàn bộ phiên đăng nhập. Nhân sự bắt buộc đổi mật khẩu khi đăng nhập
            lần tới. Mật khẩu sẽ hiển thị sau khi reset để bàn giao.
          </Alert>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={confirmReset.close}
              disabled={resetPasswordMutation.isPending}
            >
              Huy
            </Button>
            <Button
              color="orange"
              loading={resetPasswordMutation.isPending}
              onClick={() => resetPasswordMutation.mutate()}
            >
              Reset mật khẩu
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={Boolean(resetResult)}
        onClose={() => setResetResult(null)}
        title="Mật khẩu mới"
        size="sm"
      >
        {resetResult ? (
          <Stack>
            <Alert
              color="orange"
              title={
                resetResult.usedDefaultPassword
                  ? 'Đã về mật khẩu mặc định'
                  : 'Mật khẩu chỉ hiển thị một lần'
              }
            >
              Bàn giao ngay cho người dùng qua kênh an toàn.
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
                    {copied ? 'Đã sao chép' : 'Sao chép mật khẩu'}
                  </Button>
                )}
              </CopyButton>
            ) : null}

            <Text size="sm" c="dimmed">
              {resetResult.mustChangePassword
                ? 'Người dùng sẽ phải đổi mật khẩu khi đăng nhập bằng mật khẩu này.'
                : 'Người dùng có thể sử dụng ngay mật khẩu này để vào hệ thống.'}
            </Text>

            <Button onClick={() => setResetResult(null)}>Đóng</Button>
          </Stack>
        ) : null}
      </Modal>
    </>
  );
}
