import { useState } from 'react';
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea,
  Select,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconEye, IconPlus, IconTrash } from '@tabler/icons-react';
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
import { NormalizedSearchInput } from '../../shared/components/NormalizedSearchInput';
import { PageHeader } from '../../shared/components/PageHeader';
import { useImeSafeSelectFilter } from '../../shared/hooks/useImeSafeSelectFilter';

const STATUS_LABEL: Record<string, string> = { active: 'Đang dùng', inactive: 'Vô hiệu' };
const STATUS_COLOR: Record<string, string> = { active: 'green', inactive: 'gray' };

export function PermissionGroupsPage() {
  const selectSearch = useImeSafeSelectFilter();
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
        subtitle="Gom các quyền con theo nghiệp vụ để gán nhanh cho vai trò."
        breadcrumbs={['Phân quyền', 'Nhóm quyền']}
        actions={canManage ? (
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Tạo nhóm quyền
          </Button>
        ) : undefined}
      />

      <Group mb="md">
        <NormalizedSearchInput
          placeholder="Tìm theo tên, key..."
          value={search}
          onChange={setSearch}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="Lọc hệ thống"
          data={systemOptions}
          value={systemFilter}
          onChange={setSystemFilter}
          clearable
          w={160}
        />
      </Group>

      {isLoading ? (
        <Group justify="center" py="xl"><Loader /></Group>
      ) : (
        <Accordion multiple variant="separated" className="permission-group-accordion">
            {groups.map((group) => (
              <Accordion.Item key={group.id} value={group.id}>
                <Accordion.Control>
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={2}>
                      <Group gap="xs">
                        <Text fw={750}>{group.name}</Text>
                        <Badge color={STATUS_COLOR[group.status] ?? 'gray'} variant="light" size="sm">
                          {STATUS_LABEL[group.status] ?? group.status}
                        </Badge>
                      </Group>
                      <Text size="xs" ff="monospace" c="dimmed">{group.key}</Text>
                      {group.description ? <Text size="xs" c="dimmed">{group.description}</Text> : null}
                    </Stack>
                    <Group gap="xs">
                      <Badge variant="light">{group.permissionCount ?? 0} quyền</Badge>
                      <Badge variant="light" color="gray">Vai trò: chưa có số liệu</Badge>
                      <Badge variant="light" size="sm">{group.system ?? '—'}</Badge>
                    </Group>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <Button size="xs" variant="light" leftSection={<IconEye size={14} />} onClick={() => handleOpenDetail(group)}>
                      Xem / chỉnh nhóm quyền
                    </Button>
                    <Text size="sm" c="dimmed">
                      Mở chi tiết để xem đầy đủ quyền con, mô tả và thao tác thêm/bớt quyền.
                    </Text>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
            {groups.length === 0 && (
              <Text c="dimmed" ta="center" py="lg">Không có nhóm quyền nào</Text>
            )}
        </Accordion>
      )}

      {/* Create modal */}
      <Modal
        opened={createOpened}
        onClose={closeCreate}
        title="Tạo nhóm quyền"
        size="md"
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

      {/* Ngăn kéo chi tiết */}
      <Drawer
        opened={detailOpened}
        onClose={() => { closeDetail(); setDetailGroupId(null); setEditGroup(null); }}
        title={detail ? `Nhóm: ${detail.name}` : 'Nhóm quyền'}
        position="right"
        size="lg"
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
                  {...selectSearch}
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
                <Group key={perm.id} justify="space-between" p="xs" style={{ border: '1px solid #eee', borderRadius: 6 }}>
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
