import { ApiError } from '../../shared/api/api.types';
import { getEmployeesByAuthUserIds } from '../employees/employeesApi';
import type { Employee } from '../employees/employeeTypes';
import {
  assignPermissions,
  assignPermissionGroups,
  assignRoles,
  getAuthUser,
  getEffectivePermissions,
  getPermissionGroups,
  getUserPermissionGroups,
  getPermissionsGrouped,
  getRoles,
  listUsers,
} from './authAdminApi';
import type {
  AuthAdminUser,
  PermissionDefinition,
  PermissionsGroupedResult,
  RoleDefinition,
} from './authAdminTypes';
import type {
  AccountAuthorizationDetail,
  AccountManagementRow,
  AccountPermissionSource,
  EffectivePermission,
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

async function getEmployeesByAuthUserIdMap(
  accounts: AuthAdminUser[],
): Promise<Map<string, Employee>> {
  const authUserIds = Array.from(
    new Set(accounts.map((account) => account.authUserId).filter(Boolean)),
  );
  if (authUserIds.length === 0) {
    return new Map();
  }

  try {
    const employees = await getEmployeesByAuthUserIds(authUserIds, {
      source: 'accountAuthorizationService.listAccountManagementRows',
    });
    return new Map(
      employees
        .filter((employee): employee is Employee & { authUserId: string } =>
          Boolean(employee.authUserId),
        )
        .map((employee) => [employee.authUserId, employee] as const),
    );
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        '[accountAuthorizationService] could not load HR employees for auth users',
        error,
      );
    }
    return new Map();
  }
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
): Promise<
  Pick<
    AccountAuthorizationDetail,
    | 'roles'
    | 'directPermissionGroups'
    | 'directPermissions'
    | 'effectivePermissions'
    | 'roleCatalog'
    | 'permissionGroupCatalog'
    | 'permissionCatalog'
    | 'missingEndpoints'
  >
> {
  const [effective, directGroupResult, roleCatalog, permissionGroupCatalog, groupedPermissions] = await Promise.all([
    getEffectivePermissions(accountId).catch((error) =>
      normalizeAuthzError(
        error,
        'tai effective permissions',
        `${AUTH_ADMIN_PUBLIC_BASE}/users/${accountId}/effective-permissions`,
        'Ban khong co quyen phan quyen tai khoan nay.',
      ),
    ),
    getUserPermissionGroups(accountId).catch((error) =>
      normalizeAuthzError(
        error,
        'tai nhom quyen truc tiep',
        `${AUTH_ADMIN_PUBLIC_BASE}/users/${accountId}/permission-groups`,
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

  const sourcesByPermissionCode = new Map<string, AccountPermissionSource[]>(
    Object.entries(effective.permissionSources ?? {}).map(([permissionCode, sources]) => [
      permissionCode,
      sources.map((source) => ({
        type: source.sourceType,
        id: source.sourceId,
        code: source.sourceKey,
        name: source.sourceName,
      })),
    ]),
  );

  const directPermissions = effective.directPermissions.map((code) => {
    const permission = resolvePermissionByCode(permissionByCode, code);

    return permission;
  });

  const directPermissionGroups = directGroupResult.permissionGroups.map((group) => ({
    id: group.id,
    code: group.key,
    name: group.name,
    system: group.system ?? 'unknown',
  }));

  const effectivePermissions: EffectivePermission[] = effective.effectivePermissions
    .map((code) => ({
      permission: resolvePermissionByCode(permissionByCode, code),
      sources: sourcesByPermissionCode.get(code) ?? [],
    }))
    .sort((left, right) => left.permission.code.localeCompare(right.permission.code));

  return {
    roles,
    directPermissionGroups,
    directPermissions,
    effectivePermissions,
    roleCatalog: roleCatalog.map((role) => toRole(role)),
    permissionGroupCatalog: permissionGroupCatalog.map((group) => ({
      id: group.id,
      code: group.key,
      name: group.name,
      system: group.system ?? 'unknown',
    })),
    permissionCatalog,
    missingEndpoints: [],
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
  const employeesByAuthUserId = await getEmployeesByAuthUserIdMap(result.data);

  // Account list rendering must not fan out one role-catalog and one
  // effective-permissions request per row. Those are target-user details and
  // are loaded once by useAccountAuthorization only after an operator opens a
  // particular account drawer/modal.
  const rows = result.data.map((account) => ({
    account,
    employee: employeesByAuthUserId.get(account.authUserId) ?? null,
    roles: [],
    rolesLoaded: false,
    effectivePermissionsCount: null,
  })) satisfies AccountManagementRow[];

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
    directPermissionGroups: authz.directPermissionGroups,
    directPermissions: authz.directPermissions,
    effectivePermissions: authz.effectivePermissions,
    roleCatalog: authz.roleCatalog,
    permissionGroupCatalog: authz.permissionGroupCatalog,
    permissionCatalog: authz.permissionCatalog,
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

export async function updateAccountDirectPermissionGroups(
  accountId: string,
  permissionGroupIds: string[],
  reason?: string,
) {
  return assignPermissionGroups(accountId, { permissionGroupIds, reason }).catch((error) =>
    normalizeAuthzError(
      error,
      'cap nhat nhom quyen truc tiep',
      `${AUTH_ADMIN_PUBLIC_BASE}/users/${accountId}/permission-groups`,
      'Ban khong co quyen phan quyen tai khoan nay.',
    ),
  );
}
