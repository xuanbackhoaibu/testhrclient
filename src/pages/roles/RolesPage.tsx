import { useState } from 'react';
import {
  Badge,
  Card,
  Divider,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSearch, IconShield, IconShieldCheck } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import { getRoles, getPermissionsGrouped } from '../../features/auth-admin/authAdminApi';
import type { RoleDefinition } from '../../features/auth-admin/authAdminTypes';
import { SENSITIVE_ROLES } from '../../features/auth-admin/authAdminTypes';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';

export function RolesPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RoleDefinition | null>(null);

  const { data: roles, isLoading, error } = useQuery({
    queryKey: ['auth-admin-roles'],
    queryFn: getRoles,
  });

  const { data: permissionsData } = useQuery({
    queryKey: ['auth-admin-permissions-grouped'],
    queryFn: getPermissionsGrouped,
    enabled: Boolean(selected),
  });

  const filtered = (roles ?? []).filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      (r.key ?? '').toLowerCase().includes(term) ||
      (r.description ?? '').toLowerCase().includes(term)
    );
  });

  const columns: DataTableColumn<RoleDefinition>[] = [
    {
      key: 'name',
      header: 'Tên role',
      render: (r) => (
        <Group gap="xs">
          {SENSITIVE_ROLES.has(r.key ?? r.name) ? (
            <IconShieldCheck size={16} color="var(--mantine-color-red-6)" />
          ) : (
            <IconShield size={16} color="var(--mantine-color-blue-6)" />
          )}
          <Text fw={500} size="sm">{r.name}</Text>
        </Group>
      ),
    },
    {
      key: 'key',
      header: 'Khóa',
      render: (r) => (
        <Text size="sm" c="dimmed" ff="monospace">{r.key ?? r.name}</Text>
      ),
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (r) => <Text size="sm">{r.description ?? '—'}</Text>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (r) => (
        <Badge
          color={r.status === 'active' || !r.status ? 'green' : 'gray'}
          variant="light"
          size="sm"
        >
          {r.status === 'active' || !r.status ? 'Đang hoạt động' : 'Tạm ngừng'}
        </Badge>
      ),
    },
    {
      key: 'sensitive',
      header: 'Nhạy cảm',
      render: (r) =>
        r.isSensitive || SENSITIVE_ROLES.has(r.key ?? r.name) ? (
          <Badge color="red" variant="light" size="sm">Nhạy cảm</Badge>
        ) : null,
    },
  ];

  return (
    <Stack gap="md">
      <PageHeader
        title="Quản lý Role"
        subtitle="Danh sách các vai trò trong hệ thống và quyền tương ứng"
        breadcrumbs={['Hệ thống', 'Role']}
      />

      <TextInput
        placeholder="Tìm theo tên role, key..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        w={320}
      />

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(r) => r.id ?? r.key ?? r.name}
        loading={isLoading}
        error={error}
        emptyTitle="Không có role nào"
        emptyDescription="Chưa có role nào được cấu hình trong hệ thống"
        onRowClick={setSelected}
      />

      <Modal
        opened={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={
          <Group gap="xs">
            <IconShield size={18} />
            <Title order={4}>{selected?.name}</Title>
          </Group>
        }
        size="lg"
      >
        {selected && (
          <Stack gap="sm">
            <Group gap="xs">
              <Text size="sm" c="dimmed">Key:</Text>
              <Text size="sm" ff="monospace">{selected.key ?? selected.name}</Text>
            </Group>
            {selected.description && (
              <Group gap="xs">
                <Text size="sm" c="dimmed">Mô tả:</Text>
                <Text size="sm">{selected.description}</Text>
              </Group>
            )}
            <Divider label="Danh sách quyền trong role" labelPosition="left" mt="xs" />
            {permissionsData ? (
              <ScrollArea h={300}>
                <Stack gap={4}>
                  {permissionsData.systems.map((system) => (
                    <div key={system.domain}>
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={4}>{system.domain}</Text>
                      {system.permissions.map((p) => (
                        <Card key={p.id} p="xs" withBorder mb={4} radius="sm">
                          <Group justify="space-between">
                            <Text size="sm" ff="monospace">{p.key}</Text>
                            {p.description && (
                              <Text size="xs" c="dimmed">{p.description}</Text>
                            )}
                          </Group>
                        </Card>
                      ))}
                    </div>
                  ))}
                </Stack>
              </ScrollArea>
            ) : (
              <Text size="sm" c="dimmed">Đang tải danh sách quyền...</Text>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
