import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  Select,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconEye, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../features/auth/useAuth';
import {
  getPermissionGroups,
  getPermissionGroup,
  createPermissionGroup,
  updatePermissionGroup,
  addPermissionToGroup,
  removePermissionFromGroup,
  getPermissions,
} from '../../features/auth-admin/authAdminApi';
import type {
  CreatePermissionGroupInput,
  PermissionGroupDefinition,
} from '../../features/auth-admin/authAdminTypes';
import { PageHeader } from '../../shared/components/PageHeader';

const STATUS_LABEL: Record<string, string> = { active: 'Đang dùng', inactive: 'Vô hiệu' };
const STATUS_COLOR: Record<string, string> = { active: 'green', inactive: 'gray' };

export function PermissionGroupsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canManage = can('auth.permission_group.manage');

  const [search, setSearch] = useState('');
  const [systemFilter, setSystemFilter] = useState<string | null>(null);

  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);

  const [createForm, setCreateForm] = useState<CreatePermissionGroupInput>({
    key: '',
    name: '',
    description: '',
    system: '',
    module: '',
  });

  const [editGroup, setEditGroup] = useState<{ name: string; description: string } | null>(null);
  const [addPermKey, setAddPermKey] = useState('');

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['permissionGroups', search, systemFilter],
    queryFn: () => getPermissionGroups({
      search: search || undefined,
      system: systemFilter || undefined,
    }),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['permissionGroup', detailGroupId],
    queryFn: () => getPermissionGroup(detailGroupId!),
    enabled: !!detailGroupId,
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions', 'active'],
    queryFn: () => getPermissions({ status: 'active' }),
    enabled: detailOpened,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreatePermissionGroupInput) => createPermissionGroup(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionGroups'] });
      notifications.show({ message: 'Tạo nhóm quyền thành công', color: 'green' });
      closeCreate();
      setCreateForm({ key: '', name: '', description: '', system: '', module: '' });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; status?: 'active' | 'inactive' } }) =>
      updatePermissionGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionGroups'] });
      queryClient.invalidateQueries({ queryKey: ['permissionGroup', detailGroupId] });
      notifications.show({ message: 'Cập nhật thành công', color: 'green' });
      setEditGroup(null);
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const addPermMutation = useMutation({
    mutationFn: ({ groupId, key }: { groupId: string; key: string }) =>
      addPermissionToGroup(groupId, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionGroup', detailGroupId] });
      setAddPermKey('');
      notifications.show({ message: 'Đã thêm quyền vào nhóm', color: 'green' });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const removePermMutation = useMutation({
    mutationFn: ({ groupId, permissionId }: { groupId: string; permissionId: string }) =>
      removePermissionFromGroup(groupId, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionGroup', detailGroupId] });
      notifications.show({ message: 'Đã xoá quyền khỏi nhóm', color: 'green' });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const systemOptions = Array.from(new Set(groups.map((g) => g.system).filter(Boolean)))
    .map((s) => ({ value: s as string, label: s as string }));

  const handleOpenDetail = (group: PermissionGroupDefinition) => {
    setDetailGroupId(group.id);
    setEditGroup({ name: group.name, description: group.description ?? '' });
    openDetail();
  };

  const permOptions = allPermissions
    .filter((p) => !detail?.permissions?.some((dp) => dp.id === p.id))
    .map((p) => ({ value: p.key, label: p.key }));

  return (
    <Box>
      <PageHeader
        title="Nhóm quyền"
        subtitle="Quản lý các nhóm permission dùng để gán nhanh cho vai trò và tài khoản."
        breadcrumbs={['Phân quyền', 'Nhóm quyền']}
        actions={
          canManage ? (
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Tạo nhóm quyền
          </Button>
          ) : undefined
        }
      />

      <Group mb="md" className="list-filter-panel">
        <TextInput
          label="Tìm kiếm"
          placeholder="Tìm theo tên, key..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className="list-filter-search"
        />
        <Select
          label="Hệ thống"
          placeholder="Lọc hệ thống"
          data={systemOptions}
          value={systemFilter}
          onChange={setSystemFilter}
          clearable
          className="list-filter-control"
        />
      </Group>

      {isLoading ? (
        <Group justify="center" py="xl"><Loader /></Group>
      ) : (
        <Box className="data-table-shell">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Key</Table.Th>
              <Table.Th>Tên</Table.Th>
              <Table.Th>Hệ thống</Table.Th>
              <Table.Th>Số quyền</Table.Th>
              <Table.Th>Trạng thái</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {groups.map((group) => (
              <Table.Tr key={group.id}>
                <Table.Td>
                  <Text size="sm" ff="monospace" c="blue">{group.key}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{group.name}</Text>
                  {group.description && (
                    <Text size="xs" c="dimmed" lineClamp={1}>{group.description}</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" size="sm">{group.system ?? '—'}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{group.permissionCount ?? 0}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLOR[group.status] ?? 'gray'} variant="light" size="sm">
                    {STATUS_LABEL[group.status] ?? group.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Tooltip label="Xem chi tiết">
                    <ActionIcon variant="subtle" onClick={() => handleOpenDetail(group)}>
                      <IconEye size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
            {groups.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center" py="lg">Không có nhóm quyền nào</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
        </Box>
      )}

      {/* Create modal */}
      <Modal
        opened={createOpened}
        onClose={closeCreate}
        title="Tạo nhóm quyền"
        size="md"
        className="entity-modal"
      >
        <Stack>
          <TextInput
            label="Key"
            placeholder="vd: hr.employee.management"
            description="Dạng dotted lowercase"
            value={createForm.key}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setCreateForm((f) => ({ ...f, key: value }));
            }}
            required
          />
          <TextInput
            label="Tên"
            placeholder="Quản lý nhân viên HR"
            value={createForm.name}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setCreateForm((f) => ({ ...f, name: value }));
            }}
            required
          />
          <Textarea
            label="Mô tả"
            value={createForm.description}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setCreateForm((f) => ({ ...f, description: value }));
            }}
            rows={2}
          />
          <Group grow>
            <TextInput
              label="Hệ thống"
              placeholder="hr"
              value={createForm.system}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setCreateForm((f) => ({ ...f, system: value }));
              }}
            />
            <TextInput
              label="Module"
              placeholder="employee"
              value={createForm.module}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setCreateForm((f) => ({ ...f, module: value }));
              }}
            />
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreate}>Hủy</Button>
            <Button
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate(createForm)}
              disabled={!createForm.key || !createForm.name}
            >
              Tạo nhóm
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Detail drawer */}
      <Drawer
        opened={detailOpened}
        onClose={() => { closeDetail(); setDetailGroupId(null); setEditGroup(null); }}
        title={detail ? `Nhóm: ${detail.name}` : 'Nhóm quyền'}
        position="right"
        size="lg"
        className="entity-drawer"
      >
        {detailLoading || !detail ? (
          <Group justify="center" py="xl"><Loader /></Group>
        ) : (
          <Stack>
            <Text size="sm" ff="monospace" c="blue">{detail.key}</Text>

            {canManage && editGroup && (
              <Stack gap="xs">
                <TextInput
                  label="Tên"
                  value={editGroup.name}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setEditGroup((g) => g ? { ...g, name: value } : g);
                  }}
                />
                <Textarea
                  label="Mô tả"
                  value={editGroup.description}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setEditGroup((g) => g ? { ...g, description: value } : g);
                  }}
                  rows={2}
                />
                <Group justify="flex-end">
                  <Button
                    size="xs"
                    loading={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({
                      id: detail.id,
                      data: { name: editGroup.name, description: editGroup.description },
                    })}
                    leftSection={<IconEdit size={14} />}
                  >
                    Lưu thay đổi
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color={detail.status === 'active' ? 'orange' : 'green'}
                    onClick={() => updateMutation.mutate({
                      id: detail.id,
                      data: { status: detail.status === 'active' ? 'inactive' : 'active' },
                    })}
                  >
                    {detail.status === 'active' ? 'Vô hiệu nhóm' : 'Kích hoạt nhóm'}
                  </Button>
                </Group>
              </Stack>
            )}

            <Text fw={600} size="sm" mt="md">
              Danh sách quyền ({detail.permissions?.length ?? 0})
            </Text>

            {canManage && (
              <Group>
                <Select
                  placeholder="Chọn quyền để thêm..."
                  data={permOptions}
                  value={addPermKey}
                  onChange={(v) => setAddPermKey(v ?? '')}
                  searchable
                  style={{ flex: 1 }}
                />
                <Button
                  size="xs"
                  disabled={!addPermKey}
                  loading={addPermMutation.isPending}
                  onClick={() => addPermMutation.mutate({ groupId: detail.id, key: addPermKey })}
                >
                  Thêm
                </Button>
              </Group>
            )}

            <Stack gap="xs">
              {(detail.permissions ?? []).map((perm) => (
                <Group key={perm.id} justify="space-between" p="xs" className="resource-list-row">
                  <Stack gap={2}>
                    <Text size="xs" ff="monospace" c="blue">{perm.key}</Text>
                    {perm.description && <Text size="xs" c="dimmed">{perm.description}</Text>}
                  </Stack>
                  {canManage && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      loading={removePermMutation.isPending}
                      onClick={() => removePermMutation.mutate({ groupId: detail.id, permissionId: perm.id })}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  )}
                </Group>
              ))}
              {(!detail.permissions || detail.permissions.length === 0) && (
                <Text c="dimmed" size="sm">Nhóm chưa có quyền nào</Text>
              )}
            </Stack>
          </Stack>
        )}
      </Drawer>
    </Box>
  );
}
