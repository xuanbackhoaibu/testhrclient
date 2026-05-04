import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  Loader,
  Menu,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconDots,
  IconKey,
  IconLock,
  IconLockOpen,
  IconPower,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUserOff,
  IconEye,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { HR_PERMISSIONS } from '../../features/auth/permissions';
import {
  forceChangePassword,
  listUsers,
  lockAccount,
  unlockAccount,
  deactivateAccount,
  activateAccount,
  softDeleteAccount,
  restoreAccount,
  resetPassword,
  revokeSessions,
  getEffectivePermissions,
} from '../../features/auth-admin/authAdminApi';
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATE_COLOR,
} from '../../features/auth-admin/authAdminTypes';
import type { AuthAdminUser } from '../../features/auth-admin/authAdminTypes';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'PENDING_ACTIVATION', label: 'Chờ kích hoạt' },
  { value: 'LOCKED', label: 'Bị khóa' },
  { value: 'DISABLED', label: 'Vô hiệu' },
  { value: 'DEACTIVATED', label: 'Đã vô hiệu' },
  { value: 'SOFT_DELETED', label: 'Đã xóa mềm' },
];

export function AccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const canProvision = can(HR_PERMISSIONS.PROVISION);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    user: AuthAdminUser;
    label: string;
    color: string;
  } | null>(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const [detailUser, setDetailUser] = useState<AuthAdminUser | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth-admin-users', debouncedSearch, status, page],
    queryFn: () =>
      listUsers({ search: debouncedSearch || undefined, status: status || undefined, page, pageSize: 20 }),
  });

  const { data: effectivePerms, isLoading: permsLoading } = useQuery({
    queryKey: ['effective-permissions', detailUser?.authUserId],
    queryFn: () => getEffectivePermissions(detailUser!.authUserId),
    enabled: !!detailUser && detailOpened,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['auth-admin-users'] });

  const forceChangeMutation = useMutation({
    mutationFn: (userId: string) => forceChangePassword(userId),
    onSuccess: () => { notifications.show({ color: 'green', message: 'Đã bật yêu cầu đổi mật khẩu.' }); invalidate(); },
    onError: (e: Error) => notifications.show({ color: 'red', message: e.message }),
  });

  const lifecycleMutation = useMutation({
    mutationFn: async ({ type, userId, reason }: { type: string; userId: string; reason: string }) => {
      switch (type) {
        case 'lock': return lockAccount(userId, reason);
        case 'unlock': return unlockAccount(userId, reason);
        case 'deactivate': return deactivateAccount(userId, reason);
        case 'activate': return activateAccount(userId, reason);
        case 'soft-delete': return softDeleteAccount(userId, reason);
        case 'restore': return restoreAccount(userId, reason);
        case 'revoke-sessions': return revokeSessions(userId, reason);
        default: throw new Error('Hành động không hợp lệ');
      }
    },
    onSuccess: () => {
      notifications.show({ color: 'green', message: 'Thực hiện thành công' });
      invalidate();
      closeConfirm();
      setConfirmReason('');
    },
    onError: (e: Error) => notifications.show({ color: 'red', message: e.message }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => resetPassword(userId, reason),
    onSuccess: (result) => {
      invalidate();
      closeConfirm();
      setConfirmReason('');
      setResetResult(result.tempPassword);
    },
    onError: (e: Error) => notifications.show({ color: 'red', message: e.message }),
  });

  const handleAction = (type: string, user: AuthAdminUser, label: string, color = 'blue') => {
    setConfirmAction({ type, user, label, color });
    setConfirmReason('');
    openConfirm();
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    if (type === 'reset-password') {
      resetPasswordMutation.mutate({ userId: user.authUserId, reason: confirmReason });
    } else {
      lifecycleMutation.mutate({ type, userId: user.authUserId, reason: confirmReason });
    }
  };

  const columns: DataTableColumn<AuthAdminUser>[] = [
    {
      key: 'employeeCode',
      header: 'Mã nhân sự',
      render: (r) => (
        <Text fw={500} size="sm" c={r.employeeCode ? undefined : 'dimmed'}>
          {r.employeeCode ?? '—'}
        </Text>
      ),
    },
    {
      key: 'username',
      header: 'Tên đăng nhập',
      render: (r) => <Text size="sm">{r.username ?? r.email}</Text>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (r) => <Text size="sm">{r.email}</Text>,
    },
    {
      key: 'accountState',
      header: 'Trạng thái',
      render: (r) => (
        <Badge color={ACCOUNT_STATE_COLOR[r.accountState] ?? 'gray'} size="sm" variant="light">
          {ACCOUNT_STATUS_LABELS[r.accountState] ?? r.accountState}
        </Badge>
      ),
    },
    {
      key: 'mustChangePassword',
      header: 'Đổi mật khẩu',
      render: (r) =>
        r.mustChangePassword ? (
          <Badge color="orange" size="sm" variant="light">Bắt buộc</Badge>
        ) : (
          <Text size="sm" c="dimmed">—</Text>
        ),
    },
    {
      key: 'lastLoginAt',
      header: 'Đăng nhập cuối',
      render: (r) => (
        <Text size="xs" c="dimmed">
          {r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString('vi-VN') : '—'}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <Group gap={4} justify="flex-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip label="Xem chi tiết">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => { setDetailUser(r); openDetail(); }}
            >
              <IconEye size={15} />
            </ActionIcon>
          </Tooltip>

          {canProvision && (
            <Menu withinPortal position="bottom-end" shadow="sm">
              <Menu.Target>
                <ActionIcon variant="subtle" size="sm">
                  <IconDots size={15} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Tài khoản</Menu.Label>

                {r.accountState === 'ACTIVE' && (
                  <Menu.Item
                    leftSection={<IconLock size={14} />}
                    color="orange"
                    onClick={() => handleAction('lock', r, 'Khoá tài khoản', 'orange')}
                  >
                    Khoá tài khoản
                  </Menu.Item>
                )}

                {(r.accountState === 'LOCKED') && (
                  <Menu.Item
                    leftSection={<IconLockOpen size={14} />}
                    color="green"
                    onClick={() => handleAction('unlock', r, 'Mở khoá tài khoản', 'green')}
                  >
                    Mở khoá
                  </Menu.Item>
                )}

                {r.accountState === 'ACTIVE' && (
                  <Menu.Item
                    leftSection={<IconUserOff size={14} />}
                    color="red"
                    onClick={() => handleAction('deactivate', r, 'Vô hiệu tài khoản', 'red')}
                  >
                    Vô hiệu tài khoản
                  </Menu.Item>
                )}

                {(r.accountState === 'DEACTIVATED' || r.accountState === 'DISABLED') && (
                  <Menu.Item
                    leftSection={<IconPower size={14} />}
                    color="green"
                    onClick={() => handleAction('activate', r, 'Kích hoạt tài khoản', 'green')}
                  >
                    Kích hoạt lại
                  </Menu.Item>
                )}

                {r.accountState !== 'TOMBSTONED' && (
                  <Menu.Item
                    leftSection={<IconTrash size={14} />}
                    color="red"
                    onClick={() => handleAction('soft-delete', r, 'Xoá mềm tài khoản', 'red')}
                  >
                    Xoá tài khoản
                  </Menu.Item>
                )}

                {r.accountState === 'TOMBSTONED' && (
                  <Menu.Item
                    leftSection={<IconRefresh size={14} />}
                    color="blue"
                    onClick={() => handleAction('restore', r, 'Khôi phục tài khoản', 'blue')}
                  >
                    Khôi phục
                  </Menu.Item>
                )}

                <Menu.Divider />

                <Menu.Item
                  leftSection={<IconKey size={14} />}
                  onClick={() => handleAction('reset-password', r, 'Reset mật khẩu', 'blue')}
                >
                  Reset mật khẩu
                </Menu.Item>

                <Menu.Item
                  leftSection={<IconKey size={14} />}
                  color="orange"
                  onClick={() => forceChangeMutation.mutate(r.authUserId)}
                >
                  Buộc đổi mật khẩu
                </Menu.Item>

                <Menu.Item
                  leftSection={<IconRefresh size={14} />}
                  onClick={() => handleAction('revoke-sessions', r, 'Thu hồi sessions', 'gray')}
                >
                  Thu hồi sessions
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      ),
    },
  ];

  return (
    <Stack gap="md">
      <PageHeader
        title="Quản lý tài khoản"
        subtitle="Danh sách tài khoản đăng nhập của nhân sự trong hệ thống"
        breadcrumbs={['Hệ thống', 'Tài khoản']}
      />

      <Group gap="sm">
        <TextInput
          placeholder="Tìm theo email, username, mã nhân sự..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
          w={320}
        />
        <Select
          data={STATUS_OPTIONS}
          value={status}
          onChange={(v) => { setStatus(v ?? ''); setPage(1); }}
          w={200}
          clearable={false}
        />
      </Group>

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        rowKey={(r) => r.authUserId}
        meta={data ? {
          total: data.total,
          page: data.page,
          pageSize: data.pageSize,
          totalPages: data.totalPages,
          hasNextPage: data.page < data.totalPages,
          hasPreviousPage: data.page > 1,
        } : undefined}
        loading={isLoading}
        error={error}
        emptyTitle="Không có tài khoản"
        emptyDescription="Chưa có tài khoản nào khớp với bộ lọc"
        onPageChange={(p) => setPage(p)}
        onRowClick={(r) => {
          if (r.employeeCode) {
            navigate(`/employees?search=${r.employeeCode}`);
          }
        }}
      />

      {/* Confirm action modal */}
      <Modal
        opened={confirmOpened}
        onClose={() => { closeConfirm(); setConfirmReason(''); }}
        title={confirmAction?.label ?? 'Xác nhận'}
        size="sm"
      >
        {confirmAction && (
          <Stack>
            <Text size="sm">
              Thực hiện <strong>{confirmAction.label}</strong> cho tài khoản{' '}
              <strong>{confirmAction.user.email}</strong>?
            </Text>
            {confirmAction.type === 'soft-delete' && (
              <Text size="xs" c="orange">
                Hành động này sẽ khoá vĩnh viễn và xoá mềm tài khoản. Có thể khôi phục sau.
              </Text>
            )}
            <Textarea
              label="Lý do (tuỳ chọn)"
              placeholder="Nhập lý do..."
              value={confirmReason}
              onChange={(e) => setConfirmReason(e.currentTarget.value)}
              rows={2}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => { closeConfirm(); setConfirmReason(''); }}>
                Hủy
              </Button>
              <Button
                color={confirmAction.color}
                loading={lifecycleMutation.isPending || resetPasswordMutation.isPending}
                onClick={handleConfirm}
              >
                Xác nhận
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Reset password result modal */}
      <Modal
        opened={!!resetResult}
        onClose={() => setResetResult(null)}
        title="Mật khẩu tạm thời"
        size="sm"
      >
        <Stack>
          <Text size="sm">
            Mật khẩu tạm thời đã được tạo. Vui lòng gửi cho người dùng qua kênh an toàn:
          </Text>
          <Text
            ff="monospace"
            fw={700}
            size="lg"
            ta="center"
            p="md"
            style={{ background: '#f8f9fa', borderRadius: 8 }}
          >
            {resetResult}
          </Text>
          <Text size="xs" c="orange">
            Người dùng sẽ bị yêu cầu đổi mật khẩu ngay sau khi đăng nhập.
          </Text>
          <Button onClick={() => setResetResult(null)}>Đóng</Button>
        </Stack>
      </Modal>

      {/* Detail drawer */}
      <Drawer
        opened={detailOpened}
        onClose={() => { closeDetail(); setDetailUser(null); }}
        title={detailUser ? `Tài khoản: ${detailUser.email}` : 'Chi tiết tài khoản'}
        position="right"
        size="lg"
      >
        {detailUser && (
          <Stack>
            <Box>
              <Text size="xs" c="dimmed">Username</Text>
              <Text size="sm" ff="monospace">{detailUser.username ?? '—'}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Mã nhân sự</Text>
              <Text size="sm">{detailUser.employeeCode ?? '—'}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Trạng thái</Text>
              <Badge color={ACCOUNT_STATE_COLOR[detailUser.accountState] ?? 'gray'} variant="light">
                {ACCOUNT_STATUS_LABELS[detailUser.accountState] ?? detailUser.accountState}
              </Badge>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Đăng nhập cuối</Text>
              <Text size="sm">{detailUser.lastLoginAt ? new Date(detailUser.lastLoginAt).toLocaleString('vi-VN') : '—'}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Buộc đổi mật khẩu</Text>
              <Text size="sm">{detailUser.mustChangePassword ? 'Có' : 'Không'}</Text>
            </Box>

            <Title order={5} mt="md">Quyền hiệu lực</Title>
            {permsLoading ? (
              <Group justify="center"><Loader size="sm" /></Group>
            ) : effectivePerms ? (
              <Stack gap="xs">
                <Text size="xs" c="dimmed">Roles: {effectivePerms.roles.join(', ') || '—'}</Text>
                <Text size="xs" c="dimmed">
                  Effective permissions ({effectivePerms.effectivePermissions.length}):
                </Text>
                <Box
                  style={{
                    maxHeight: 200,
                    overflow: 'auto',
                    background: '#f8f9fa',
                    borderRadius: 6,
                    padding: 8,
                  }}
                >
                  {effectivePerms.effectivePermissions.map((p) => (
                    <Text key={p} size="xs" ff="monospace">{p}</Text>
                  ))}
                </Box>
                {effectivePerms.directPermissions.length > 0 && (
                  <>
                    <Text size="xs" c="orange" fw={500}>
                      Quyền ngoại lệ: {effectivePerms.directPermissions.join(', ')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Quyền gán trực tiếp chỉ nên dùng cho trường hợp đặc biệt. Mọi thay đổi được ghi audit log.
                    </Text>
                  </>
                )}
              </Stack>
            ) : null}
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
