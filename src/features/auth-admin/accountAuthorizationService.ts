import { ApiError } from '../../shared/api/api.types';
import { getEmployee } from '../employees/employeesApi';
import type { Employee } from '../employees/employeeTypes';
import {
  assignPermissions,
  assignRoles,
  getAuthUser,
  getEffectivePermissions,
  getPermissionGroup,
  getPermissionGroups,
  getPermissionsGrouped,
  getRole,
  getRoles,
  listUsers,
} from './authAdminApi';
import type {
  AuthAdminUser,
  PermissionDefinition,
  PermissionsGroupedResult,
  RoleDefinition,
  RoleDetail,
} from './authAdminTypes';
import type {
  AccountAuthorizationDetail,
  AccountManagementRow,
  AccountPermissionSource,
  EffectivePermission,
  MissingAccountAuthorizationEndpoint,
  Permission,
  Role,
} from './accountAuthorizationTypes';

type ListAccountRowsParams = {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

type ListAccountRowsResult = {
  data: AccountManagementRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const AUTH_ADMIN_PUBLIC_BASE = '/api/v1/auth-admin';

const MISSING_DIRECT_PERMISSION_GROUP_ENDPOINTS: MissingAccountAuthorizationEndpoint[] = [
  {
    method: 'GET',
    endpoint: `${AUTH_ADMIN_PUBLIC_BASE}/users/:id/permission-groups`,
    reason: 'Backend chua co endpoint doc permission group duoc gan truc tiep cho account.',
  },
  {
    method: 'PUT',
    endpoint: `${AUTH_ADMIN_PUBLIC_BASE}/users/:id/permission-groups`,
    reason: 'Backend chua co endpoint gan/bo permission group truc tiep cho account.',
  },
];

function toPermission(definition: PermissionDefinition): Permission {
  const code = definition.key;
  const [systemPart = 'unknown', modulePart = 'general', actionPart = 'read'] = code.split('.');

  return {
    id: definition.id,
    code,
    name: definition.name ?? code,
    system: definition.system ?? definition.domain ?? systemPart,
    module: definition.module ?? modulePart,
    action: definition.action ?? actionPart,
    description: definition.description ?? undefined,
  };
}

function toRole(
  definition: RoleDefinition,
  permissions?: Permission[],
  permissionGroups?: {
    id: string;
    code: string;
    name: string;
    system: string;
    permissions?: Permission[];
  }[],
): Role {
  return {
    id: definition.id ?? definition.key ?? definition.name,
    code: definition.key ?? definition.name,
    name: definition.name,
    description: definition.description ?? undefined,
    permissions,
    permissionGroups,
  };
}

function flattenPermissionsGrouped(grouped: PermissionsGroupedResult): Permission[] {
  return grouped.systems.flatMap((systemGroup) =>
    systemGroup.permissions.map((permission) =>
      toPermission({
        ...permission,
        system: permission.system ?? systemGroup.domain,
        domain: permission.domain ?? systemGroup.domain,
      }),
    ),
  );
}

function normalizeAuthzError(
  error: unknown,
  action: string,
  endpoint: string,
  forbiddenMessage: string,
): never {
  if (error instanceof ApiError) {
    if (error.statusCode === 403) {
      throw new Error(forbiddenMessage);
    }

    if (error.statusCode === 404) {
      throw new Error(`404 khi ${action}: ${endpoint}`);
    }

    throw new Error(error.message);
  }

  throw error instanceof Error ? error : new Error(`Khong the ${action}.`);
}

async function getEmployeeForAccount(account: AuthAdminUser): Promise<Employee | null> {
  if (!account.hrEmployeeId) {
    return null;
  }

  try {
    return await getEmployee(account.hrEmployeeId);
  } catch {
    return null;
  }
}

async function getRolesForAccount(accountId: string): Promise<Role[]> {
  try {
    const [roleCatalog, effective] = await Promise.all([
      getRoles({ status: 'active' }),
      getEffectivePermissions(accountId),
    ]);

    const catalogByCode = new Map(
      roleCatalog.map((role) => [role.key ?? role.name, role]),
    );

    return effective.roles.map((code) => {
      const definition = catalogByCode.get(code);
      return toRole(definition ?? { id: code, key: code, name: code });
    });
  } catch {
    return [];
  }
}

function buildSourceKey(source: AccountPermissionSource) {
  return `${source.type}:${source.id}:${source.code}`;
}

function addSource(
  target: Map<string, Map<string, AccountPermissionSource>>,
  permissionCode: string,
  source: AccountPermissionSource,
) {
  if (!target.has(permissionCode)) {
    target.set(permissionCode, new Map());
  }

  target.get(permissionCode)?.set(buildSourceKey(source), source);
}

function resolvePermissionByCode(
  permissionByCode: Map<string, Permission>,
  code: string,
): Permission {
  const existing = permissionByCode.get(code);
  if (existing) {
    return existing;
  }

  const [system = 'unknown', module = 'general', action = 'read'] = code.split('.');
  return {
    id: code,
    code,
    name: code,
    system,
    module,
    action,
  };
}

async function buildEffectivePermissionsWithSources(
  accountId: string,
): Promise<Pick<AccountAuthorizationDetail, 'roles' | 'directPermissions' | 'effectivePermissions' | 'missingEndpoints'>> {
  const [effective, roleCatalog, permissionGroupCatalog, groupedPermissions] = await Promise.all([
    getEffectivePermissions(accountId).catch((error) =>
      normalizeAuthzError(
        error,
        'tai effective permissions',
        `${AUTH_ADMIN_PUBLIC_BASE}/users/${accountId}/effective-permissions`,
        'Ban khong co quyen phan quyen tai khoan nay.',
      ),
    ),
    getRoles({ status: 'active' }).catch((error) =>
      normalizeAuthzError(
        error,
        'tai danh sach role',
        `${AUTH_ADMIN_PUBLIC_BASE}/roles`,
        'Ban khong co quyen phan quyen tai khoan nay.',
      ),
    ),
    getPermissionGroups({ status: 'active' }).catch((error) =>
      normalizeAuthzError(
        error,
        'tai danh sach permission group',
        `${AUTH_ADMIN_PUBLIC_BASE}/permission-groups`,
        'Ban khong co quyen phan quyen tai khoan nay.',
      ),
    ),
    getPermissionsGrouped().catch((error) =>
      normalizeAuthzError(
        error,
        'tai danh sach permission',
        `${AUTH_ADMIN_PUBLIC_BASE}/permissions/grouped`,
        'Ban khong co quyen phan quyen tai khoan nay.',
      ),
    ),
  ]);

  const permissionCatalog = flattenPermissionsGrouped(groupedPermissions);
  const permissionByCode = new Map(permissionCatalog.map((permission) => [permission.code, permission]));

  const roleCatalogByCode = new Map(
    roleCatalog.map((role) => [role.key ?? role.name, role]),
  );

  const roles = effective.roles.map((code) => {
    const definition = roleCatalogByCode.get(code);
    return toRole(definition ?? { id: code, key: code, name: code });
  });

  const roleDetails = (
    await Promise.all(
      roles.map(async (role) => {
        try {
          return role.id ? await getRole(role.id) : null;
        } catch {
          return null;
        }
      }),
    )
  ).filter((role): role is RoleDetail => Boolean(role));

  const uniqueRoleGroupIds = Array.from(
    new Set(
      roleDetails.flatMap((role) =>
        (role.permissionGroups ?? [])
          .map((group) => group.id)
          .filter((groupId): groupId is string => Boolean(groupId)),
      ),
    ),
  );

  const permissionGroupCatalogById = new Map(
    permissionGroupCatalog.map((group) => [group.id, group]),
  );

  const roleGroupDetails = new Map(
    (
      await Promise.all(
        uniqueRoleGroupIds.map(async (groupId) => {
          try {
            const detail = await getPermissionGroup(groupId);
            return [groupId, detail] as const;
          } catch {
            return null;
          }
        }),
      )
    ).filter(
      (entry): entry is readonly [string, Awaited<ReturnType<typeof getPermissionGroup>>] =>
        Boolean(entry),
    ),
  );

  const sourcesByPermissionCode = new Map<string, Map<string, AccountPermissionSource>>();

  roleDetails.forEach((roleDetail) => {
    const roleSource: AccountPermissionSource = {
      type: 'ROLE',
      id: roleDetail.id,
      code: roleDetail.key,
      name: roleDetail.name,
    };

    (roleDetail.permissions ?? []).forEach((permission) => {
      addSource(sourcesByPermissionCode, permission.key, roleSource);
    });

    (roleDetail.permissionGroups ?? []).forEach((group) => {
      const groupDefinition = permissionGroupCatalogById.get(group.id) ?? group;
      const groupSource: AccountPermissionSource = {
        type: 'PERMISSION_GROUP',
        id: groupDefinition.id,
        code: groupDefinition.key,
        name: groupDefinition.name,
      };

      roleGroupDetails.get(group.id)?.permissions?.forEach((permission) => {
        addSource(sourcesByPermissionCode, permission.key, roleSource);
        addSource(sourcesByPermissionCode, permission.key, groupSource);
      });
    });
  });

  const directPermissions = effective.directPermissions.map((code) => {
    const permission = resolvePermissionByCode(permissionByCode, code);

    addSource(sourcesByPermissionCode, code, {
      type: 'DIRECT_PERMISSION',
      id: permission.id,
      code: permission.code,
      name: permission.name,
    });

    return permission;
  });

  const effectivePermissions: EffectivePermission[] = effective.effectivePermissions
    .map((code) => ({
      permission: resolvePermissionByCode(permissionByCode, code),
      sources: Array.from(sourcesByPermissionCode.get(code)?.values() ?? []),
    }))
    .sort((left, right) => left.permission.code.localeCompare(right.permission.code));

  return {
    roles,
    directPermissions,
    effectivePermissions,
    missingEndpoints: [...MISSING_DIRECT_PERMISSION_GROUP_ENDPOINTS],
  };
}

export async function listAccountManagementRows(
  params: ListAccountRowsParams,
): Promise<ListAccountRowsResult> {
  const result = await listUsers(params).catch((error) =>
    normalizeAuthzError(
      error,
      'tai danh sach tai khoan',
      `${AUTH_ADMIN_PUBLIC_BASE}/users`,
      'Ban khong co quyen xem danh sach tai khoan.',
    ),
  );

  const rows = await Promise.all(
    result.data.map(async (account) => {
      const [employee, roles] = await Promise.all([
        getEmployeeForAccount(account),
        getRolesForAccount(account.authUserId),
      ]);

      return {
        account,
        employee,
        roles,
        effectivePermissionsCount: null,
      } satisfies AccountManagementRow;
    }),
  );

  return {
    ...result,
    data: rows,
  };
}

export async function getAccountAuthorizationDetail(
  accountId: string,
): Promise<AccountAuthorizationDetail> {
  const [account, authz] = await Promise.all([
    getAuthUser(accountId).catch((error) =>
      normalizeAuthzError(
        error,
        'tai chi tiet tai khoan',
        `${AUTH_ADMIN_PUBLIC_BASE}/users/${accountId}`,
        'Ban khong co quyen phan quyen tai khoan nay.',
      ),
    ),
    buildEffectivePermissionsWithSources(accountId),
  ]);

  return {
    accountId,
    account,
    roles: authz.roles,
    directPermissionGroups: [],
    directPermissions: authz.directPermissions,
    effectivePermissions: authz.effectivePermissions,
    missingEndpoints: authz.missingEndpoints,
  };
}

export async function updateAccountRoles(
  accountId: string,
  roleCodes: string[],
  reason?: string,
) {
  return assignRoles(accountId, { roles: roleCodes, reason }).catch((error) =>
    normalizeAuthzError(
      error,
      'cap nhat role tai khoan',
      `${AUTH_ADMIN_PUBLIC_BASE}/users/${accountId}/roles`,
      'Ban khong co quyen phan quyen tai khoan nay.',
    ),
  );
}

export async function updateAccountDirectPermissions(
  accountId: string,
  permissionCodes: string[],
  reason: string,
) {
  return assignPermissions(accountId, { permissions: permissionCodes, reason }).catch((error) =>
    normalizeAuthzError(
      error,
      'cap nhat permission truc tiep',
      `${AUTH_ADMIN_PUBLIC_BASE}/users/${accountId}/permissions`,
      'Ban khong co quyen phan quyen tai khoan nay.',
    ),
  );
}

export function getMissingDirectPermissionGroupEndpoints() {
  return [...MISSING_DIRECT_PERMISSION_GROUP_ENDPOINTS];
}
