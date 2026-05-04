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
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconDots,
  IconEye,
  IconKey,
  IconLock,
  IconLockOpen,
  IconRefresh,
  IconSearch,
  IconShield,
  IconTrash,
  IconUserCheck,
  IconUserOff,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { AUTH_ADMIN_PERMISSIONS } from '../../features/auth/permissions';
import { AccountAuthorizationModal } from '../../features/auth-admin/AccountAuthorizationModal';
import { listAccountManagementRows } from '../../features/auth-admin/accountAuthorizationService';
import { useAccountAuthorization } from '../../features/auth-admin/useAccountAuthorization';
import {
  activateAccount,
  forceChangePassword,
  resetPassword,
  revokeSessions,
  softDeleteAccount,
  unlockAccount,
  lockAccount,
  deactivateAccount,
} from '../../features/auth-admin/authAdminApi';
import {
  ACCOUNT_STATE_COLOR,
  ACCOUNT_STATUS_LABELS,
  type AuthAdminUser,
} from '../../features/auth-admin/authAdminTypes';
import type { AccountManagementRow } from '../../features/auth-admin/accountAuthorizationTypes';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';

const STATUS_OPTIONS = [
  { value: '', label: 'Tat ca trang thai' },
  { value: 'ACTIVE', label: 'Dang hoat dong' },
  { value: 'PENDING_ACTIVATION', label: 'Cho kich hoat' },
  { value: 'LOCKED', label: 'Bi khoa' },
  { value: 'DISABLED', label: 'Vo hieu' },
  { value: 'DEACTIVATED', label: 'Da vo hieu' },
  { value: 'SOFT_DELETED', label: 'Da xoa mem' },
];

function accountDisplayName(row: AccountManagementRow) {
  return row.employee?.fullName ?? row.account.displayName ?? row.account.username ?? '-';
}

function unitName(row: AccountManagementRow) {
  return row.employee?.currentEmployeeAssignment?.unitName ?? row.employee?.unitName ?? '-';
}

function departmentName(row: AccountManagementRow) {
  return row.employee?.currentEmployeeAssignment?.departmentName ?? row.employee?.departmentName ?? '-';
}

function firstLoginStatus(account: AuthAdminUser) {
  if (account.mustChangePassword) {
    return { color: 'orange', label: 'Must change password' };
  }

  if (!account.lastLoginAt) {
    return { color: 'yellow', label: 'First login' };
  }

  return { color: 'green', label: 'Normal' };
}

function disabledTooltip(disabled: boolean) {
  return disabled ? 'Ban khong co quyen thuc hien thao tac nay' : '';
}

