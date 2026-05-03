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

export const HR_PERMISSIONS = {
  READ: 'admin.hr.read',
  WRITE: 'admin.hr.write',
  IMPORT: 'admin.hr.import',
  PROVISION: 'admin.hr.provision',
  AUDIT_READ: 'admin.audit.read',
  AUTHORITY_READ: 'admin.authority.read',
  AUTHORITY_WRITE: 'admin.authority.write',
} as const;

const PERMISSION_ALIASES: Record<string, string[]> = {
  'admin.hr.read': [
    'hr.employee.read',
    'hr.unit.read',
    'hr.department.read',
    'hr.position.read',
    'auth.account.read',
  ],
  'admin.hr.write': [
    'admin.hr.read',
    'hr.employee.write',
    'hr.employee.create',
    'hr.employee.update',
    'hr.unit.create',
    'hr.unit.update',
    'hr.department.create',
    'hr.department.update',
    'hr.position.create',
    'hr.position.update',
  ],
  'admin.hr.import': [
    'admin.hr.read',
    'hr.employee.import',
    'hr.unit.import',
    'hr.department.import',
    'hr.position.import',
  ],
  'admin.hr.provision': [
    'admin.hr.read',
    'hr.employee.provision',
    'hr.account.link',
    'auth.account.read',
    'auth.account.create',
    'auth.account.update',
    'auth.account.activate',
    'auth.account.suspend',
    'auth.account.send_activation',
  ],
  'admin.authority.read': ['auth.role.read', 'auth.permission.read'],
  'admin.authority.write': ['auth.role.assign', 'auth.permission.assign'],
  'admin.audit.read': ['hr.employee.read'],
  'hr.employee.write': ['admin.hr.write', 'hr.employee.create', 'hr.employee.update'],
  'hr.employee.import': ['admin.hr.import'],
  'hr.employee.provision': ['admin.hr.provision'],
  'hr.employee.read': ['admin.hr.read'],
  'hr.unit.read': ['admin.hr.read'],
  'hr.department.read': ['admin.hr.read'],
  'hr.position.read': ['admin.hr.read'],
  'auth.account.read': ['admin.hr.provision'],
  'auth.account.create': ['admin.hr.provision'],
  'auth.account.update': ['admin.hr.provision'],
  'auth.account.activate': ['admin.hr.provision'],
  'auth.account.suspend': ['admin.hr.provision'],
  'auth.account.send_activation': ['admin.hr.provision'],
  'auth.role.read': ['admin.authority.read'],
  'auth.permission.read': ['admin.authority.read'],
  'auth.role.assign': ['admin.authority.write'],
  'auth.permission.assign': ['admin.authority.write'],
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

  if (hasRole(user, HRM_ROLES.SUPER_ADMIN)) {
    return true;
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

export function hasRole(user: AuthUser | null | undefined, role: HrmRole) {
  return normalizeRoles(user?.roles ?? []).includes(role);
}

export function hasAnyRole(user: AuthUser | null | undefined, roles: HrmRole[]) {
  const actual = normalizeRoles(user?.roles ?? []);
  return roles.some((role) => actual.includes(role));
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
