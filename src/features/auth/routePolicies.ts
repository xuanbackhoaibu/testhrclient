import { ROUTES } from "../../shared/constants/routes";
import type { AuthUser } from "./types";
import {
  AUTH_ADMIN_PERMISSIONS,
  HR_PERMISSIONS,
  hasAllPermissions,
} from "./permissions";

export type RoutePolicy =
  | { kind: "authenticated" }
  | {
      kind: "permission";
      permissions: readonly string[];
      match?: "all" | "any";
    }
  | { kind: "unavailable"; reason: string };

export const ROUTE_POLICIES: Record<string, RoutePolicy> = {
  [ROUTES.dashboard]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.DASHBOARD_READ],
  },
  [ROUTES.employees]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.EMPLOYEE_READ],
  },
  ["/employees/:id"]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.EMPLOYEE_READ],
  },
  [ROUTES.businessSectors]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.BUSINESS_SECTOR_READ],
  },
  [ROUTES.units]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.UNIT_READ],
  },
  [ROUTES.departments]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.DEPARTMENT_READ],
  },
  [ROUTES.positions]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.POSITION_READ],
  },
  [ROUTES.attendance]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.ATTENDANCE_READ],
  },
  [ROUTES.attendanceMapping]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.ATTENDANCE_READ],
  },
  [ROUTES.monthlyTimesheetRoster]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.ATTENDANCE_READ],
  },
  [ROUTES.timesheetGrid]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.ATTENDANCE_READ],
  },
  [ROUTES.approvalInbox]: {
    kind: "permission",
    permissions: [
      HR_PERMISSIONS.LEAVE_APPROVE,
      HR_PERMISSIONS.LEAVE_REJECT,
      HR_PERMISSIONS.ATTENDANCE_UPDATE,
    ],
    match: "any",
  },
  [ROUTES.annualLeaveBalances]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.LEAVE_BALANCE_READ],
  },
  [ROUTES.timesheetPeriods]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.ATTENDANCE_READ],
  },
  [ROUTES.attendanceRowOrder]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.ATTENDANCE_READ],
  },
  [ROUTES.workShifts]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.ATTENDANCE_READ],
  },
  [ROUTES.weeklyShifts]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.ATTENDANCE_READ],
  },
  [ROUTES.holidays]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.ATTENDANCE_READ],
  },
  [ROUTES.shiftAssignments]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.ATTENDANCE_READ],
  },
  [ROUTES.calendar]: { kind: "authenticated" },
  [ROUTES.imports]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.EMPLOYEE_IMPORT, HR_PERMISSIONS.EMPLOYEE_READ],
    match: "any",
  },
  [ROUTES.auditLogs]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.AUDIT_READ],
  },
  [ROUTES.settings]: { kind: "authenticated" },
  [ROUTES.accounts]: {
    kind: "permission",
    permissions: [AUTH_ADMIN_PERMISSIONS.USERS_READ],
  },
  [ROUTES.accountAuthorizations]: {
    kind: "permission",
    permissions: [AUTH_ADMIN_PERMISSIONS.USERS_READ],
  },
  [ROUTES.pendingHrLinkAccounts]: {
    kind: "permission",
    permissions: [AUTH_ADMIN_PERMISSIONS.USERS_READ],
  },
  [ROUTES.roles]: {
    kind: "permission",
    permissions: [AUTH_ADMIN_PERMISSIONS.ROLES_READ],
  },
  [ROUTES.permissions]: {
    kind: "permission",
    permissions: [AUTH_ADMIN_PERMISSIONS.PERMISSIONS_READ],
  },
  [ROUTES.permissionGroups]: {
    kind: "permission",
    permissions: [AUTH_ADMIN_PERMISSIONS.PERMISSION_GROUPS_READ],
  },
  [ROUTES.workReportAuthorizations]: {
    kind: "permission",
    permissions: ["admin.work_report_authorization.read"],
  },
  [ROUTES.myAccess]: { kind: "authenticated" },

  [ROUTES.movements]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.MOVEMENT_READ],
  },
  [ROUTES.contracts]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.CONTRACT_READ],
  },
  [ROUTES.leave]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.LEAVE_READ],
  },
  [ROUTES.leaveApprovalAssignments]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.LEAVE_UPDATE],
  },
  [ROUTES.onboarding]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.ONBOARDING_READ],
  },
  [ROUTES.offboarding]: {
    kind: "permission",
    permissions: [HR_PERMISSIONS.OFFBOARDING_READ],
  },
};

export function getRoutePolicy(route: string): RoutePolicy {
  return (
    ROUTE_POLICIES[route] ?? {
      kind: "unavailable",
      reason: "Route chưa khai báo authorization policy.",
    }
  );
}

export function isSuperAdmin(user: AuthUser | null | undefined): boolean {
  return Boolean(
    user?.roles?.some(
      (role) =>
        role
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, "_") === "SUPER_ADMIN",
    ),
  );
}

export function canAccessRoute(
  user: AuthUser | null | undefined,
  route: string,
): boolean {
  const policy = getRoutePolicy(route);
  if (
    !user ||
    user.accountStatus !== "ACTIVE" ||
    policy.kind === "unavailable"
  ) {
    return false;
  }
  if (route === ROUTES.approvalInbox) {
    const permissions = user.permissions ?? [];
    return (
      permissions.includes("*") ||
      permissions.includes(HR_PERMISSIONS.LEAVE_APPROVE) ||
      permissions.includes(HR_PERMISSIONS.LEAVE_REJECT) ||
      (permissions.includes(HR_PERMISSIONS.ATTENDANCE_READ) &&
        permissions.includes(HR_PERMISSIONS.ATTENDANCE_UPDATE))
    );
  }
  if (route === ROUTES.dashboard || route === ROUTES.accountAuthorizations) {
    return isSuperAdmin(user);
  }
  if (policy.kind === "authenticated") {
    return true;
  }
  return policy.match === "any"
    ? policy.permissions.some(
        (permission) =>
          user.permissions.includes("*") ||
          user.permissions.includes(permission),
      )
    : hasAllPermissions(user, [...policy.permissions]);
}
