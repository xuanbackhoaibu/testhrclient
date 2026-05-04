import type { AuthUser } from './types';

export const HRM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  HR: 'HR',
  BAN_LANH_DAO: 'BAN_LANH_DAO',
  BAN_LANH_DAO_DON_VI: 'BAN_LANH_DAO_DON_VI',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export type HrmRole = (typeof HRM_ROLES)[keyof typeof HRM_ROLES];

// HR permission constants — map to standard DB codes (system.module.action)
export const HR_PERMISSIONS = {
  READ: 'hr.employee.read',
  WRITE: 'hr.employee.create',
  IMPORT: 'hr.employee.import',
  PROVISION: 'hr.account.create',
  AUDIT_READ: 'hr.employee.read',
  AUTHORITY_READ: 'auth.role.read',
  AUTHORITY_WRITE: 'auth.role.manage',
} as const;

// Auth-admin permission constants — map to standard DB codes (system.module.action)
// Route prefix is /api/v1/auth-admin/* but permissions use auth.* namespace (not auth-admin.*)
export const AUTH_ADMIN_PERMISSIONS = {
  USERS_READ: 'auth.user.read',
  USERS_UPDATE: 'auth.user.update_status',
  USERS_PROVISION: 'auth.user.provision',
  USERS_REVOKE_SESSIONS: 'auth.user.revoke_sessions',
  USERS_SEND_ACTIVATION: 'auth.user.send_activation',
  ROLES_READ: 'auth.role.read',
  ROLES_ASSIGN: 'auth.user.assign_role',
  PERMISSIONS_READ: 'auth.role.read',
  PERMISSIONS_ASSIGN: 'auth.user.assign_permission',
  PERMISSION_GROUPS_READ: 'auth.role.read',
  PERMISSION_GROUPS_ASSIGN: 'auth.permission_group.manage',
} as const;

// Backward-compat expansion for tokens that still carry legacy admin.hr.* permissions.
// Tokens issued by the new system already carry granular hr.*/auth.* codes directly.
const PERMISSION_ALIASES: Record<string, string[]> = {
  // ── Legacy admin.hr.* → granular hr.* ───────────────────────────────────
  'admin.hr.read': [
    'hr.employee.read',
    'hr.unit.read',
    'hr.department.read',
    'hr.position.read',
    'hr.business_sector.read',
    'hr.account.read',
  ],
  'admin.hr.write': [
    'admin.hr.read',
    'hr.employee.create',
    'hr.employee.update',
    'hr.unit.create',
    'hr.unit.update',
    'hr.unit.delete',
    'hr.department.create',
    'hr.department.update',
    'hr.department.delete',
    'hr.position.create',
    'hr.position.update',
    'hr.position.delete',
    'hr.business_sector.create',
    'hr.business_sector.update',
    'hr.business_sector.delete',
  ],
  'admin.hr.import': ['admin.hr.read', 'hr.employee.import'],
  'admin.hr.provision': [
    'admin.hr.read',
    'hr.account.create',
    'hr.account.update',
    'hr.account.lock',
    'hr.account.deactivate',
    'hr.account.restore',
    'hr.account.reset_password',
    'hr.account.assign_role',
    'hr.account.assign_permission',
    'hr.account.delete',
    'auth.user.read',
    'auth.user.update_status',
    'auth.user.revoke_sessions',
    'auth.user.send_activation',
    'auth.user.provision',
  ],
  'admin.authority.read': ['auth.user.read', 'auth.role.read'],
  'admin.authority.write': [
    'auth.role.manage',
    'auth.user.assign_role',
    'auth.user.assign_permission',
  ],
  'admin.audit.read': ['hr.employee.read'],
  'admin.users.read': ['auth.user.read'],
  'admin.users.write': ['auth.user.read', 'auth.user.update_status'],
  'admin.users.lock': ['auth.user.update_status', 'hr.account.lock'],
  'admin.users.unlock': ['auth.user.update_status', 'hr.account.lock'],
  'admin.users.deactivate': ['auth.user.update_status', 'hr.account.deactivate'],
  'admin.users.revoke_sessions': ['auth.user.revoke_sessions'],
  // ── Legacy hr.employee.* compound codes ──────────────────────────────────
  'hr.employee.write': ['hr.employee.create', 'hr.employee.update'],
  'hr.employee.provision': ['hr.account.create', 'hr.account.update'],
  'hr.account.link': ['hr.account.update'],
  // ── Legacy auth.account.* → hr.account.* ─────────────────────────────────
  'auth.account.read': ['hr.account.read'],
  'auth.account.create': ['hr.account.create'],
  'auth.account.update': ['hr.account.update'],
  'auth.account.activate': ['hr.account.restore'],
  'auth.account.suspend': ['hr.account.lock'],
  'auth.account.send_activation': ['hr.account.reset_password'],
  // ── Legacy auth.role.assign / auth.permission.assign ─────────────────────
  'auth.role.assign': ['auth.user.assign_role', 'auth.role.manage'],
  'auth.permission.assign': ['auth.user.assign_permission'],
};

