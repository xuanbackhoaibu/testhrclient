import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconKey, IconSearch } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { forceChangePassword, listUsers } from '../../features/auth-admin/authAdminApi';
import { ACCOUNT_STATUS_LABELS } from '../../features/auth-admin/authAdminTypes';
import type { AuthAdminUser } from '../../features/auth-admin/authAdminTypes';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'PENDING_ACTIVATION', label: 'Chờ kích hoạt' },
  { value: 'SUSPENDED', label: 'Tạm khóa' },
  { value: 'DISABLED', label: 'Vô hiệu hóa' },
];

function accountStatusColor(status: string) {
  switch (status) {
    case 'ACTIVE': return 'green';
    case 'PENDING_ACTIVATION':
    case 'INACTIVE': return 'yellow';
    case 'SUSPENDED':
    case 'LOCKED': return 'orange';
    case 'DISABLED':
    case 'DEACTIVATED': return 'red';
    default: return 'gray';
  }
}

export function AccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const forceChangeMutation = useMutation({
    mutationFn: (authUserId: string) => forceChangePassword(authUserId),
    onSuccess: () => {
      notifications.show({ color: 'green', message: 'Đã bật yêu cầu đổi mật khẩu.' });
      void queryClient.invalidateQueries({ queryKey: ['auth-admin-users'] });
    },
    onError: () => {
      notifications.show({ color: 'red', message: 'Không thể bật yêu cầu đổi mật khẩu.' });
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth-admin-users', debouncedSearch, status, page],
    queryFn: () =>
      listUsers({ search: debouncedSearch || undefined, status: status || undefined, page, pageSize: 20 }),
  });

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
      key: 'accountStatus',
      header: 'Trạng thái',
      render: (r) => (
        <Badge color={accountStatusColor(r.accountStatus)} size="sm" variant="light">
          {ACCOUNT_STATUS_LABELS[r.accountStatus] ?? r.accountStatus}
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
      key: 'actions',
      header: '',
      render: (r) => (
        <Group gap={4} justify="flex-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip label="Buộc đổi mật khẩu lần đăng nhập tới">
            <ActionIcon
              variant="subtle"
              color="orange"
              size="sm"
              loading={forceChangeMutation.isPending && forceChangeMutation.variables === r.authUserId}
              onClick={() => forceChangeMutation.mutate(r.authUserId)}
            >
              <IconKey size={15} />
            </ActionIcon>
          </Tooltip>
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
    </Stack>
  );
}
