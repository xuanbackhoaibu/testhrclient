import { useMemo, useState } from 'react';
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Switch,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus } from '@tabler/icons-react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../features/auth/useAuth';
import {
  getPermissionsGrouped,
  getRoles,
  getRole,
  addPermissionToRole,
  removePermissionFromRole,
  createPermission,
  updatePermission,
  deprecatePermission,
} from '../../features/auth-admin/authAdminApi';
import type {
  CreatePermissionInput,
  PermissionDefinition,
  RoleDetail,
  UpdatePermissionInput,
} from '../../features/auth-admin/authAdminTypes';
import { NormalizedSearchInput } from '../../shared/components/NormalizedSearchInput';
import { PageHeader } from '../../shared/components/PageHeader';
import { includesNormalizedSearch } from '../../shared/utils/normalizeSearchText';

const DOMAIN_LABEL: Record<string, string> = {
  hr: 'HRM',
  auth: 'Auth / IAM',
  admin: 'Admin',
  chat: 'Chat',
  document: 'Tài liệu',
};

export function PermissionsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canCreate = can('auth.permission.create');
  const canUpdate = can('auth.permission.update');
  const canDeprecate = can('auth.permission.deprecate');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [sensitivity, setSensitivity] = useState<'all' | 'sensitive' | 'standard'>('all');
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editPerm, setEditPerm] = useState<PermissionDefinition | null>(null);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [matrixChanges, setMatrixChanges] = useState<Record<string, boolean>>({});

  const [createForm, setCreateForm] = useState<CreatePermissionInput>({
    key: '',
    name: '',
    description: '',
    isSensitive: false,
  });
  const [editForm, setEditForm] = useState<UpdatePermissionInput>({});

  const { data, isLoading } = useQuery({
    queryKey: ['permissionsGrouped'],
    queryFn: () => getPermissionsGrouped(),
  });
  const { data: matrixRoles = [] } = useQuery({
    queryKey: ['roles', 'matrix-active'],
    queryFn: () => getRoles({ status: 'active' }),
  });
  const matrixRoleDetails = useQueries({
    queries: matrixRoles.slice(0, 8).map((role) => ({
      queryKey: ['role', 'matrix', role.id],
      queryFn: () => getRole(role.id!),
      enabled: Boolean(role.id),
    })),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreatePermissionInput) => createPermission(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionsGrouped'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      notifications.show({ message: 'Tạo permission thành công', color: 'green' });
      closeCreate();
      setCreateForm({ key: '', name: '', description: '', isSensitive: false });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePermissionInput }) =>
      updatePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionsGrouped'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      notifications.show({ message: 'Cập nhật permission thành công', color: 'green' });
      closeEdit();
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const deprecateMutation = useMutation({
    mutationFn: (permId: string) => deprecatePermission(permId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionsGrouped'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      notifications.show({ message: 'Đã vô hiệu permission', color: 'orange' });
      closeEdit();
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const saveMatrixMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(matrixChanges);
      await Promise.all(entries.map(([key, enabled]) => {
        const [roleId, permissionKey] = key.split('::');
        const detail = matrixRoleDetails.find((query) => query.data?.id === roleId)?.data as RoleDetail | undefined;
        const existing = detail?.permissions.find((permission) => permission.key === permissionKey);
        if (enabled) return addPermissionToRole(roleId, permissionKey);
        if (existing) return removePermissionFromRole(roleId, existing.id);
        return Promise.resolve();
      }));
    },
    onSuccess: async () => {
      setMatrixChanges({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['role'] }),
        queryClient.invalidateQueries({ queryKey: ['permissionsGrouped'] }),
      ]);
      notifications.show({ message: 'Đã lưu thay đổi ma trận quyền', color: 'green' });
    },
    onError: (e: Error) => notifications.show({ message: e.message, color: 'red' }),
  });

  const handleEdit = (perm: PermissionDefinition) => {
    setEditPerm(perm);
    setEditForm({ name: perm.name ?? '', description: perm.description ?? '', isSensitive: perm.isSensitive });
    openEdit();
  };

  const filteredSystems = useMemo(() => (data?.systems ?? [])
    .map((sys) => ({
      ...sys,
      permissions: sys.permissions.filter((p) => {
        const searchableText = [p.key, p.name, p.description, sys.domain, DOMAIN_LABEL[sys.domain]].join(' ');
        const matchesStatus = status === 'all' || p.status === status;
        const matchesSensitivity = sensitivity === 'all'
          || (sensitivity === 'sensitive' ? p.isSensitive : !p.isSensitive);
        return includesNormalizedSearch(searchableText, search) && matchesStatus && matchesSensitivity;
      }),
    }))
    .filter((sys) => sys.permissions.length > 0), [data?.systems, search, sensitivity, status]);

  const total = data?.total ?? 0;
  const matrixPermissions = useMemo(
    () => filteredSystems.flatMap((system) => system.permissions).slice(0, 24),
    [filteredSystems],
  );
  const matrixDetails = matrixRoleDetails
    .map((query) => query.data as RoleDetail | undefined)
    .filter(Boolean) as RoleDetail[];

  function hasMatrixPermission(role: RoleDetail, permissionKey: string) {
    const changeKey = `${role.id}::${permissionKey}`;
    if (changeKey in matrixChanges) return matrixChanges[changeKey];
    return role.permissions.some((permission) => permission.key === permissionKey);
  }

  return (
    <Box>
      <PageHeader
        title="Danh mục quyền"
        subtitle={`Tổng: ${total} quyền. Quản lý permission kỹ thuật theo hệ thống, trạng thái và mức độ nhạy cảm.`}
        breadcrumbs={['Phân quyền', 'Danh mục quyền']}
        actions={
          canCreate ? (
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Tạo permission
          </Button>
          ) : undefined
        }
      />

      <Group align="end" mb="md" gap="sm" className="list-filter-panel">
      <NormalizedSearchInput
        label="Tìm kiếm"
        placeholder="Tìm tên, mã quyền, mô tả hoặc nhóm..."
        value={search}
        onChange={setSearch}
        className="list-filter-search"
      />
      <Select
        aria-label="Lọc trạng thái permission"
        label="Trạng thái"
        value={status}
        onChange={(value) => setStatus((value as typeof status) ?? 'all')}
        data={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'active', label: 'Đang dùng' }, { value: 'disabled', label: 'Vô hiệu' }]}
        className="list-filter-control"
        allowDeselect={false}
      />
      <Select
        aria-label="Lọc mức độ nhạy cảm"
        label="Mức độ"
        value={sensitivity}
        onChange={(value) => setSensitivity((value as typeof sensitivity) ?? 'all')}
        data={[{ value: 'all', label: 'Tất cả' }, { value: 'sensitive', label: 'Nhạy cảm' }, { value: 'standard', label: 'Thông thường' }]}
        className="list-filter-control"
        allowDeselect={false}
      />
      {(search || status !== 'all' || sensitivity !== 'all') && (
        <Button variant="subtle" color="gray" onClick={() => { setSearch(''); setStatus('all'); setSensitivity('all'); }}>
          Xóa bộ lọc
        </Button>
      )}
      </Group>

      {isLoading ? (
        <Group justify="center" py="xl"><Loader /></Group>
      ) : (
        <Stack gap="md">
          <Paper withBorder radius="md" className="permission-matrix-shell">
            <Group justify="space-between" p="md">
              <Box>
                <Text fw={800}>Ma trận quyền tương tác</Text>
                <Text size="sm" c="dimmed">Hàng = quyền, cột = vai trò. Hiển thị tối đa 8 vai trò và 24 quyền theo bộ lọc hiện tại.</Text>
              </Box>
              <Badge variant="light">{Object.keys(matrixChanges).length} thay đổi chưa lưu</Badge>
            </Group>
            <ScrollArea type="auto">
              <Table miw={900} className="permission-matrix-table">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Quyền</Table.Th>
                    {matrixDetails.map((role) => (
                      <Table.Th key={role.id} ta="center">{role.name}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {matrixPermissions.map((permission) => (
                    <Table.Tr key={permission.id} className="permission-matrix-row">
                      <Table.Td>
                        <Text size="sm" fw={650}>{permission.name ?? permission.key}</Text>
                        <Text size="xs" c="dimmed" ff="monospace">{permission.key}</Text>
                      </Table.Td>
                      {matrixDetails.map((role) => {
                        const checked = hasMatrixPermission(role, permission.key);
                        return (
                          <Table.Td key={`${role.id}-${permission.key}`} ta="center" className={checked ? "permission-cell-enabled" : "permission-cell-disabled"}>
                            <Checkbox
                              aria-label={`${role.name} - ${permission.key}`}
                              checked={checked}
                              onChange={(event) =>
                                setMatrixChanges((current) => ({
                                  ...current,
                                  [`${role.id}::${permission.key}`]: event.currentTarget.checked,
                                }))
                              }
                            />
                          </Table.Td>
                        );
                      })}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>

          <Accordion multiple variant="separated">
            {filteredSystems.map((sys) => (
              <Accordion.Item key={sys.domain} value={sys.domain}>
                <Accordion.Control>
                  <Group gap="xs">
                    <Text fw={600}>{DOMAIN_LABEL[sys.domain] ?? sys.domain}</Text>
                    <Badge variant="light" size="sm">{sys.permissions.length}</Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {sys.permissions.map((perm) => (
                      <Group key={perm.id} justify="space-between" p="xs" className="resource-list-row">
                        <Stack gap={2}>
                          <Group gap="xs">
                            <Text size="xs" ff="monospace" c="blue">{perm.key}</Text>
                            {perm.isSensitive && (
                              <Badge color="red" variant="dot" size="xs">Nhạy cảm</Badge>
                            )}
                            {perm.status === 'disabled' && (
                              <Badge color="gray" variant="light" size="xs">Vô hiệu</Badge>
                            )}
                          </Group>
                          {perm.description && <Text size="xs" c="dimmed">{perm.description}</Text>}
                        </Stack>
                        {(canUpdate || canDeprecate) && (
                          <Tooltip label="Sửa permission">
                            <ActionIcon variant="subtle" size="sm" onClick={() => handleEdit(perm)}>
                              <IconEdit size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
            {filteredSystems.length === 0 && (
              <Text c="dimmed" ta="center" py="lg">Không tìm thấy permission nào</Text>
            )}
          </Accordion>
        </Stack>
      )}

      {Object.keys(matrixChanges).length > 0 ? (
        <Paper withBorder p="sm" className="permission-unsaved-bar">
          <Group justify="space-between">
            <Text fw={700}>{Object.keys(matrixChanges).length} thay đổi chưa lưu</Text>
            <Group>
              <Button variant="default" onClick={() => setMatrixChanges({})}>Hoàn tác</Button>
              <Button loading={saveMatrixMutation.isPending} onClick={() => saveMatrixMutation.mutate()}>Lưu</Button>
            </Group>
          </Group>
        </Paper>
      ) : null}

      {/* Create modal */}
      <Modal opened={createOpened} onClose={closeCreate} title="Tạo permission mới" size="md" className="entity-modal">
        <Stack>
          <TextInput
            label="Key"
            placeholder="vd: hr.employee.read"
            description="Bắt buộc dạng system.module.action (lowercase)"
            value={createForm.key}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setCreateForm((f) => ({ ...f, key: value }));
            }}
            required
          />
          <TextInput
            label="Tên hiển thị"
            value={createForm.name ?? ''}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setCreateForm((f) => ({ ...f, name: value }));
            }}
          />
          <Textarea
            label="Mô tả"
            value={createForm.description ?? ''}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setCreateForm((f) => ({ ...f, description: value }));
            }}
            rows={2}
          />
          <Switch
            label="Permission nhạy cảm"
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
              disabled={!createForm.key}
            >
              Tạo
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit modal */}
      <Modal
        opened={editOpened}
        onClose={closeEdit}
        title={`Sửa: ${editPerm?.key}`}
        size="md"
        className="entity-modal"
      >
        {editPerm && (
          <Stack>
            <Text size="xs" ff="monospace" c="blue">{editPerm.key}</Text>
            <TextInput
              label="Tên hiển thị"
              value={editForm.name ?? ''}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setEditForm((f) => ({ ...f, name: value }));
              }}
            />
            <Textarea
              label="Mô tả"
              value={editForm.description ?? ''}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setEditForm((f) => ({ ...f, description: value }));
              }}
              rows={2}
            />
            <Switch
              label="Permission nhạy cảm"
              checked={editForm.isSensitive ?? false}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                setEditForm((f) => ({ ...f, isSensitive: checked }));
              }}
            />
            <Group justify="space-between" mt="xs">
              {canDeprecate && editPerm.status !== 'disabled' && (
                <Button
                  color="red"
                  variant="light"
                  size="xs"
                  loading={deprecateMutation.isPending}
                  onClick={() => deprecateMutation.mutate(editPerm.id)}
                >
                  Vô hiệu permission
                </Button>
              )}
              <Group ml="auto">
                <Button variant="default" onClick={closeEdit}>Hủy</Button>
                {canUpdate && (
                  <Button
                    loading={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: editPerm.id, data: editForm })}
                  >
                    Lưu
                  </Button>
                )}
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
