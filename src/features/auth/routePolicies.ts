import { ROUTES } from '../../shared/constants/routes';
import type { AuthUser } from './types';
import { AUTH_ADMIN_PERMISSIONS, HR_PERMISSIONS, hasAllPermissions } from './permissions';

export type RoutePolicy =
  | { kind: 'authenticated' }
  | { kind: 'permission'; permissions: readonly string[]; match?: 'all' | 'any' }
  | { kind: 'unavailable'; reason: string };

export const ROUTE_POLICIES: Record<string, RoutePolicy> = {
  [ROUTES.dashboard]: { kind: 'permission', permissions: [HR_PERMISSIONS.DASHBOARD_READ] },
  [ROUTES.employees]: { kind: 'permission', permissions: [HR_PERMISSIONS.EMPLOYEE_READ] },
  ['/employees/:id']: { kind: 'permission', permissions: [HR_PERMISSIONS.EMPLOYEE_READ] },
  [ROUTES.businessSectors]: { kind: 'permission', permissions: [HR_PERMISSIONS.BUSINESS_SECTOR_READ] },
  [ROUTES.units]: { kind: 'permission', permissions: [HR_PERMISSIONS.UNIT_READ] },
  [ROUTES.departments]: { kind: 'permission', permissions: [HR_PERMISSIONS.DEPARTMENT_READ] },
  [ROUTES.positions]: { kind: 'permission', permissions: [HR_PERMISSIONS.POSITION_READ] },
  [ROUTES.attendance]: { kind: 'permission', permissions: [HR_PERMISSIONS.ATTENDANCE_READ] },
  [ROUTES.attendanceMapping]: { kind: 'permission', permissions: [HR_PERMISSIONS.ATTENDANCE_READ] },
  [ROUTES.calendar]: { kind: 'permission', permissions: [HR_PERMISSIONS.CALENDAR_READ] },
  [ROUTES.imports]: {
    kind: 'permission',
    permissions: [HR_PERMISSIONS.EMPLOYEE_IMPORT, HR_PERMISSIONS.EMPLOYEE_READ],
    match: 'any',
  },
  [ROUTES.auditLogs]: {
    kind: 'unavailable',
    reason: 'Audit log đang được bảo vệ theo role ở HR API, chưa có canonical permission contract.',
  },
  [ROUTES.settings]: { kind: 'authenticated' },
  [ROUTES.accounts]: { kind: 'permission', permissions: [AUTH_ADMIN_PERMISSIONS.USERS_READ] },
  [ROUTES.pendingHrLinkAccounts]: { kind: 'permission', permissions: [AUTH_ADMIN_PERMISSIONS.USERS_READ] },
  [ROUTES.roles]: { kind: 'permission', permissions: [AUTH_ADMIN_PERMISSIONS.ROLES_READ] },
  [ROUTES.permissions]: { kind: 'permission', permissions: [AUTH_ADMIN_PERMISSIONS.PERMISSIONS_READ] },
  [ROUTES.permissionGroups]: { kind: 'permission', permissions: [AUTH_ADMIN_PERMISSIONS.PERMISSION_GROUPS_READ] },

  // Backend still exposes these areas with role-only or incomplete route
  // metadata. Frontend fails closed until canonical permission contracts exist.
  [ROUTES.movements]: { kind: 'unavailable', reason: 'Chưa có canonical permission contract cho điều chuyển.' },
  [ROUTES.contracts]: { kind: 'unavailable', reason: 'Chưa có canonical permission contract cho hợp đồng.' },
  [ROUTES.leave]: { kind: 'unavailable', reason: 'Chưa có canonical permission contract cho nghỉ phép.' },
  [ROUTES.onboarding]: { kind: 'unavailable', reason: 'Chưa có canonical permission contract cho onboarding.' },
  [ROUTES.offboarding]: { kind: 'unavailable', reason: 'Chưa có canonical permission contract cho offboarding.' },
};

export function getRoutePolicy(route: string): RoutePolicy {
  return ROUTE_POLICIES[route] ?? {
    kind: 'unavailable',
    reason: 'Route chưa khai báo authorization policy.',
  };
}

export function canAccessRoute(user: AuthUser | null | undefined, route: string): boolean {
  const policy = getRoutePolicy(route);
  if (!user || user.accountStatus !== 'ACTIVE' || policy.kind === 'unavailable') {
    return false;
  }
  if (policy.kind === 'authenticated') {
    return true;
  }
  return policy.match === 'any'
    ? policy.permissions.some((permission) => user.permissions.includes(permission))
    : hasAllPermissions(user, [...policy.permissions]);
}
