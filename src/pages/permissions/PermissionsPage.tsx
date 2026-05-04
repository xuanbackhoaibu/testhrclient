import { useState } from 'react';
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconSearch } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../features/auth/useAuth';
import { HR_PERMISSIONS } from '../../features/auth/permissions';
import {
  getPermissionsGrouped,
  createPermission,
  updatePermission,
  deprecatePermission,
} from '../../features/auth-admin/authAdminApi';
import type {
  CreatePermissionInput,
  PermissionDefinition,
  UpdatePermissionInput,
} from '../../features/auth-admin/authAdminTypes';

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
  const canManage = can(HR_PERMISSIONS.AUTHORITY_WRITE);

  const [search, setSearch] = useState('');
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editPerm, setEditPerm] = useState<PermissionDefinition | null>(null);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);

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

  const handleEdit = (perm: PermissionDefinition) => {
    setEditPerm(perm);
    setEditForm({ name: perm.name ?? '', description: perm.description ?? '', isSensitive: perm.isSensitive });
    openEdit();
  };

  const filteredSystems = (data?.systems ?? [])
    .map((sys) => ({
      ...sys,
      permissions: sys.permissions.filter((p) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return p.key.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q);
      }),
    }))
    .filter((sys) => sys.permissions.length > 0);

  const total = data?.total ?? 0;

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Title order={3}>Permission</Title>
          <Text size="sm" c="dimmed">Tổng: {total} quyền</Text>
        </Stack>
        {canManage && (
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Tạo permission
          </Button>
        )}
      </Group>

      <TextInput
        placeholder="Tìm theo key, mô tả..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        mb="md"
        w={320}
      />

      {isLoading ? (
        <Group justify="center" py="xl"><Loader /></Group>
      ) : (
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
                    <Group key={perm.id} justify="space-between" p="xs"
                      style={{ border: '1px solid #f1f3f5', borderRadius: 6 }}>
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
                      {canManage && (
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
      )}

      {/* Create modal */}
      <Modal opened={createOpened} onClose={closeCreate} title="Tạo permission mới" size="md">
        <Stack>
          <TextInput
            label="Key"
            placeholder="vd: hr.employee.read"
            description="Bắt buộc dạng system.module.action (lowercase)"
            value={createForm.key}
            onChange={(e) => setCreateForm((f) => ({ ...f, key: e.currentTarget.value }))}
            required
          />
          <TextInput
            label="Tên hiển thị"
            value={createForm.name ?? ''}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.currentTarget.value }))}
          />
          <Textarea
            label="Mô tả"
            value={createForm.description ?? ''}
            onChange={(e) => setCreateForm((f) => ({ ...f, description: e.currentTarget.value }))}
            rows={2}
          />
          <Switch
            label="Permission nhạy cảm"
            checked={createForm.isSensitive}
            onChange={(e) => setCreateForm((f) => ({ ...f, isSensitive: e.currentTarget.checked }))}
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
      >
        {editPerm && (
          <Stack>
            <Text size="xs" ff="monospace" c="blue">{editPerm.key}</Text>
            <TextInput
              label="Tên hiển thị"
              value={editForm.name ?? ''}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.currentTarget.value }))}
            />
            <Textarea
              label="Mô tả"
              value={editForm.description ?? ''}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.currentTarget.value }))}
              rows={2}
            />
            <Switch
              label="Permission nhạy cảm"
              checked={editForm.isSensitive ?? false}
              onChange={(e) => setEditForm((f) => ({ ...f, isSensitive: e.currentTarget.checked }))}
            />
            <Group justify="space-between" mt="xs">
              {editPerm.status !== 'disabled' && (
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
                <Button
                  loading={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: editPerm.id, data: editForm })}
                >
                  Lưu
                </Button>
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
