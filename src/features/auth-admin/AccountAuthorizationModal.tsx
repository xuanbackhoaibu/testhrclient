import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  ScrollArea,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/useAuth";
import { AUTH_ADMIN_PERMISSIONS } from "../auth/permissions";
import { NormalizedSearchInput } from "../../shared/components/NormalizedSearchInput";
import {
  updateAccountDirectPermissionGroups,
  updateAccountDirectPermissions,
  updateAccountRoles,
} from "./accountAuthorizationService";
import {
  isDirectlyAssignablePermission,
  isWorkReportManagedPermission,
  WORK_REPORT_MANAGED_ASSIGNMENT_MESSAGE,
} from "./permissionAssignmentPolicy";
import type {
  EffectivePermission,
  Permission,
  PermissionGroup,
  Role,
} from "./accountAuthorizationTypes";
import { useAccountAuthorization } from "./useAccountAuthorization";
import { ACCOUNT_STATUS_LABELS } from "./authAdminTypes";

export type AccountAuthorizationTab =
  | "roles"
  | "permission-groups"
  | "permissions"
  | "effective";

type Props = {
  accountId: string | null;
  activeTab: AccountAuthorizationTab;
  onTabChange: (tab: AccountAuthorizationTab) => void;
  onDirtyChange?: (dirty: boolean) => void;
  enabled?: boolean;
  onUpdated?: () => Promise<void> | void;
};

const PERMISSION_SOURCE_LABELS: Record<string, string> = {
  ROLE: "Từ Vai trò",
  ROLE_PERMISSION_GROUP: "Từ nhóm quyền của vai trò",
  USER_PERMISSION_GROUP: "Nhóm quyền trực tiếp",
  DIRECT_ALLOW: "Cho phép trực tiếp",
  ADMIN_AUTHORITY: "Quyền quản trị chuẩn",
  SPECIALIZED_PROJECTION: "Phạm vi chuyên biệt",
  SUPER_ADMIN_WILDCARD: "Toàn quyền super-admin",
};

function badgeColorForSource(sourceType: string) {
  switch (sourceType) {
    case "ROLE":
      return "blue";
    case "ROLE_PERMISSION_GROUP":
      return "violet";
    case "DIRECT_ALLOW":
      return "orange";
    case "USER_PERMISSION_GROUP":
      return "teal";
    default:
      return "gray";
  }
}

function permissionLabel(permission: Permission) {
  return `${permission.code} · ${permission.name}`;
}

function roleOptionLabel(role: Role) {
  const label = role.description ? `${role.name} (${role.code})` : role.name;
  return role.isSensitive ? `${label} — Nhạy cảm` : label;
}