export function AccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can, hasAnyPermission } = useAuth();

  const canReadAccounts = can(AUTH_ADMIN_PERMISSIONS.USERS_READ);
  const canUpdateAccounts = hasAnyPermission([
    AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
    AUTH_ADMIN_PERMISSIONS.USERS_REVOKE_SESSIONS,
    AUTH_ADMIN_PERMISSIONS.USERS_SEND_ACTIVATION,
  ]);
  const canAuthorizeAccounts = hasAnyPermission([
    AUTH_ADMIN_PERMISSIONS.ROLES_ASSIGN,
    AUTH_ADMIN_PERMISSIONS.PERMISSIONS_ASSIGN,
    AUTH_ADMIN_PERMISSIONS.PERMISSION_GROUPS_ASSIGN,
    AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
  ]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    row: AccountManagementRow;
    label: string;
    color: string;
  } | null>(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<AccountManagementRow | null>(null);
  const [authorizationAccountId, setAuthorizationAccountId] = useState<string | null>(null);

  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);

  const accountsQuery = useQuery({
    queryKey: ['auth-admin-users', debouncedSearch, status, page],
    queryFn: () =>
      listAccountManagementRows({
        search: debouncedSearch || undefined,
        status: status || undefined,
        page,
        pageSize: 20,
      }),
    enabled: canReadAccounts,
  });

  const detailAuthorizationQuery = useAccountAuthorization(
    selectedRow?.account.authUserId ?? null,
    detailOpened,
  );
  const detailRoles = detailAuthorizationQuery.data?.roles ?? selectedRow?.roles ?? [];

  const invalidateList = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['auth-admin-users'] }),
      selectedRow?.account.authUserId
        ? queryClient.invalidateQueries({
            queryKey: ['account-authorization', selectedRow.account.authUserId],
          })
        : Promise.resolve(),
    ]);
  };

  const lifecycleMutation = useMutation({
    mutationFn: async ({
      type,
      userId,
      reason,
    }: {
      type: string;
      userId: string;
      reason: string;
    }) => {
      switch (type) {
        case 'lock':
          return lockAccount(userId, reason);
        case 'unlock':
          return unlockAccount(userId, reason);
        case 'deactivate':
          return deactivateAccount(userId, reason);
        case 'activate':
          return activateAccount(userId, reason);
        case 'soft-delete':
          return softDeleteAccount(userId, reason);
        case 'revoke-sessions':
          return revokeSessions(userId, reason);
        default:
          throw new Error('Hanh dong khong hop le');
      }
    },
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Thuc hien thanh cong.' });
      await invalidateList();
      closeConfirm();
      setConfirmReason('');
      if (selectedRow) {
        await detailAuthorizationQuery.refetch();
      }
    },
    onError: (error: Error) => {
      notifications.show({ color: 'red', message: error.message });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => resetPassword(userId, reason),
    onSuccess: async (result) => {
      await invalidateList();
      closeConfirm();
      setConfirmReason('');
      setResetResult(result.tempPassword);
    },
    onError: (error: Error) => {
      notifications.show({ color: 'red', message: error.message });
    },
  });

  const forceChangeMutation = useMutation({
    mutationFn: (userId: string) => forceChangePassword(userId),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Da bat yeu cau doi mat khau.' });
      await invalidateList();
      if (selectedRow) {
        await detailAuthorizationQuery.refetch();
      }
    },
    onError: (error: Error) => {
      notifications.show({ color: 'red', message: error.message });
    },
  });

  const handleAction = (
    type: string,
    row: AccountManagementRow,
    label: string,
    color = 'blue',
  ) => {
    setConfirmAction({ type, row, label, color });
    setConfirmReason('');
    openConfirm();
  };

  const handleConfirm = () => {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === 'reset-password') {
      resetPasswordMutation.mutate({
        userId: confirmAction.row.account.authUserId,
        reason: confirmReason,
      });
      return;
    }

    lifecycleMutation.mutate({
      type: confirmAction.type,
      userId: confirmAction.row.account.authUserId,
      reason: confirmReason,
    });
  };

  const columns: DataTableColumn<AccountManagementRow>[] = [
    {
      key: 'account',
      header: 'Ma nhan vien / username',
      render: (row) => (
        <Stack gap={2}>
          <Text fw={600} size="sm">
            {row.account.employeeCode ?? '-'}
          </Text>
          <Text size="xs" c="dimmed">
            {row.account.username ?? row.account.email}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'fullName',
      header: 'Ho ten',
      render: (row) => <Text size="sm">{accountDisplayName(row)}</Text>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <Text size="sm">{row.account.email}</Text>,
    },
    {
      key: 'unit',
      header: 'Don vi',
      render: (row) => <Text size="sm">{unitName(row)}</Text>,
    },
    {
      key: 'department',
      header: 'Phong ban',
      render: (row) => <Text size="sm">{departmentName(row)}</Text>,
    },
    {
      key: 'status',
      header: 'Trang thai tai khoan',
      render: (row) => (
        <Badge color={ACCOUNT_STATE_COLOR[row.account.accountState] ?? 'gray'} variant="light" size="sm">
          {ACCOUNT_STATUS_LABELS[row.account.accountState] ?? row.account.accountState}
        </Badge>
      ),
    },
    {
      key: 'roles',
      header: 'Vai tro hien tai',
      render: (row) => (
        <Group gap={4}>
          {row.roles.length === 0 ? (
            <Text size="sm" c="dimmed">
              -
            </Text>
          ) : (
            row.roles.slice(0, 2).map((role) => (
              <Badge key={role.code} size="sm" variant="light" color="blue">
                {role.code}
              </Badge>
            ))
          )}
          {row.roles.length > 2 ? (
            <Badge size="sm" variant="light" color="gray">
              +{row.roles.length - 2}
            </Badge>
          ) : null}
        </Group>
      ),
    },
    {
      key: 'firstLogin',
      header: 'First login / mustChangePassword',
      render: (row) => {
        const state = firstLoginStatus(row.account);
        return (
          <Badge color={state.color} variant="light" size="sm">
            {state.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Group gap={4} justify="flex-end" onClick={(event) => event.stopPropagation()}>
          <Tooltip label="Xem chi tiet">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => {
                setSelectedRow(row);
                openDetail();
              }}
            >
              <IconEye size={15} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={disabledTooltip(!canAuthorizeAccounts)}>
            <span>
              <ActionIcon
                variant="subtle"
                size="sm"
                disabled={!canAuthorizeAccounts}
                onClick={() => setAuthorizationAccountId(row.account.authUserId)}
              >
                <IconShield size={15} />
              </ActionIcon>
            </span>
          </Tooltip>

          <Tooltip label={disabledTooltip(!canUpdateAccounts)}>
            <span>
              <Menu withinPortal position="bottom-end" shadow="sm">
                <Menu.Target>
                  <ActionIcon variant="subtle" size="sm" disabled={!canUpdateAccounts}>
                    <IconDots size={15} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Tai khoan</Menu.Label>

                  {row.account.accountState === 'ACTIVE' ? (
                    <Menu.Item
                      leftSection={<IconLock size={14} />}
                      color="orange"
                      onClick={() => handleAction('lock', row, 'Khoa tai khoan', 'orange')}
                    >
                      Khoa tai khoan
                    </Menu.Item>
                  ) : null}

                  {row.account.accountState === 'LOCKED' ? (
                    <Menu.Item
                      leftSection={<IconLockOpen size={14} />}
                      color="green"
                      onClick={() => handleAction('unlock', row, 'Mo khoa tai khoan', 'green')}
                    >
                      Mo khoa
                    </Menu.Item>
                  ) : null}

                  {row.account.accountState === 'ACTIVE' ? (
                    <Menu.Item
                      leftSection={<IconUserOff size={14} />}
                      color="red"
                      onClick={() => handleAction('deactivate', row, 'Vo hieu tai khoan', 'red')}
                    >
                      Vo hieu tai khoan
                    </Menu.Item>
                  ) : null}

                  {row.account.accountState === 'DEACTIVATED' || row.account.accountState === 'DISABLED' ? (
                    <Menu.Item
                      leftSection={<IconUserCheck size={14} />}
                      color="green"
                      onClick={() => handleAction('activate', row, 'Kich hoat lai tai khoan', 'green')}
                    >
                      Kich hoat lai
                    </Menu.Item>
                  ) : null}

                  {row.account.accountState !== 'TOMBSTONED' ? (
                    <Menu.Item
                      leftSection={<IconTrash size={14} />}
                      color="red"
                      onClick={() => handleAction('soft-delete', row, 'Xoa mem tai khoan', 'red')}
                    >
                      Xoa mem
                    </Menu.Item>
                  ) : null}

                  <Menu.Divider />

                  <Menu.Item
                    leftSection={<IconKey size={14} />}
                    onClick={() => handleAction('reset-password', row, 'Reset mat khau', 'blue')}
                  >
                    Reset mat khau
                  </Menu.Item>

                  <Menu.Item
                    leftSection={<IconRefresh size={14} />}
                    color="orange"
                    onClick={() => forceChangeMutation.mutate(row.account.authUserId)}
                  >
                    Buoc doi mat khau
                  </Menu.Item>

                  <Menu.Item
                    leftSection={<IconRefresh size={14} />}
                    onClick={() => handleAction('revoke-sessions', row, 'Thu hoi session', 'gray')}
                  >
                    Thu hoi session
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </span>
          </Tooltip>
        </Group>
      ),
    },
  ];

  return (
    <Stack gap="md">
      <PageHeader
        title="Quan ly tai khoan"
        subtitle="Quan tri tai khoan dang nhap va phan quyen cho nhan su"
        breadcrumbs={['He thong', 'Tai khoan']}
      />

      <Group gap="sm">
        <TextInput
          placeholder="Tim theo email, username, ma nhan su..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
          w={360}
        />
        <Select
          data={STATUS_OPTIONS}
          value={status}
          onChange={(value) => {
            setStatus(value ?? '');
            setPage(1);
          }}
          w={220}
          clearable={false}
        />
      </Group>

      <DataTable
        data={accountsQuery.data?.data ?? []}
        columns={columns}
        rowKey={(row) => row.account.authUserId}
        meta={
          accountsQuery.data
            ? {
                total: accountsQuery.data.total,
                page: accountsQuery.data.page,
                pageSize: accountsQuery.data.pageSize,
                totalPages: accountsQuery.data.totalPages,
                hasNextPage: accountsQuery.data.page < accountsQuery.data.totalPages,
                hasPreviousPage: accountsQuery.data.page > 1,
              }
            : undefined
        }
        loading={accountsQuery.isLoading}
        error={accountsQuery.error}
        emptyTitle="Khong co tai khoan"
        emptyDescription="Chua co tai khoan nao khop voi bo loc"
        onPageChange={(nextPage) => setPage(nextPage)}
        onRowClick={(row) => {
          if (row.employee?.id) {
            navigate(`/employees/${row.employee.id}`);
            return;
          }

          if (row.account.employeeCode) {
            navigate(`/employees?search=${row.account.employeeCode}`);
          }
        }}
      />

      <Modal
        opened={confirmOpened}
        onClose={() => {
          closeConfirm();
          setConfirmReason('');
        }}
        title={confirmAction?.label ?? 'Xac nhan'}
        size="sm"
      >
        {confirmAction ? (
          <Stack>
            <Text size="sm">
              Thuc hien <strong>{confirmAction.label}</strong> cho tai khoan{' '}
              <strong>{confirmAction.row.account.email}</strong>?
            </Text>
            <TextInput
              label="Ly do (tuy chon)"
              placeholder="Nhap ly do"
              value={confirmReason}
              onChange={(event) => setConfirmReason(event.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeConfirm}>
                Huy
              </Button>
              <Button
                color={confirmAction.color}
                onClick={handleConfirm}
                loading={lifecycleMutation.isPending || resetPasswordMutation.isPending}
              >
                Xac nhan
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>

      <Modal
        opened={Boolean(resetResult)}
        onClose={() => setResetResult(null)}
        title="Mat khau tam thoi"
        size="sm"
      >
        <Stack>
          <Text size="sm">
            Mat khau tam thoi da duoc tao. Vui long gui cho nguoi dung qua kenh an toan:
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
          <Button onClick={() => setResetResult(null)}>Dong</Button>
        </Stack>
      </Modal>

      <Drawer
        opened={detailOpened}
        onClose={() => {
          closeDetail();
          setSelectedRow(null);
        }}
        title={selectedRow ? `Tai khoan: ${selectedRow.account.email}` : 'Chi tiet tai khoan'}
        position="right"
        size="lg"
      >
        {selectedRow ? (
          <Stack>
            <Box>
              <Text size="xs" c="dimmed">
                Ho ten
              </Text>
              <Text size="sm">{accountDisplayName(selectedRow)}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">
                Ma nhan vien
              </Text>
              <Text size="sm">{selectedRow.account.employeeCode ?? '-'}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">
                Don vi / phong ban
              </Text>
              <Text size="sm">
                {unitName(selectedRow)} / {departmentName(selectedRow)}
              </Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">
                Trang thai
              </Text>
              <Badge color={ACCOUNT_STATE_COLOR[selectedRow.account.accountState] ?? 'gray'} variant="light">
                {ACCOUNT_STATUS_LABELS[selectedRow.account.accountState] ?? selectedRow.account.accountState}
              </Badge>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">
                Vai tro hien tai
              </Text>
              <Group gap={4}>
                {detailRoles.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    -
                  </Text>
                ) : (
                  detailRoles.map((role) => (
                    <Badge key={role.code} color="blue" variant="light">
                      {role.code}
                    </Badge>
                  ))
                )}
              </Group>
            </Box>

            <Group justify="space-between" mt="sm">
              <Text fw={600}>Quyen hieu luc</Text>
              <Tooltip label={disabledTooltip(!canAuthorizeAccounts)}>
                <span>
                  <Button
                    size="xs"
                    leftSection={<IconShield size={14} />}
                    disabled={!canAuthorizeAccounts}
                    onClick={() => setAuthorizationAccountId(selectedRow.account.authUserId)}
                  >
                    Phan quyen
                  </Button>
                </span>
              </Tooltip>
            </Group>

            {detailAuthorizationQuery.isLoading ? (
              <Group justify="center" py="lg">
                <Loader size="sm" />
              </Group>
            ) : detailAuthorizationQuery.data ? (
              <Stack gap="xs">
                {detailAuthorizationQuery.data.effectivePermissions.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Khong co permission hieu luc nao.
                  </Text>
                ) : (
                  detailAuthorizationQuery.data.effectivePermissions.map((entry) => (
                    <Box
                      key={entry.permission.code}
                      p="sm"
                      style={{
                        border: '1px solid var(--mantine-color-gray-3)',
                        borderRadius: 8,
                      }}
                    >
                      <Text size="sm" fw={600}>
                        {entry.permission.code}
                      </Text>
                      <Group gap={4} mt={6}>
                        {entry.sources.map((source) => (
                          <Badge key={`${source.type}-${source.id}-${source.code}`} size="sm" variant="light">
                            {source.type}: {source.code}
                          </Badge>
                        ))}
                      </Group>
                    </Box>
                  ))
                )}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                Khong tai duoc thong tin quyen.
              </Text>
            )}
          </Stack>
        ) : null}
      </Drawer>

      <AccountAuthorizationModal
        accountId={authorizationAccountId}
        opened={Boolean(authorizationAccountId)}
        onClose={() => setAuthorizationAccountId(null)}
        onUpdated={async () => {
          await invalidateList();
          if (selectedRow?.account.authUserId === authorizationAccountId) {
            await detailAuthorizationQuery.refetch();
          }
        }}
      />
    </Stack>
  );
}
