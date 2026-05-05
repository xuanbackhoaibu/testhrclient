import {
  Alert,
  Badge,
  Button,
  Code,
  Group,
  Modal,
  MultiSelect,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconShieldCheck, IconShieldPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  assignPermissions,
  assignRoles,
  getEffectivePermissions,
} from '../../../features/auth-admin/authAdminApi';
import { SENSITIVE_ROLES } from '../../../features/auth-admin/authAdminTypes';
import { useAvailableRoles } from '../../../features/auth-admin/useAvailableRoles';
import { useAuth } from '../../../features/auth/useAuth';
import type { Employee } from '../../../features/employees/employeeTypes';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingState } from '../../../shared/components/LoadingState';

interface Props {
  employee: Employee;
}

export function AccessTab({ employee }: Props) {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permInput, setPermInput] = useState('');

  const canReadRoles = can('auth.role.read');
  const canAssignRoles = can('hr.account.assign_role');
  const canReadPerms = can('auth.role.read');
  const { asSelectOptions: roleOptions } = useAvailableRoles();

  const authUserId = employee.authUserId;

  const {
    data: effectivePerms,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['effective-permissions', authUserId],
    queryFn: () => getEffectivePermissions(authUserId!),
    enabled: canReadRoles && Boolean(authUserId),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['effective-permissions', authUserId] });
  };

  const assignRolesMutation = useMutation({
    mutationFn: (roles: string[]) =>
      assignRoles(authUserId!, { roles, reason: 'HR admin assigned roles' }),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã cập nhật roles.' });
      setRoleModalOpen(false);
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Cập nhật role thất bại.' });
    },
  });

  const assignPermsMutation = useMutation({
    mutationFn: (perms: string[]) =>
      assignPermissions(authUserId!, {
        permissions: perms,
        reason: 'HR admin assigned permissions',
      }),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã cập nhật permissions.' });
      setPermModalOpen(false);
      setPermInput('');
      await invalidate();
    },
    onError: (err: unknown) => {
      notifications.show({ color: 'red', message: (err as { message?: string })?.message ?? 'Cập nhật permission thất bại.' });
    },
  });

  if (!canReadRoles) {
    return (
      <Alert color="blue" title="Không có quyền">
        Bạn không có quyền xem thông tin quyền truy cập nhân sự.
      </Alert>
    );
  }

  if (!authUserId) {
    return (
      <Alert color="yellow" title="Chưa có tài khoản">
        Nhân sự chưa có tài khoản. Vui lòng tạo tài khoản trước.
      </Alert>
    );
  }

  if (isLoading) return <LoadingState />;

  if (error || !effectivePerms) {
    return <ErrorState title="Không thể tải thông tin quyền" onRetry={() => void refetch()} />;
  }

  const openRoleModal = () => {
    setSelectedRoles([...(effectivePerms.roles ?? [])]);
    setRoleModalOpen(true);
  };

  const openPermModal = () => {
    setSelectedPerms([...(effectivePerms.directPermissions ?? [])]);
    setPermInput('');
    setPermModalOpen(true);
  };

  const hasSensitive = selectedRoles.some((r) => SENSITIVE_ROLES.has(r));

  const addPerm = () => {
    const key = permInput.trim();
    if (key && !selectedPerms.includes(key)) {
      setSelectedPerms((prev) => [...prev, key]);
      setPermInput('');
    }
  };

  return (
    <Stack gap="lg">
      <Group gap="xs">
        <Text size="sm" c="dimmed">Permission Version:</Text>
        <Text size="sm">{effectivePerms.permissionVersion ?? '-'}</Text>
        <Text size="sm" c="dimmed" ml="md">Token Version:</Text>
        <Text size="sm">{effectivePerms.tokenVersion ?? '-'}</Text>
      </Group>

      <div>
        <Group gap="sm" mb="xs">
          <Title order={6}>Roles</Title>
          {canAssignRoles && (
            <Button size="xs" variant="light" leftSection={<IconShieldPlus size={14} />} onClick={openRoleModal}>
              Cập nhật
            </Button>
          )}
        </Group>
        {effectivePerms.roles.length === 0 ? (
          <Text size="sm" c="dimmed">Chưa có role nào</Text>
        ) : (
          <Group wrap="wrap" gap="xs">
            {effectivePerms.roles.map((r) => (
              <Badge
                key={r}
                color={SENSITIVE_ROLES.has(r) ? 'red' : 'blue'}
                variant="light"
              >
                {r}
              </Badge>
            ))}
          </Group>
        )}
      </div>

      {canReadPerms && (
        <>
          <div>
            <Group gap="sm" mb="xs">
              <Title order={6}>Quyền trực tiếp</Title>
              {canAssignRoles && (
                <Button size="xs" variant="light" leftSection={<IconShieldPlus size={14} />} onClick={openPermModal}>
                  Cập nhật
                </Button>
              )}
            </Group>
            {effectivePerms.directPermissions.length === 0 ? (
              <Text size="sm" c="dimmed">Không có quyền trực tiếp</Text>
            ) : (
              <Group wrap="wrap" gap="xs">
                {effectivePerms.directPermissions.map((p) => (
                  <Badge key={p} color="cyan" variant="light" leftSection={<IconShieldCheck size={12} />}>
                    {p}
                  </Badge>
                ))}
              </Group>
            )}
          </div>

          <div>
            <Title order={6} mb="xs">Effective Permissions</Title>
            {effectivePerms.effectivePermissions.length === 0 ? (
              <Text size="sm" c="dimmed">Không có quyền hiệu lực nào</Text>
            ) : (
              <ScrollArea h={280} type="hover">
                <Stack gap={4}>
                  {[...effectivePerms.effectivePermissions].sort().map((perm) => (
                    <Code key={perm} block={false}>{perm}</Code>
                  ))}
                </Stack>
              </ScrollArea>
            )}
          </div>
        </>
      )}

      <Modal
        title="Cập nhật Roles"
        opened={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        size="md"
      >
        <Stack gap="sm">
          {hasSensitive && (
            <Alert color="yellow" title="Cảnh báo: Role nhạy cảm">
              Bạn đang gán role có quyền cao. Thao tác này chỉ dành cho superadmin.
            </Alert>
          )}
          <MultiSelect
            label="Chọn roles"
            data={roleOptions}
            value={selectedRoles}
            onChange={setSelectedRoles}
            searchable
            clearable
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setRoleModalOpen(false)}>Hủy</Button>
            <Button
              loading={assignRolesMutation.isPending}
              onClick={() => assignRolesMutation.mutate(selectedRoles)}
            >
              Lưu
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        title="Cập nhật Permissions trực tiếp"
        opened={permModalOpen}
        onClose={() => setPermModalOpen(false)}
        size="md"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Nhập permission key (ví dụ: hr.employee.read), nhấn Thêm để thêm vào danh sách.
          </Text>
          <Group gap="xs">
            <TextInput
              style={{ flex: 1 }}
              placeholder="hr.employee.read"
              value={permInput}
              onChange={(e) => setPermInput(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerm(); } }}
            />
            <Button variant="light" onClick={addPerm}>Thêm</Button>
          </Group>
          {selectedPerms.length > 0 && (
            <Group wrap="wrap" gap="xs">
              {selectedPerms.map((p) => (
                <Badge
                  key={p}
                  color="cyan"
                  variant="light"
                  style={{ cursor: 'pointer' }}
                  rightSection={
                    <Text span size="xs" onClick={() => setSelectedPerms((prev) => prev.filter((x) => x !== p))}>×</Text>
                  }
                >
                  {p}
                </Badge>
              ))}
            </Group>
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setPermModalOpen(false)}>Hủy</Button>
            <Button
              loading={assignPermsMutation.isPending}
              onClick={() => assignPermsMutation.mutate(selectedPerms)}
            >
              Lưu
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
