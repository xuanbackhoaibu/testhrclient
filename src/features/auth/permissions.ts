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
  DASHBOARD_READ: 'hr.dashboard.read',

  BUSINESS_SECTOR_READ: 'hr.business_sector.read',
  BUSINESS_SECTOR_CREATE: 'hr.business_sector.create',
  BUSINESS_SECTOR_UPDATE: 'hr.business_sector.update',
  BUSINESS_SECTOR_DELETE: 'hr.business_sector.delete',

  UNIT_READ: 'hr.unit.read',
  UNIT_CREATE: 'hr.unit.create',
  UNIT_UPDATE: 'hr.unit.update',
  UNIT_DELETE: 'hr.unit.delete',

  DEPARTMENT_READ: 'hr.department.read',
  DEPARTMENT_CREATE: 'hr.department.create',
  DEPARTMENT_UPDATE: 'hr.department.update',
  DEPARTMENT_DELETE: 'hr.department.delete',

  POSITION_READ: 'hr.position.read',
  POSITION_CREATE: 'hr.position.create',
  POSITION_UPDATE: 'hr.position.update',
  POSITION_DELETE: 'hr.position.delete',

  EMPLOYEE_READ: 'hr.employee.read',
  EMPLOYEE_CREATE: 'hr.employee.create',
  EMPLOYEE_UPDATE: 'hr.employee.update',
  EMPLOYEE_DELETE: 'hr.employee.delete',
  EMPLOYEE_IMPORT: 'hr.employee.import',
  EMPLOYEE_EXPORT: 'hr.employee.export',

  // Attendance
  ATTENDANCE_READ: 'hr.attendance.read',
  ATTENDANCE_SYNC: 'hr.attendance.sync',
  ATTENDANCE_SYNC_LOG_READ: 'hr.attendance.sync_log.read',

  ACCOUNT_READ: 'hr.account.read',
  ACCOUNT_CREATE: 'hr.account.create',
  ACCOUNT_UPDATE: 'hr.account.update',
  ACCOUNT_LOCK: 'hr.account.lock',
  ACCOUNT_DEACTIVATE: 'hr.account.deactivate',
  ACCOUNT_RESTORE: 'hr.account.restore',
  ACCOUNT_RESET_PASSWORD: 'hr.account.reset_password',
  ACCOUNT_ASSIGN_ROLE: 'hr.account.assign_role',
  ACCOUNT_ASSIGN_PERMISSION: 'hr.account.assign_permission',
  ACCOUNT_DELETE: 'hr.account.delete',

  // Compatibility aliases for existing pages/routes in this repo.
  READ: 'hr.employee.read',
  WRITE: 'hr.employee.create',
  IMPORT: 'hr.employee.import',
  PROVISION: 'hr.account.create',
  AUDIT_READ: 'hr.employee.read',
  AUTHORITY_READ: 'auth.role.read',
  AUTHORITY_WRITE: 'auth.role.manage',
} as const;

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

function isSuperAdmin(user: AuthUser | null | undefined): boolean {
  return (
    user?.roles?.some((role) => role.trim().toLowerCase() === 'super_admin') ??
    false
  );
}

export function hasPermission(
  user: AuthUser | null | undefined,
  permission: string,
): boolean {
  if (!user) {
    return false;
  }

  if (isSuperAdmin(user)) {
    return true;
  }

  return user.permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  if (!user) {
    return false;
  }

  if (isSuperAdmin(user)) {
    return true;
  }

  return permissions.some((permission) => user.permissions?.includes(permission));
}

export function hasAllPermissions(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  if (!user) {
    return false;
  }

  if (isSuperAdmin(user)) {
    return true;
  }

  return permissions.every((permission) => user.permissions?.includes(permission));
}

export function hasRole(user: AuthUser | null | undefined, role: string) {
  const rawRoles = new Set(user?.roles ?? []);
  if (rawRoles.has(role)) {
    return true;
  }

  const normalizedRole = normalizeRole(role);
  return normalizedRole
    ? normalizeRoles(user?.roles ?? []).includes(normalizedRole)
    : false;
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

export function canViewAttendance(user: AuthUser | null | undefined) {
  return hasAnyRole(user, [
    HRM_ROLES.SUPER_ADMIN,
    HRM_ROLES.ADMIN,
    HRM_ROLES.HR,
    HRM_ROLES.BAN_LANH_DAO,
    HRM_ROLES.BAN_LANH_DAO_DON_VI,
  ]);
}

export function canSyncAttendance(user: AuthUser | null | undefined) {
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
