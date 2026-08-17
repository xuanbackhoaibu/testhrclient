import { ROUTES } from '../../shared/constants/routes';
import { canAccessRoute, isSuperAdmin } from './routePolicies';
import type { AuthUser } from './types';

const NON_DASHBOARD_ENTRY_ROUTES = [
  ROUTES.employees,
  ROUTES.businessSectors,
  ROUTES.units,
  ROUTES.departments,
  ROUTES.positions,
  ROUTES.movements,
  ROUTES.attendance,
  ROUTES.attendanceMapping,
  ROUTES.calendar,
  ROUTES.imports,
  ROUTES.accounts,
  ROUTES.pendingHrLinkAccounts,
  ROUTES.roles,
  ROUTES.permissionGroups,
  ROUTES.permissions,
  ROUTES.workReportAuthorizations,
  ROUTES.settings,
] as const;

export function getPostLoginDestination(
  user: AuthUser | null | undefined,
): string | null {
  if (isSuperAdmin(user) && canAccessRoute(user, ROUTES.dashboard)) {
    return ROUTES.dashboard;
  }

  return (
    NON_DASHBOARD_ENTRY_ROUTES.find((route) => canAccessRoute(user, route)) ??
    null
  );
}