export function AccountAuthorizationPanel({
  accountId,
  activeTab,
  onTabChange,
  onDirtyChange,
  enabled = true,
  onUpdated,
}: Props) {
  const queryClient = useQueryClient();
  const { user, refreshCurrentUser, hasAnyPermission } = useAuth();
  const authzQuery = useAccountAuthorization(accountId, enabled);

  const canAssignRoles = hasAnyPermission([
    AUTH_ADMIN_PERMISSIONS.ROLES_ASSIGN,
  ]);
  const canAssignDirectPermissions = hasAnyPermission([
    AUTH_ADMIN_PERMISSIONS.PERMISSIONS_ASSIGN,
  ]);
  const canAssignSensitiveRole = hasAnyPermission([AUTH_ADMIN_PERMISSIONS.ASSIGN_SENSITIVE_ROLE]);
  const canRevokeSensitiveRole = hasAnyPermission([AUTH_ADMIN_PERMISSIONS.REVOKE_SENSITIVE_ROLE]);
  const canAssignSensitivePermission = hasAnyPermission([AUTH_ADMIN_PERMISSIONS.ASSIGN_SENSITIVE_PERMISSION]);
  const canAssignSensitiveGroup = hasAnyPermission([AUTH_ADMIN_PERMISSIONS.ASSIGN_SENSITIVE_GROUP]);
  const editDisabled = !canAssignRoles && !canAssignDirectPermissions;

  const [selectedRoleCodes, setSelectedRoleCodes] = useState<string[]>([]);
  const [selectedDirectPermissionIds, setSelectedDirectPermissionIds] =
    useState<string[]>([]);
  const [selectedDirectDenyIds, setSelectedDirectDenyIds] = useState<string[]>([]);
  const [selectedDirectPermissionGroupIds, setSelectedDirectPermissionGroupIds] =
    useState<string[]>([]);
  const [directPermissionReason, setDirectPermissionReason] = useState("");
  const [directPermissionGroupReason, setDirectPermissionGroupReason] = useState("");
  const [roleReason, setRoleReason] = useState("");
  const [roleDirty, setRoleDirty] = useState(false);
  const [directPermissionDirty, setDirectPermissionDirty] = useState(false);
  const [directPermissionGroupDirty, setDirectPermissionGroupDirty] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [effectiveSearch, setEffectiveSearch] = useState("");
  const [permissionSystemFilter, setPermissionSystemFilter] = useState<
    string | null
  >(null);
  const [permissionModuleFilter, setPermissionModuleFilter] = useState<
    string | null
  >(null);

  const deferredPermissionSearch = useDeferredValue(
    permissionSearch.trim().toLowerCase(),
  );
  const deferredEffectiveSearch = useDeferredValue(
    effectiveSearch.trim().toLowerCase(),
  );

  const roleOptions = useMemo(() => authzQuery.data?.roleCatalog ?? [], [authzQuery.data?.roleCatalog]);
  const permissionCatalog = useMemo(
    () => authzQuery.data?.permissionCatalog ?? [],
    [authzQuery.data?.permissionCatalog],
  );
  const permissionGroupCatalog = useMemo(
    () => authzQuery.data?.permissionGroupCatalog ?? [],
    [authzQuery.data?.permissionGroupCatalog],
  );

  const permissionById = useMemo(
    () =>
      new Map(
        permissionCatalog.map((permission) => [permission.id, permission]),
      ),
    [permissionCatalog],
  );
  const permissionByCode = useMemo(
    () => new Map(permissionCatalog.map((permission) => [permission.code, permission])),
    [permissionCatalog],
  );

  const permissionSystemOptions = useMemo(
    () =>
      Array.from(
        new Set(permissionCatalog.map((permission) => permission.system)),
      )
        .sort()
        .map((value) => ({ value, label: value })),
    [permissionCatalog],
  );

  const permissionModuleOptions = useMemo(
    () =>
      Array.from(
        new Set(permissionCatalog.map((permission) => permission.module)),
      )
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
                .join(" ")
                .toLowerCase()
                .includes(deferredPermissionSearch),
        )
        .filter((permission) =>
          permissionSystemFilter
            ? permission.system === permissionSystemFilter
            : true,
        )
        .filter((permission) =>
          permissionModuleFilter
            ? permission.module === permissionModuleFilter
            : true,
        )
        .sort((left, right) => left.code.localeCompare(right.code)),
    [
      deferredPermissionSearch,
      permissionCatalog,
      permissionModuleFilter,
      permissionSystemFilter,
    ],
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
                entry.permission.description,
                ...entry.sources.map((source) => source.code),
                ...entry.sources.map((source) => source.name),
              ]
                .join(" ")
                .toLowerCase()
                .includes(deferredEffectiveSearch),
        )
        .sort((left, right) =>
          left.permission.code.localeCompare(right.permission.code),
        ),
    [authzQuery.data?.effectivePermissions, deferredEffectiveSearch],
  );

  const invalidateAccountList = async () => {
    await queryClient.invalidateQueries({ queryKey: ["auth-admin-users"] });
  };

  const handleSelfRefresh = async () => {
    const currentAccountId = user?.authUserId ?? user?.auth_user_id ?? user?.id;
    if (!currentAccountId || !accountId || currentAccountId !== accountId) {
      return;
    }

    try {
      await refreshCurrentUser();
      notifications.show({
        color: "blue",
        message: "Đã tải lại session hiện tại sau khi cập nhật quyền.",
      });
    } catch {
      notifications.show({
        color: "yellow",
        message:
          "Quyền của bạn đã thay đổi. Vui lòng tải lại session nếu giao diện chưa cập nhật.",
      });
    }
  };

  const updateRolesMutation = useMutation({
    mutationFn: async () =>
      updateAccountRoles(
        accountId!,
        selectedRoleCodes,
        roleReason.trim() || undefined,
      ),
    onSuccess: async () => {
      notifications.show({
        color: "green",
        message: "Đã cập nhật vai trò cho tài khoản.",
      });
      await invalidateAccountList();
      await authzQuery.refetch();
      await handleSelfRefresh();
      await onUpdated?.();
    },
    onError: (error: Error) => {
      notifications.show({ color: "red", message: error.message });
      void authzQuery.refetch();
    },
  });

  const updateDirectPermissionsMutation = useMutation({
    mutationFn: async () => {
      const reason = directPermissionReason.trim();
      const overrides = [
        ...displayedDirectPermissionIds.map((permissionId) => ({
          permissionKey: permissionById.get(permissionId)?.code ?? "",
          effect: "ALLOW" as const,
          reason,
        })),
        ...displayedDirectDenyIds.map((permissionId) => ({
          permissionKey: permissionById.get(permissionId)?.code ?? "",
          effect: "DENY" as const,
          reason,
        })),
      ].filter((override) => Boolean(override.permissionKey));

      return updateAccountDirectPermissions(
        accountId!,
        overrides,
        reason,
        permissionCatalog,
      );
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        message: "Đã cập nhật quyền trực tiếp.",
      });
      await invalidateAccountList();
      await authzQuery.refetch();
      await handleSelfRefresh();
      await onUpdated?.();
    },
    onError: (error: Error) => {
      notifications.show({ color: "red", message: error.message });
      void authzQuery.refetch();
    },
  });

  const updateDirectPermissionGroupsMutation = useMutation({
    mutationFn: async () =>
      updateAccountDirectPermissionGroups(
        accountId!,
        selectedDirectPermissionGroupIds,
        directPermissionGroupReason.trim() || undefined,
      ),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Đã cập nhật nhóm quyền trực tiếp." });
      await invalidateAccountList();
      await authzQuery.refetch();
      await handleSelfRefresh();
      await onUpdated?.();
    },
    onError: (error: Error) => {
      notifications.show({ color: "red", message: error.message });
      void authzQuery.refetch();
    },
  });

  const originalRoleCodes = useMemo(
    () => authzQuery.data?.roles.map((role) => role.code).sort() ?? [],
    [authzQuery.data?.roles],
  );
  const originalDirectPermissionIds = useMemo(
    () =>
      authzQuery.data?.directPermissions
        .map((permission) => permission.id)
        .sort() ?? [],
    [authzQuery.data?.directPermissions],
  );
  const originalDirectDenyIds = useMemo(
    () => authzQuery.data?.directOverrides
      .filter((override) => override.effect === "DENY")
      .map((override) => permissionByCode.get(override.permissionKey)?.id)
      .filter((id): id is string => Boolean(id))
      .sort() ?? [],
    [authzQuery.data?.directOverrides, permissionByCode],
  );
  const originalDirectPermissionGroupIds = useMemo(
    () => authzQuery.data?.directPermissionGroups.map((group) => group.id).sort() ?? [],
    [authzQuery.data?.directPermissionGroups],
  );

  const displayedRoleCodes = useMemo(
    () =>
      roleDirty
        ? selectedRoleCodes
        : (authzQuery.data?.roles.map((role) => role.code) ?? []),
    [authzQuery.data?.roles, roleDirty, selectedRoleCodes],
  );
  const displayedDirectPermissionIds = directPermissionDirty
    ? selectedDirectPermissionIds
    : (authzQuery.data?.directPermissions.map(
        (permission) => permission.id,
      ) ?? []);
  const displayedDirectDenyIds = directPermissionDirty
    ? selectedDirectDenyIds
    : originalDirectDenyIds;
  const selectedRoleSet = useMemo(
    () => new Set(displayedRoleCodes),
    [displayedRoleCodes],
  );
  const selectedDirectPermissionIdSet = new Set(displayedDirectPermissionIds);
  const selectedDirectDenyIdSet = new Set(displayedDirectDenyIds);
  const inheritedPermissionCodes = useMemo(
    () => new Set(
      (authzQuery.data?.effectivePermissions ?? [])
        .filter((entry) => entry.sources.some((source) => source.type !== "DIRECT_ALLOW"))
        .map((entry) => entry.permission.code),
    ),
    [authzQuery.data?.effectivePermissions],
  );
  const displayedDirectPermissionGroupIds = useMemo(
    () => directPermissionGroupDirty
      ? selectedDirectPermissionGroupIds
      : (authzQuery.data?.directPermissionGroups.map((group) => group.id) ?? []),
    [authzQuery.data?.directPermissionGroups, directPermissionGroupDirty, selectedDirectPermissionGroupIds],
  );
  const selectedDirectPermissionGroupIdSet = useMemo(
    () => new Set(displayedDirectPermissionGroupIds),
    [displayedDirectPermissionGroupIds],
  );

  const hasRoleChanges =
    [...displayedRoleCodes].sort().join("|") !== originalRoleCodes.join("|");
  const hasDirectPermissionChanges =
    [...displayedDirectPermissionIds].sort().join("|") !==
      originalDirectPermissionIds.join("|") ||
    [...displayedDirectDenyIds].sort().join("|") !== originalDirectDenyIds.join("|");
  const hasDirectPermissionGroupChanges =
    [...displayedDirectPermissionGroupIds].sort().join("|") !==
    originalDirectPermissionGroupIds.join("|");
  const roleDiff = {
    added: displayedRoleCodes.filter((code) => !originalRoleCodes.includes(code)),
    removed: originalRoleCodes.filter((code) => !displayedRoleCodes.includes(code)),
  };
  const hasSensitiveRoleChanges = [...roleDiff.added, ...roleDiff.removed].some(
    (code) => roleOptions.some((role) => role.code === code && role.isSensitive),
  );
  const changedDirectPermissionGroupIds = [
    ...displayedDirectPermissionGroupIds.filter(
      (id) => !originalDirectPermissionGroupIds.includes(id),
    ),
    ...originalDirectPermissionGroupIds.filter(
      (id) => !displayedDirectPermissionGroupIds.includes(id),
    ),
  ];
  const hasSensitivePermissionGroupChanges = changedDirectPermissionGroupIds.some(
    (id) =>
      permissionGroupCatalog.some(
        (group) => group.id === id && group.isSensitive,
      ),
  );
  const overrideDiff = {
    allowAdded: displayedDirectPermissionIds.filter((id) => !originalDirectPermissionIds.includes(id)),
    allowRemoved: originalDirectPermissionIds.filter((id) => !displayedDirectPermissionIds.includes(id)),
    denyAdded: displayedDirectDenyIds.filter((id) => !originalDirectDenyIds.includes(id)),
    denyRemoved: originalDirectDenyIds.filter((id) => !displayedDirectDenyIds.includes(id)),
  };
  const hasPendingChanges =
    hasRoleChanges ||
    hasDirectPermissionGroupChanges ||
    hasDirectPermissionChanges;

  useEffect(() => {
    onDirtyChange?.(hasPendingChanges);
  }, [hasPendingChanges, onDirtyChange]);

  const disabledTooltip = "Bạn không có quyền thực hiện thao tác này";
  const renderEffectivePermission = (entry: EffectivePermission) => (
    <Box
      key={entry.permission.code}
      p="sm"
      style={{
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: 8,
      }}
    >
      <Text fw={600} size="sm">
        {entry.permission.code}
        <Badge ml="xs" color={entry.effective ? "green" : "red"} variant="light">
          {entry.effective ? "Có hiệu lực" : "Bị vô hiệu"}
        </Badge>
      </Text>
      <Text size="xs" c="dimmed">
        Hiệu lực: {entry.permission.description ?? entry.permission.name}
      </Text>
      <Group gap="xs" mt={6}>
        <Badge color="gray" variant="light">
          {entry.permission.system} / {entry.permission.module} / {entry.permission.action}
        </Badge>
        {entry.sources.length === 0 ? (
          <Badge color="gray" variant="light">
            Chưa xác định nguồn
          </Badge>
        ) : (
          entry.sources.map((source) => (
            <Badge
              key={`${source.type}-${source.id}-${source.code}`}
              color={badgeColorForSource(source.type)}
              variant="light"
            >
              {PERMISSION_SOURCE_LABELS[source.type]}: {source.code}
            </Badge>
          ))
        )}
      </Group>
      {entry.denies.length > 0 ? (
        <Stack gap={4} mt="xs">
          {entry.denies.map((deny) => (
            <Badge key={deny.sourceId ?? deny.reason} color="red" variant="light">
              Từ chối trực tiếp{deny.reason ? `: ${deny.reason}` : ""}
            </Badge>
          ))}
        </Stack>
      ) : null}
    </Box>
  );

  return (
    <>
      {authzQuery.isLoading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      ) : authzQuery.error ? (
        <Alert color="red" title="Không thể tải thông tin phân quyền">
          {(authzQuery.error as Error).message}
        </Alert>
      ) : authzQuery.data ? (
        <Stack gap="md">
          <Alert color="blue" title="Thông tin tài khoản">
            <Text size="sm">Email: {authzQuery.data.account.email}</Text>
            <Text size="sm">
              Tên đăng nhập: {authzQuery.data.account.username ?? "-"}
            </Text>
            <Text size="sm">
              Trạng thái: {ACCOUNT_STATUS_LABELS[authzQuery.data.account.accountState] ?? authzQuery.data.account.accountState}
            </Text>
          </Alert>

          {editDisabled ? (
            <Alert color="yellow">
              Bạn không có quyền thực hiện thao tác này.
            </Alert>
          ) : null}

          <Tabs
            value={activeTab}
            onChange={(value) => {
              if (value) onTabChange(value as AccountAuthorizationTab);
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="roles">Vai trò</Tabs.Tab>
              <Tabs.Tab value="permission-groups">
                Nhóm quyền trực tiếp
              </Tabs.Tab>
              <Tabs.Tab value="permissions">Quyền trực tiếp</Tabs.Tab>
              <Tabs.Tab value="effective">Quyền hiệu lực</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="roles" pt="md">
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Chọn vai trò được gán cho tài khoản. Sau khi lưu, hệ thống sẽ
                  tải lại quyền hiệu lực.
                </Text>

                <ScrollArea h={320}>
                  <Stack gap="xs">
                    {roleOptions.length === 0 ? (
                      <Text size="sm" c="dimmed">Chưa có vai trò nào để gán.</Text>
                    ) : null}
                    {roleOptions.map((role) => (
                      <Checkbox
                        key={role.code}
                        checked={selectedRoleSet.has(role.code)}
                        disabled={
                          editDisabled ||
                          !canAssignRoles ||
                          (role.isSensitive === true && (
                            selectedRoleSet.has(role.code)
                              ? !canRevokeSensitiveRole
                              : !canAssignSensitiveRole
                          ))
                        }
                        label={roleOptionLabel(role)}
                        description={
                          role.description
                            ? `Hiệu lực: ${role.description}`
                            : "Chưa có mô tả phạm vi hiệu lực."
                        }
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setRoleDirty(true);
                          setSelectedRoleCodes((current) =>
                            checked
                              ? Array.from(
                                  new Set([
                                    ...(roleDirty
                                      ? current
                                      : displayedRoleCodes),
                                    role.code,
                                  ]),
                                )
                              : (roleDirty
                                  ? current
                                  : displayedRoleCodes
                                ).filter((value) => value !== role.code),
                          );
                        }}
                      />
                    ))}
                  </Stack>
                </ScrollArea>

                {hasRoleChanges ? (
                  <Alert color="blue" title="Thay đổi trước khi lưu">
                    <Text size="sm">Vai trò thêm: {roleDiff.added.join(", ") || "Không có"}</Text>
                    <Text size="sm">Vai trò thu hồi: {roleDiff.removed.join(", ") || "Không có"}</Text>
                  </Alert>
                ) : null}

                <TextInput
                  label={hasSensitiveRoleChanges ? "Lý do thay đổi vai trò nhạy cảm" : "Lý do (tùy chọn)"}
                  placeholder="Nhập lý do nếu hệ thống cần ghi nhật ký thêm"
                  value={roleReason}
                  onChange={(event) => setRoleReason(event.currentTarget.value)}
                  disabled={editDisabled || !canAssignRoles}
                />

                <Group justify="flex-end">
                  <Tooltip
                    label={
                      editDisabled || !canAssignRoles ? disabledTooltip : ""
                    }
                    disabled={!editDisabled && canAssignRoles}
                  >
                    <span>
                      <Button
                        onClick={() => void updateRolesMutation.mutateAsync()}
                        disabled={
                          !hasRoleChanges ||
                          editDisabled ||
                          !canAssignRoles ||
                          (hasSensitiveRoleChanges && roleReason.trim().length === 0)
                        }
                        loading={updateRolesMutation.isPending}
                      >
                        Lưu vai trò
                      </Button>
                    </span>
                  </Tooltip>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="permission-groups" pt="md">
              <Stack gap="sm">
                <Alert color="yellow" title="Cảnh báo">
                  Nhóm quyền trực tiếp là ngoại lệ; nên ưu tiên gán qua vai trò.
                </Alert>

                <Text size="sm" fw={500}>
                  Danh mục nhóm quyền hiện có (
                  {permissionGroupCatalog.length})
                </Text>
                <ScrollArea h={260}>
                  <Stack gap="xs">
                    {permissionGroupCatalog.length === 0 ? (
                      <Text size="sm" c="dimmed">Chưa có nhóm quyền nào để gán.</Text>
                    ) : null}
                    {permissionGroupCatalog.map((group) => {
                      const mappedGroup: PermissionGroup = {
                        id: group.id,
                        code: group.code,
                        name: group.name,
                        description: group.description,
                        system: group.system ?? "unknown",
                        isSensitive: group.isSensitive,
                      };

                      return (
                        <Checkbox
                          key={mappedGroup.id}
                          checked={selectedDirectPermissionGroupIdSet.has(mappedGroup.id)}
                          disabled={
                            !canAssignDirectPermissions ||
                            (mappedGroup.isSensitive && !canAssignSensitiveGroup)
                          }
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setDirectPermissionGroupDirty(true);
                            setSelectedDirectPermissionGroupIds((current) => {
                              const base = directPermissionGroupDirty
                                ? current
                                : displayedDirectPermissionGroupIds;
                              return checked
                                ? Array.from(new Set([...base, mappedGroup.id]))
                                : base.filter((id) => id !== mappedGroup.id);
                            });
                          }}
                          label={`${mappedGroup.code} · ${mappedGroup.name}${mappedGroup.isSensitive ? " — Nhạy cảm" : ""}`}
                          description={
                            mappedGroup.description
                              ? `Hiệu lực: ${mappedGroup.description}`
                              : "Chưa có mô tả phạm vi hiệu lực."
                          }
                        />
                      );
                    })}
                  </Stack>
                </ScrollArea>
                <TextInput
                  label="Lý do thay đổi"
                  value={directPermissionGroupReason}
                  onChange={(event) => setDirectPermissionGroupReason(event.currentTarget.value)}
                  disabled={!canAssignDirectPermissions}
                  required={hasSensitivePermissionGroupChanges}
                />
                <Group justify="flex-end">
                  <Button
                    disabled={
                      !canAssignDirectPermissions ||
                      !hasDirectPermissionGroupChanges ||
                      (hasSensitivePermissionGroupChanges &&
                        directPermissionGroupReason.trim().length === 0)
                    }
                    loading={updateDirectPermissionGroupsMutation.isPending}
                    onClick={() => updateDirectPermissionGroupsMutation.mutate()}
                  >
                    Lưu nhóm quyền
                  </Button>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="permissions" pt="md">
              <Stack gap="sm">
                <Alert color="yellow" title="Cảnh báo">
                  Gán quyền trực tiếp là ngoại lệ, nên ưu tiên gán qua vai trò
                  hoặc nhóm quyền.
                </Alert>

                <Group grow align="flex-end" wrap="wrap">
                  <NormalizedSearchInput
                    label="Tìm quyền"
                    placeholder="Ví dụ: hr.employee.read"
                    value={permissionSearch}
                    miw={220}
                    onChange={setPermissionSearch}
                  />
                  <Select
                    clearable
                    label="Hệ thống"
                    data={permissionSystemOptions}
                    miw={180}
                    value={permissionSystemFilter}
                    onChange={setPermissionSystemFilter}
                  />
                  <Select
                    clearable
                    label="Mô-đun"
                    data={permissionModuleOptions}
                    miw={180}
                    value={permissionModuleFilter}
                    onChange={setPermissionModuleFilter}
                  />
                </Group>

                <ScrollArea h={320}>
                  <Stack gap="xs">
                    {filteredPermissions.length === 0 ? (
                      <Text size="sm" c="dimmed">Không có quyền nào khớp bộ lọc.</Text>
                    ) : null}
                    {filteredPermissions.map((permission) => {
                      const inherited = inheritedPermissionCodes.has(permission.code);
                      const sensitiveDisabled = permission.isSensitive && !canAssignSensitivePermission;
                      const managedByHrm = isWorkReportManagedPermission(permission);
                      const baseDisabled = editDisabled || !canAssignDirectPermissions || !isDirectlyAssignablePermission(permission) || sensitiveDisabled;
                      return (
                        <Box key={permission.id} p="xs" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
                          <Group justify="space-between" align="flex-start">
                            <Box>
                              <Text size="sm" fw={500}>{permissionLabel(permission)}</Text>
                              {permission.description ? <Text size="xs" c="dimmed">{permission.description}</Text> : null}
                              <Group gap="xs" mt={4}>
                                {inherited ? <Badge color="blue" variant="light">Đã có từ vai trò/nhóm</Badge> : null}
                                {permission.isSensitive ? <Badge color="red" variant="light">Nhạy cảm</Badge> : null}
                                {managedByHrm ? <Badge color="grape" variant="light">HRM quản lý</Badge> : null}
                                {!isDirectlyAssignablePermission(permission) ? <Badge color="gray" variant="light">Không thể gán trực tiếp</Badge> : null}
                              </Group>
                              {managedByHrm ? <Text size="xs" c="dimmed" mt={4}>{WORK_REPORT_MANAGED_ASSIGNMENT_MESSAGE}</Text> : null}
                            </Box>
                            <Group gap="md">
                              <Checkbox
                                label="Cho phép"
                                checked={selectedDirectPermissionIdSet.has(permission.id)}
                                disabled={baseDisabled || (inherited && !selectedDirectPermissionIdSet.has(permission.id))}
                                onChange={(event) => {
                                  const checked = event.currentTarget.checked;
                                  setDirectPermissionDirty(true);
                                  const allowBase = directPermissionDirty ? selectedDirectPermissionIds : displayedDirectPermissionIds;
                                  setSelectedDirectPermissionIds(checked
                                    ? Array.from(new Set([...allowBase, permission.id]))
                                    : allowBase.filter((value) => value !== permission.id));
                                  if (checked) {
                                    const denyBase = directPermissionDirty ? selectedDirectDenyIds : displayedDirectDenyIds;
                                    setSelectedDirectDenyIds(denyBase.filter((value) => value !== permission.id));
                                  }
                                }}
                              />
                              <Checkbox
                                label="Từ chối"
                                color="red"
                                checked={selectedDirectDenyIdSet.has(permission.id)}
                                disabled={baseDisabled}
                                onChange={(event) => {
                                  const checked = event.currentTarget.checked;
                                  setDirectPermissionDirty(true);
                                  const denyBase = directPermissionDirty ? selectedDirectDenyIds : displayedDirectDenyIds;
                                  setSelectedDirectDenyIds(checked
                                    ? Array.from(new Set([...denyBase, permission.id]))
                                    : denyBase.filter((value) => value !== permission.id));
                                  if (checked) {
                                    const allowBase = directPermissionDirty ? selectedDirectPermissionIds : displayedDirectPermissionIds;
                                    setSelectedDirectPermissionIds(allowBase.filter((value) => value !== permission.id));
                                  }
                                }}
                              />
                            </Group>
                          </Group>
                        </Box>
                      );
                    })}
                  </Stack>
                </ScrollArea>

                {hasDirectPermissionChanges ? (
                  <Alert color="blue" title="Thay đổi quyền ghi đè trước khi lưu">
                    <Text size="sm">Cho phép thêm: {overrideDiff.allowAdded.map((id) => permissionById.get(id)?.code ?? id).join(", ") || "Không có"}</Text>
                    <Text size="sm">Cho phép thu hồi: {overrideDiff.allowRemoved.map((id) => permissionById.get(id)?.code ?? id).join(", ") || "Không có"}</Text>
                    <Text size="sm">Từ chối thêm: {overrideDiff.denyAdded.map((id) => permissionById.get(id)?.code ?? id).join(", ") || "Không có"}</Text>
                    <Text size="sm">Từ chối thu hồi: {overrideDiff.denyRemoved.map((id) => permissionById.get(id)?.code ?? id).join(", ") || "Không có"}</Text>
                  </Alert>
                ) : null}

                <TextInput
                  label="Lý do bắt buộc"
                  placeholder="Nhập lý do để ghi nhật ký kiểm tra"
                  value={directPermissionReason}
                  onChange={(event) => setDirectPermissionReason(event.currentTarget.value)}
                  required
                  disabled={editDisabled || !canAssignDirectPermissions}
                />

                <Group justify="flex-end">
                  <Tooltip
                    label={
                      editDisabled || !canAssignDirectPermissions
                        ? disabledTooltip
                        : ""
                    }
                    disabled={!editDisabled && canAssignDirectPermissions}
                  >
                    <span>
                      <Button
                        onClick={() =>
                          void updateDirectPermissionsMutation.mutateAsync()
                        }
                        disabled={
                          !hasDirectPermissionChanges ||
                          editDisabled ||
                          !canAssignDirectPermissions ||
                          directPermissionReason.trim().length === 0
                        }
                        loading={updateDirectPermissionsMutation.isPending}
                      >
                        Lưu quyền trực tiếp
                      </Button>
                    </span>
                  </Tooltip>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="effective" pt="md">
              <Stack gap="sm">
                <NormalizedSearchInput
                  label="Tìm quyền hiệu lực"
                  placeholder="Tìm theo mã quyền hoặc nguồn"
                  value={effectiveSearch}
                  onChange={setEffectiveSearch}
                />

                <ScrollArea h={420}>
                  <Stack gap="sm">
                    {filteredEffectivePermissions.length === 0 ? (
                      <Text size="sm" c="dimmed">
                        Không có quyền hiệu lực nào khớp bộ lọc.
                      </Text>
                    ) : (
                      filteredEffectivePermissions.map(
                        renderEffectivePermission,
                      )
                    )}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      ) : null}
    </>
  );
}
