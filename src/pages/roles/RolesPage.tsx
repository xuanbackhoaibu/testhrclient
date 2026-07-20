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
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconEye, IconPlus, IconSearch, IconShield, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../features/auth/useAuth';
import { AUTH_ADMIN_PERMISSIONS } from '../../features/auth/permissions';
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  addPermissionToRole,
  removePermissionFromRole,
  addPermissionGroupToRole,
  removePermissionGroupFromRole,
  getPermissions,
  getPermissionGroups,
} from '../../features/auth-admin/authAdminApi';
import type {
  CreateRoleInput,
  RoleDefinition,
  RoleDetail,
} from '../../features/auth-admin/authAdminTypes';

const STATUS_COLOR: Record<string, string> = { active: 'green', disabled: 'gray' };
const STATUS_LABEL: Record<string, string> = { active: 'Đang dùng', disabled: 'Vô hiệu' };

export function RolesPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canManage = can(AUTH_ADMIN_PERMISSIONS.ROLES_ASSIGN);

  const [search, setSearch] = useState('');
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [detailRoleId, setDetailRoleId] = useState<string | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);

  const [createForm, setCreateForm] = useState<CreateRoleInput>({
    key: '',
    name: '',
    description: '',
    isSensitive: false,
  });

  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [addPermKey, setAddPermKey] = useState('');
  const [addGroupId, setAddGroupId] = useState('');

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles', search],
    queryFn: () => getRoles({ search: search || undefined }),
  });

  const { data: detail, isLoading: detailLoading } = useQuery<RoleDetail>({
    queryKey: ['role', detailRoleId],
    queryFn: () => getRole(detailRoleId!),
    enabled: !!detailRoleId,
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions', 'active'],
    queryFn: () => getPermissions({ status: 'active' }),
    enabled: detailOpened,
  });

  const { data: allGroups = [] } = useQuery({
    queryKey: ['permissionGroups', 'active'],
    queryFn: () => getPermissionGroups({ status: 'active' }),
    enabled: detailOpened,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateRoleInput) => createRole(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      notifications.show({ message: 'Tạo role thành công', color: 'green' });
      closeCreate();
      setCreateForm({ key: '', name: '', description: '', isSensitive: false });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; status?: 'active' | 'disabled' } }) =>
      updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', detailRoleId] });
      notifications.show({ message: 'Cập nhật role thành công', color: 'green' });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const addPermMutation = useMutation({
    mutationFn: ({ roleId, key }: { roleId: string; key: string }) => addPermissionToRole(roleId, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', detailRoleId] });
      setAddPermKey('');
      notifications.show({ message: 'Đã thêm quyền vào role', color: 'green' });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const removePermMutation = useMutation({
    mutationFn: ({ roleId, permId }: { roleId: string; permId: string }) => removePermissionFromRole(roleId, permId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', detailRoleId] });
      notifications.show({ message: 'Đã xoá quyền khỏi role', color: 'green' });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const addGroupMutation = useMutation({
    mutationFn: ({ roleId, groupId }: { roleId: string; groupId: string }) => addPermissionGroupToRole(roleId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', detailRoleId] });
      setAddGroupId('');
      notifications.show({ message: 'Đã thêm nhóm quyền vào role', color: 'green' });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const removeGroupMutation = useMutation({
    mutationFn: ({ roleId, groupId }: { roleId: string; groupId: string }) => removePermissionGroupFromRole(roleId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', detailRoleId] });
      notifications.show({ message: 'Đã xoá nhóm quyền khỏi role', color: 'green' });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const handleOpenDetail = (role: RoleDefinition) => {
    setDetailRoleId(role.id ?? null);
    setEditName(role.name);
    setEditDesc(role.description ?? '');
    openDetail();
  };

  const availablePermOptions = allPermissions
    .filter((p) => !detail?.permissions?.some((dp) => dp.id === p.id))
    .map((p) => ({ value: p.key, label: p.key }));

  const availableGroupOptions = allGroups
    .filter((g) => !detail?.permissionGroups?.some((dg) => dg.id === g.id))
    .map((g) => ({ value: g.id, label: g.name }));

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={3}>Quản lý Role</Title>
        {canManage && (
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Tạo role
          </Button>
        )}
      </Group>

      <TextInput
        placeholder="Tìm theo tên, key, mô tả..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        mb="md"
        w={320}
      />

      {isLoading ? (
        <Group justify="center" py="xl"><Loader /></Group>
      ) : (
        <Stack gap="xs">
          {roles.map((role) => (
            <Group
              key={role.id ?? role.key}
              p="md"
              style={{ border: '1px solid #e9ecef', borderRadius: 8, cursor: 'pointer' }}
              onClick={() => handleOpenDetail(role)}
              justify="space-between"
            >
              <Group gap="md">
                <IconShield
                  size={20}
                  color={role.isSensitive ? '#fa5252' : '#228be6'}
                />
                <Stack gap={2}>
                  <Group gap="xs">
                    <Text fw={600} size="sm">{role.name}</Text>
                    {role.isSensitive && <Badge color="red" variant="light" size="xs">Nhạy cảm</Badge>}
                    {role.isSystem && <Badge color="blue" variant="light" size="xs">System</Badge>}
                  </Group>
                  <Text size="xs" ff="monospace" c="dimmed">{role.key}</Text>
                  {role.description && <Text size="xs" c="dimmed">{role.description}</Text>}
                </Stack>
              </Group>
              <Group gap="xs">
                <Badge color={STATUS_COLOR[role.status ?? 'active']} variant="light" size="sm">
                  {STATUS_LABEL[role.status ?? 'active']}
                </Badge>
                <Tooltip label="Xem chi tiết">
                  <ActionIcon variant="subtle" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenDetail(role); }}>
                    <IconEye size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          ))}
          {roles.length === 0 && <Text c="dimmed" ta="center" py="lg">Không có role nào</Text>}
        </Stack>
      )}

      {/* Create modal */}
      <Modal opened={createOpened} onClose={closeCreate} title="Tạo role mới" size="md">
        <Stack>
          <TextInput
            label="Key"
            placeholder="vd: hr_manager"
            description="Lowercase, dấu gạch dưới hoặc chấm"
            value={createForm.key}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setCreateForm((f) => ({ ...f, key: value }));
            }}
            required
          />
          <TextInput
            label="Tên hiển thị"
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
          <Switch
            label="Role nhạy cảm"
            checked={createForm.isSensitive}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              setCreateForm((f) => ({ ...f, isSensitive: checked }));
            }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreate}>Hủy</Button>
            <Button
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate(createForm)}
              disabled={!createForm.key || !createForm.name}
            >
              Tạo role
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Detail drawer */}
      <Drawer
        opened={detailOpened}
        onClose={() => { closeDetail(); setDetailRoleId(null); }}
        title={detail ? `Role: ${detail.name}` : 'Chi tiết role'}
        position="right"
        size="xl"
      >
        {detailLoading || !detail ? (
          <Group justify="center" py="xl"><Loader /></Group>
        ) : (
          <Tabs defaultValue="info">
            <Tabs.List>
              <Tabs.Tab value="info">Thông tin</Tabs.Tab>
              <Tabs.Tab value="groups">Nhóm quyền ({detail.permissionGroups?.length ?? 0})</Tabs.Tab>
              <Tabs.Tab value="perms">Quyền trực tiếp ({detail.permissions?.length ?? 0})</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="info" pt="md">
              <Stack>
                <Box>
                  <Text size="xs" c="dimmed">Key</Text>
                  <Text ff="monospace" size="sm">{detail.key}</Text>
                </Box>
                <Group gap="xs">
                  {detail.isSensitive && <Badge color="red" variant="light">Nhạy cảm</Badge>}
                  {detail.isSystem && <Badge color="blue" variant="light">System</Badge>}
                  <Badge color={STATUS_COLOR[detail.status ?? 'active']} variant="light">
                    {STATUS_LABEL[detail.status ?? 'active']}
                  </Badge>
                </Group>

                {canManage && !detail.isSystem && (
                  <Stack gap="xs" mt="md">
                    <TextInput label="Tên" value={editName} onChange={(e) => setEditName(e.currentTarget.value)} />
                    <Textarea label="Mô tả" value={editDesc} onChange={(e) => setEditDesc(e.currentTarget.value)} rows={2} />
                    <Group>
                      <Button
                        size="xs"
                        loading={updateMutation.isPending}
                        leftSection={<IconEdit size={14} />}
                        onClick={() => updateMutation.mutate({ id: detail.id, data: { name: editName, description: editDesc } })}
                      >
                        Lưu
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color={detail.status === 'active' ? 'orange' : 'green'}
                        onClick={() => updateMutation.mutate({
                          id: detail.id,
                          data: { status: detail.status === 'active' ? 'disabled' : 'active' },
                        })}
                      >
                        {detail.status === 'active' ? 'Vô hiệu role' : 'Kích hoạt role'}
                      </Button>
                    </Group>
                  </Stack>
                )}
                {detail.isSystem && (
                  <Text size="xs" c="orange" mt="xs">System role — chỉ sửa qua migration</Text>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="groups" pt="md">
              <Stack>
                {canManage && (
                  <Group>
                    <Select
                      placeholder="Chọn nhóm quyền..."
                      data={availableGroupOptions}
                      value={addGroupId}
                      onChange={(v) => setAddGroupId(v ?? '')}
                      searchable
                      style={{ flex: 1 }}
                    />
                    <Button size="xs" disabled={!addGroupId} loading={addGroupMutation.isPending}
                      onClick={() => addGroupMutation.mutate({ roleId: detail.id, groupId: addGroupId })}>
                      Thêm
                    </Button>
                  </Group>
                )}
                {(detail.permissionGroups ?? []).map((g) => (
                  <Group key={g.id} justify="space-between" p="xs" style={{ border: '1px solid #eee', borderRadius: 6 }}>
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>{g.name}</Text>
                      <Text size="xs" ff="monospace" c="blue">{g.key}</Text>
                    </Stack>
                    {canManage && (
                      <ActionIcon variant="subtle" color="red" size="sm" loading={removeGroupMutation.isPending}
                        onClick={() => removeGroupMutation.mutate({ roleId: detail.id, groupId: g.id })}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                ))}
                {(!detail.permissionGroups || detail.permissionGroups.length === 0) && (
                  <Text c="dimmed" size="sm">Role chưa có nhóm quyền nào</Text>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="perms" pt="md">
              <Stack>
                {canManage && (
                  <Group>
                    <Select
                      placeholder="Chọn quyền trực tiếp..."
                      data={availablePermOptions}
                      value={addPermKey}
                      onChange={(v) => setAddPermKey(v ?? '')}
                      searchable
                      style={{ flex: 1 }}
                    />
                    <Button size="xs" disabled={!addPermKey} loading={addPermMutation.isPending}
                      onClick={() => addPermMutation.mutate({ roleId: detail.id, key: addPermKey })}>
                      Thêm
                    </Button>
                  </Group>
                )}
                {(detail.permissions ?? []).map((p) => (
                  <Group key={p.id} justify="space-between" p="xs" style={{ border: '1px solid #eee', borderRadius: 6 }}>
                    <Stack gap={2}>
                      <Text size="xs" ff="monospace" c="blue">{p.key}</Text>
                      {p.description && <Text size="xs" c="dimmed">{p.description}</Text>}
                    </Stack>
                    {canManage && (
                      <ActionIcon variant="subtle" color="red" size="sm" loading={removePermMutation.isPending}
                        onClick={() => removePermMutation.mutate({ roleId: detail.id, permId: p.id })}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                ))}
                {(!detail.permissions || detail.permissions.length === 0) && (
                  <Text c="dimmed" size="sm">Role chưa có quyền trực tiếp nào</Text>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        )}
      </Drawer>
    </Box>
  );
}
