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
