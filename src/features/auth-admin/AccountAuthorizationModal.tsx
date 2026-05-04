import { useDeferredValue, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/useAuth';
import { AUTH_ADMIN_PERMISSIONS } from '../auth/permissions';
import { getPermissionGroups, getPermissionsGrouped, getRoles } from './authAdminApi';
import {
  getMissingDirectPermissionGroupEndpoints,
  updateAccountDirectPermissions,
  updateAccountRoles,
} from './accountAuthorizationService';
import type { EffectivePermission, Permission, PermissionGroup, Role } from './accountAuthorizationTypes';
import { useAccountAuthorization } from './useAccountAuthorization';

type Props = {
  accountId: string | null;
  opened: boolean;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
};

const PERMISSION_SOURCE_LABELS: Record<string, string> = {
  ROLE: 'From Role',
  PERMISSION_GROUP: 'From Permission Group',
  DIRECT_PERMISSION: 'Direct Permission',
  DIRECT_PERMISSION_GROUP: 'Direct Permission Group',
};

function badgeColorForSource(sourceType: string) {
  switch (sourceType) {
    case 'ROLE':
      return 'blue';
    case 'PERMISSION_GROUP':
      return 'violet';
    case 'DIRECT_PERMISSION':
      return 'orange';
    case 'DIRECT_PERMISSION_GROUP':
      return 'teal';
    default:
      return 'gray';
  }
}

function permissionLabel(permission: Permission) {
  return `${permission.code} · ${permission.name}`;
}

function roleOptionLabel(role: Role) {
  return role.description ? `${role.name} (${role.code})` : role.name;
}

export function AccountAuthorizationModal({ accountId, opened, onClose, onUpdated }: Props) {
  const queryClient = useQueryClient();
  const { user, refreshCurrentUser, hasAnyPermission } = useAuth();
  const authzQuery = useAccountAuthorization(accountId, opened);

  const canAssignRoles = hasAnyPermission([
    AUTH_ADMIN_PERMISSIONS.ROLES_ASSIGN,
    AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
  ]);
  const canAssignDirectPermissions = hasAnyPermission([
    AUTH_ADMIN_PERMISSIONS.PERMISSIONS_ASSIGN,
    AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
  ]);
  const editDisabled = !canAssignRoles && !canAssignDirectPermissions;

  const [selectedRoleCodes, setSelectedRoleCodes] = useState<string[]>([]);
  const [selectedDirectPermissionIds, setSelectedDirectPermissionIds] = useState<string[]>([]);
  const [directPermissionReason, setDirectPermissionReason] = useState('');
  const [roleReason, setRoleReason] = useState('');
  const [roleDirty, setRoleDirty] = useState(false);
  const [directPermissionDirty, setDirectPermissionDirty] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [effectiveSearch, setEffectiveSearch] = useState('');
  const [permissionSystemFilter, setPermissionSystemFilter] = useState<string | null>(null);
  const [permissionModuleFilter, setPermissionModuleFilter] = useState<string | null>(null);

  const deferredPermissionSearch = useDeferredValue(permissionSearch.trim().toLowerCase());
  const deferredEffectiveSearch = useDeferredValue(effectiveSearch.trim().toLowerCase());

  const { data: roleCatalog = [] } = useQuery({
    queryKey: ['auth-admin-role-catalog'],
    queryFn: () => getRoles({ status: 'active' }),
    enabled: opened,
  });

  const { data: permissionCatalogGrouped } = useQuery({
    queryKey: ['auth-admin-permission-catalog'],
    queryFn: () => getPermissionsGrouped(),
    enabled: opened,
  });

  const { data: permissionGroupCatalog = [] } = useQuery({
    queryKey: ['auth-admin-permission-group-catalog'],
    queryFn: () => getPermissionGroups({ status: 'active' }),
    enabled: opened,
  });

  const roleOptions = useMemo<Role[]>(
    () =>
      roleCatalog.map((role) => ({
        id: role.id ?? role.key ?? role.name,
        code: role.key ?? role.name,
        name: role.name,
        description: role.description ?? undefined,
      })),
    [roleCatalog],
  );

  const permissionCatalog = useMemo<Permission[]>(
    () =>
      (permissionCatalogGrouped?.systems ?? []).flatMap((systemGroup) =>
        systemGroup.permissions.map((permission) => ({
          id: permission.id,
          code: permission.key,
          name: permission.name ?? permission.key,
          system: permission.system ?? permission.domain ?? systemGroup.domain,
          module: permission.module ?? 'general',
          action: permission.action ?? 'read',
          description: permission.description ?? undefined,
        })),
      ),
    [permissionCatalogGrouped],
  );

  const permissionById = useMemo(
    () => new Map(permissionCatalog.map((permission) => [permission.id, permission])),
    [permissionCatalog],
  );

  const permissionSystemOptions = useMemo(
    () =>
      Array.from(new Set(permissionCatalog.map((permission) => permission.system)))
        .sort()
        .map((value) => ({ value, label: value })),
    [permissionCatalog],
  );

  const permissionModuleOptions = useMemo(
    () =>
      Array.from(new Set(permissionCatalog.map((permission) => permission.module)))
        .sort()
        .map((value) => ({ value, label: value })),
    [permissionCatalog],
  );

  const filteredPermissions = useMemo(
    () =>
      permissionCatalog
        .filter((permission) =>
          !deferredPermissionSearch
            ? true
            : [
                permission.code,
                permission.name,
                permission.system,
                permission.module,
                permission.action,
              ]
                .join(' ')
                .toLowerCase()
                .includes(deferredPermissionSearch),
        )
        .filter((permission) =>
          permissionSystemFilter ? permission.system === permissionSystemFilter : true,
        )
        .filter((permission) =>
          permissionModuleFilter ? permission.module === permissionModuleFilter : true,
        )
        .sort((left, right) => left.code.localeCompare(right.code)),
    [deferredPermissionSearch, permissionCatalog, permissionModuleFilter, permissionSystemFilter],
  );

  const filteredEffectivePermissions = useMemo(
    () =>
      (authzQuery.data?.effectivePermissions ?? [])
        .filter((entry) =>
          !deferredEffectiveSearch
            ? true
            : [
                entry.permission.code,
                entry.permission.name,
                ...entry.sources.map((source) => source.code),
                ...entry.sources.map((source) => source.name),
              ]
                .join(' ')
                .toLowerCase()
                .includes(deferredEffectiveSearch),
        )
        .sort((left, right) => left.permission.code.localeCompare(right.permission.code)),
    [authzQuery.data?.effectivePermissions, deferredEffectiveSearch],
  );

  const resetDraftState = () => {
    setSelectedRoleCodes(authzQuery.data?.roles.map((role) => role.code) ?? []);
    setSelectedDirectPermissionIds(
      authzQuery.data?.directPermissions.map((permission) => permission.id) ?? [],
    );
    setRoleReason('');
    setDirectPermissionReason('');
    setRoleDirty(false);
    setDirectPermissionDirty(false);
  };

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['account-authorization', accountId] }),
      queryClient.invalidateQueries({ queryKey: ['auth-admin-users'] }),
    ]);
  };

  const handleSelfRefresh = async () => {
    const currentAccountId = user?.authUserId ?? user?.auth_user_id ?? user?.id;
    if (!currentAccountId || !accountId || currentAccountId !== accountId) {
      return;
    }

    try {
      await refreshCurrentUser();
      notifications.show({
        color: 'blue',
        message: 'Da tai lai session hien tai sau khi cap nhat quyen.',
      });
    } catch {
      notifications.show({
        color: 'yellow',
        message: 'Quyen cua ban da thay doi. Vui long tai lai session neu giao dien chua cap nhat.',
      });
    }
  };

  const updateRolesMutation = useMutation({
    mutationFn: async () => updateAccountRoles(accountId!, selectedRoleCodes, roleReason.trim() || undefined),
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Da cap nhat role cho tai khoan.' });
      await invalidateAll();
      await authzQuery.refetch();
      await handleSelfRefresh();
      await onUpdated?.();
    },
    onError: (error: Error) => {
      notifications.show({ color: 'red', message: error.message });
    },
  });

  const updateDirectPermissionsMutation = useMutation({
    mutationFn: async () => {
      const permissionCodes = selectedDirectPermissionIds
        .map((permissionId) => permissionById.get(permissionId)?.code)
        .filter((code): code is string => Boolean(code));

      return updateAccountDirectPermissions(accountId!, permissionCodes, directPermissionReason.trim());
    },
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Da cap nhat permission truc tiep.' });
      await invalidateAll();
      await authzQuery.refetch();
      await handleSelfRefresh();
      await onUpdated?.();
    },
    onError: (error: Error) => {
      notifications.show({ color: 'red', message: error.message });
    },
  });

  const originalRoleCodes = useMemo(
    () => authzQuery.data?.roles.map((role) => role.code).sort() ?? [],
    [authzQuery.data?.roles],
  );
  const originalDirectPermissionIds = useMemo(
    () => authzQuery.data?.directPermissions.map((permission) => permission.id).sort() ?? [],
    [authzQuery.data?.directPermissions],
  );

  const displayedRoleCodes = useMemo(
    () => (roleDirty ? selectedRoleCodes : authzQuery.data?.roles.map((role) => role.code) ?? []),
    [authzQuery.data?.roles, roleDirty, selectedRoleCodes],
  );
  const displayedDirectPermissionIds = useMemo(
    () =>
      directPermissionDirty
        ? selectedDirectPermissionIds
        : authzQuery.data?.directPermissions.map((permission) => permission.id) ?? [],
    [authzQuery.data?.directPermissions, directPermissionDirty, selectedDirectPermissionIds],
  );
  const selectedRoleSet = useMemo(() => new Set(displayedRoleCodes), [displayedRoleCodes]);
  const selectedDirectPermissionIdSet = useMemo(
    () => new Set(displayedDirectPermissionIds),
    [displayedDirectPermissionIds],
  );

  const hasRoleChanges =
    [...displayedRoleCodes].sort().join('|') !== originalRoleCodes.join('|');
  const hasDirectPermissionChanges =
    [...displayedDirectPermissionIds].sort().join('|') !== originalDirectPermissionIds.join('|');

  const disabledTooltip = 'Ban khong co quyen thuc hien thao tac nay';
  const missingPermissionGroupEndpoints = getMissingDirectPermissionGroupEndpoints();

  const renderEffectivePermission = (entry: EffectivePermission) => (
    <Box
      key={entry.permission.code}
      p="sm"
      style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}
    >
      <Text fw={600} size="sm">
        {entry.permission.code}
      </Text>
      <Text size="xs" c="dimmed">
        {entry.permission.name}
      </Text>
      <Group gap="xs" mt="xs">
        {entry.sources.length === 0 ? (
          <Badge color="gray" variant="light">
            Chua xac dinh nguon
          </Badge>
        ) : (
          entry.sources.map((source) => (
            <Badge key={`${source.type}-${source.id}-${source.code}`} color={badgeColorForSource(source.type)} variant="light">
              {PERMISSION_SOURCE_LABELS[source.type]}: {source.code}
            </Badge>
          ))
        )}
      </Group>
    </Box>
  );

  return (
    <Modal
      opened={opened}
      onClose={() => {
        resetDraftState();
        onClose();
      }}
      title={authzQuery.data?.account.email ? `Phan quyen tai khoan: ${authzQuery.data.account.email}` : 'Phan quyen tai khoan'}
      size="xl"
      centered
    >
      {authzQuery.isLoading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      ) : authzQuery.error ? (
        <Alert color="red" title="Khong the tai thong tin phan quyen">
          {(authzQuery.error as Error).message}
        </Alert>
      ) : authzQuery.data ? (
        <Stack gap="md">
          <Alert color="blue" title="Thong tin chung">
            <Text size="sm">Account: {authzQuery.data.account.email}</Text>
            <Text size="sm">Username: {authzQuery.data.account.username ?? '-'}</Text>
            <Text size="sm">Trang thai: {authzQuery.data.account.accountState}</Text>
          </Alert>

          {editDisabled ? (
            <Alert color="yellow">
              Ban khong co quyen thuc hien thao tac nay.
            </Alert>
          ) : null}

          <Tabs defaultValue="roles">
            <Tabs.List>
              <Tabs.Tab value="roles">Vai tro</Tabs.Tab>
              <Tabs.Tab value="permission-groups">Nhom quyen truc tiep</Tabs.Tab>
              <Tabs.Tab value="permissions">Quyen truc tiep</Tabs.Tab>
              <Tabs.Tab value="effective">Quyen hieu luc</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="roles" pt="md">
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Chon role duoc gan cho tai khoan. Sau khi luu, he thong se tai lai effective permissions.
                </Text>

                <ScrollArea h={320}>
                  <Stack gap="xs">
                    {roleOptions.map((role) => (
                      <Checkbox
                        key={role.code}
                        checked={selectedRoleSet.has(role.code)}
                        disabled={editDisabled || !canAssignRoles}
                        label={roleOptionLabel(role)}
                        description={role.description}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setRoleDirty(true);
                          setSelectedRoleCodes((current) =>
                            checked
                              ? Array.from(new Set([...(roleDirty ? current : displayedRoleCodes), role.code]))
                              : (roleDirty ? current : displayedRoleCodes).filter((value) => value !== role.code),
                          );
                        }}
                      />
                    ))}
                  </Stack>
                </ScrollArea>

                <TextInput
                  label="Ly do (tuy chon)"
                  placeholder="Nhap ly do neu backend can audit them"
                  value={roleReason}
                  onChange={(event) => setRoleReason(event.currentTarget.value)}
                  disabled={editDisabled || !canAssignRoles}
                />

                <Group justify="flex-end">
                  <Tooltip label={editDisabled || !canAssignRoles ? disabledTooltip : ''} disabled={!editDisabled && canAssignRoles}>
                    <span>
                      <Button
                        onClick={() => void updateRolesMutation.mutateAsync()}
                        disabled={!hasRoleChanges || editDisabled || !canAssignRoles}
                        loading={updateRolesMutation.isPending}
                      >
                        Luu role
                      </Button>
                    </span>
                  </Tooltip>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="permission-groups" pt="md">
              <Stack gap="sm">
                <Alert color="yellow" title="Tinh nang chua duoc backend ho tro">
                  Chi dung khi tai khoan can ngoai le ngoai vai tro. Hien tai backend chua co endpoint gan/bo permission group truc tiep theo account, vi vay tab nay dang o che do read-only.
                </Alert>

                <Text size="sm" fw={500}>
                  Endpoint dang thieu
                </Text>
                <Stack gap={6}>
                  {missingPermissionGroupEndpoints.map((item) => (
                    <Text key={`${item.method}-${item.endpoint}`} size="sm" ff="monospace">
                      {item.method} {item.endpoint}
                    </Text>
                  ))}
                </Stack>

                <Divider />

                <Text size="sm" fw={500}>
                  Danh muc permission group hien co ({permissionGroupCatalog.length})
                </Text>
                <ScrollArea h={260}>
                  <Stack gap="xs">
                    {permissionGroupCatalog.map((group) => {
                      const mappedGroup: PermissionGroup = {
                        id: group.id,
                        code: group.key,
                        name: group.name,
                        system: group.system ?? 'unknown',
                      };

                      return (
                        <Checkbox
                          key={mappedGroup.id}
                          checked={false}
                          disabled
                          label={`${mappedGroup.code} · ${mappedGroup.name}`}
                          description="Backend chua ho tro gan truc tiep theo account"
                        />
                      );
                    })}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="permissions" pt="md">
              <Stack gap="sm">
                <Alert color="yellow" title="Canh bao">
                  Gan quyen truc tiep la ngoai le, nen uu tien gan qua Role hoac Permission Group.
                </Alert>

                <Group grow align="flex-end">
                  <TextInput
                    label="Tim permission"
                    placeholder="system.module.action"
                    value={permissionSearch}
                    onChange={(event) => setPermissionSearch(event.currentTarget.value)}
                  />
                  <Select
                    clearable
                    label="System"
                    data={permissionSystemOptions}
                    value={permissionSystemFilter}
                    onChange={setPermissionSystemFilter}
                  />
                  <Select
                    clearable
                    label="Module"
                    data={permissionModuleOptions}
                    value={permissionModuleFilter}
                    onChange={setPermissionModuleFilter}
                  />
                </Group>

                <ScrollArea h={320}>
                  <Stack gap="xs">
                    {filteredPermissions.map((permission) => (
                      <Checkbox
                        key={permission.id}
                        checked={selectedDirectPermissionIdSet.has(permission.id)}
                        disabled={editDisabled || !canAssignDirectPermissions}
                        label={permissionLabel(permission)}
                        description={permission.description}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setDirectPermissionDirty(true);
                          setSelectedDirectPermissionIds((current) =>
                            checked
                              ? Array.from(
                                  new Set([
                                    ...(directPermissionDirty ? current : displayedDirectPermissionIds),
                                    permission.id,
                                  ]),
                                )
                              : (directPermissionDirty ? current : displayedDirectPermissionIds).filter(
                                  (value) => value !== permission.id,
                                ),
                          );
                        }}
                      />
                    ))}
                  </Stack>
                </ScrollArea>

                <TextInput
                  label="Ly do bat buoc"
                  placeholder="Nhap ly do de ghi audit log"
                  value={directPermissionReason}
                  onChange={(event) => setDirectPermissionReason(event.currentTarget.value)}
                  required
                  disabled={editDisabled || !canAssignDirectPermissions}
                />

                <Group justify="flex-end">
                  <Tooltip label={editDisabled || !canAssignDirectPermissions ? disabledTooltip : ''} disabled={!editDisabled && canAssignDirectPermissions}>
                    <span>
                      <Button
                        onClick={() => void updateDirectPermissionsMutation.mutateAsync()}
                        disabled={
                          !hasDirectPermissionChanges ||
                          editDisabled ||
                          !canAssignDirectPermissions ||
                          directPermissionReason.trim().length === 0
                        }
                        loading={updateDirectPermissionsMutation.isPending}
                      >
                        Luu permission truc tiep
                      </Button>
                    </span>
                  </Tooltip>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="effective" pt="md">
              <Stack gap="sm">
                <TextInput
                  label="Tim quyen hieu luc"
                  placeholder="Tim theo permission hoac nguon"
                  value={effectiveSearch}
                  onChange={(event) => setEffectiveSearch(event.currentTarget.value)}
                />

                <ScrollArea h={420}>
                  <Stack gap="sm">
                    {filteredEffectivePermissions.length === 0 ? (
                      <Text size="sm" c="dimmed">
                        Khong co permission hieu luc nao khop bo loc.
                      </Text>
                    ) : (
                      filteredEffectivePermissions.map(renderEffectivePermission)
                    )}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      ) : null}
    </Modal>
  );
}