const ROLE_ALIASES: Record<string, HrmRole> = {
  SUPER_ADMIN: HRM_ROLES.SUPER_ADMIN,
  SYSTEM_ADMIN: HRM_ROLES.SUPER_ADMIN,
  super_admin: HRM_ROLES.SUPER_ADMIN,
  ADMIN: HRM_ROLES.ADMIN,
  OPERATOR: HRM_ROLES.ADMIN,
  operator: HRM_ROLES.ADMIN,
  HR: HRM_ROLES.HR,
  HR_ADMIN: HRM_ROLES.HR,
  hr_admin: HRM_ROLES.HR,
  BAN_LANH_DAO: HRM_ROLES.BAN_LANH_DAO,
  VIEWER: HRM_ROLES.BAN_LANH_DAO,
  viewer: HRM_ROLES.BAN_LANH_DAO,
  BAN_LANH_DAO_DON_VI: HRM_ROLES.BAN_LANH_DAO_DON_VI,
  MANAGER: HRM_ROLES.BAN_LANH_DAO_DON_VI,
  EMPLOYEE: HRM_ROLES.EMPLOYEE,
};

export function normalizeRole(role: string): HrmRole | null {
  return ROLE_ALIASES[role] ?? ROLE_ALIASES[role.toUpperCase()] ?? null;
}

export function normalizeRoles(roles: string[]): HrmRole[] {
  return Array.from(
    new Set(
      roles
        .map((role) => normalizeRole(role))
        .filter((role): role is HrmRole => Boolean(role)),
    ),
  );
}

function expandPermissionSet(permissions: string[]): Set<string> {
  const expanded = new Set<string>();
  const stack = [...permissions];

  while (stack.length > 0) {
    const permission = stack.pop()?.trim();
    if (!permission || expanded.has(permission)) {
      continue;
    }

    expanded.add(permission);
    for (const alias of PERMISSION_ALIASES[permission] ?? []) {
      if (!expanded.has(alias)) {
        stack.push(alias);
      }
    }
  }

  return expanded;
}

export function hasPermission(
  user: AuthUser | null | undefined,
  permission: string,
): boolean {
  if (!user) {
    return false;
  }

  const permissions = user.permissions ?? [];
  if (!permissions.length) {
    return false;
  }

  const expanded = expandPermissionSet(permissions);
  return expanded.has('*') || expanded.has(permission);
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

export function hasRole(user: AuthUser | null | undefined, role: string) {
  const rawRoles = new Set(user?.roles ?? []);
  if (rawRoles.has(role)) {
    return true;
  }

  const normalizedRole = normalizeRole(role);
  return normalizedRole ? normalizeRoles(user?.roles ?? []).includes(normalizedRole) : false;
}

export function hasAnyRole(user: AuthUser | null | undefined, roles: string[]) {
  return roles.some((role) => hasRole(user, role));
}

export function canViewEmployees(user: AuthUser | null | undefined) {
  return hasAnyRole(user, [
    HRM_ROLES.SUPER_ADMIN,
    HRM_ROLES.ADMIN,
    HRM_ROLES.HR,
    HRM_ROLES.BAN_LANH_DAO,
    HRM_ROLES.BAN_LANH_DAO_DON_VI,
  ]);
}

export function canCreateEmployee(user: AuthUser | null | undefined) {
  return hasAnyRole(user, [HRM_ROLES.SUPER_ADMIN, HRM_ROLES.ADMIN, HRM_ROLES.HR]);
}

export const canEditEmployee = canCreateEmployee;

export function canManageAccount(user: AuthUser | null | undefined) {
  return canCreateEmployee(user);
}

export function canManageMasterData(user: AuthUser | null | undefined) {
  return canCreateEmployee(user);
}

export function canViewAuditLogs(user: AuthUser | null | undefined) {
  return hasAnyRole(user, [HRM_ROLES.SUPER_ADMIN, HRM_ROLES.ADMIN, HRM_ROLES.HR]);
}

export function canAssignRole(
  user: AuthUser | null | undefined,
  targetRole: HrmRole,
) {
  if (hasRole(user, HRM_ROLES.SUPER_ADMIN)) {
    return true;
  }
  if (hasRole(user, HRM_ROLES.ADMIN)) {
    return targetRole !== HRM_ROLES.SUPER_ADMIN;
  }
  if (hasRole(user, HRM_ROLES.HR)) {
    return targetRole !== HRM_ROLES.SUPER_ADMIN && targetRole !== HRM_ROLES.ADMIN;
  }
  return false;
}
