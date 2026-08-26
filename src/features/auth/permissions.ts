import type { AuthUser } from "./types";
import { AUTHORIZATION_WILDCARD_PERMISSION } from "@hacom/chat-shared-types/auth";

export const HR_PERMISSIONS = {
  DASHBOARD_READ: "hr.dashboard.read",

  BUSINESS_SECTOR_READ: "hr.business_sector.read",
  BUSINESS_SECTOR_CREATE: "hr.business_sector.create",
  BUSINESS_SECTOR_UPDATE: "hr.business_sector.update",
  BUSINESS_SECTOR_DELETE: "hr.business_sector.delete",

  UNIT_READ: "hr.unit.read",
  UNIT_CREATE: "hr.unit.create",
  UNIT_UPDATE: "hr.unit.update",
  UNIT_DELETE: "hr.unit.delete",

  DEPARTMENT_READ: "hr.department.read",
  DEPARTMENT_CREATE: "hr.department.create",
  DEPARTMENT_UPDATE: "hr.department.update",
  DEPARTMENT_DELETE: "hr.department.delete",

  POSITION_READ: "hr.position.read",
  POSITION_CREATE: "hr.position.create",
  POSITION_UPDATE: "hr.position.update",
  POSITION_DELETE: "hr.position.delete",

  EMPLOYEE_READ: "hr.employee.read",
  EMPLOYEE_CREATE: "hr.employee.create",
  EMPLOYEE_UPDATE: "hr.employee.update",
  EMPLOYEE_DELETE: "hr.employee.delete",
  EMPLOYEE_IMPORT: "hr.employee.import",
  EMPLOYEE_EXPORT: "hr.employee.export",

  // Attendance
  ATTENDANCE_READ: "hr.attendance.read",
  ATTENDANCE_UPDATE: "hr.attendance.update",
  ATTENDANCE_SYNC: "hr.attendance.sync",
  ATTENDANCE_SYNC_LOG_READ: "hr.attendance.sync_log.read",
  ATTENDANCE_EXPORT: "hr.attendance.export",

  MOVEMENT_READ: "hr.movement.read",
  MOVEMENT_CREATE: "hr.movement.create",
  MOVEMENT_UPDATE: "hr.movement.update",
  MOVEMENT_SUBMIT: "hr.movement.submit",
  MOVEMENT_APPROVE: "hr.movement.approve",
  MOVEMENT_REJECT: "hr.movement.reject",
  MOVEMENT_CANCEL: "hr.movement.cancel",

  LEAVE_READ: "hr.leave.read",
  LEAVE_CREATE: "hr.leave.create",
  LEAVE_UPDATE: "hr.leave.update",
  LEAVE_SUBMIT: "hr.leave.submit",
  LEAVE_APPROVE: "hr.leave.approve",
  LEAVE_REJECT: "hr.leave.reject",
  LEAVE_CANCEL: "hr.leave.cancel",

  LEAVE_BALANCE_READ: "hr.leave_balance.read",
  LEAVE_BALANCE_EXPORT: "hr.leave_balance.export",
  LEAVE_BALANCE_IMPORT: "hr.leave_balance.import",
  LEAVE_BALANCE_UPDATE: "hr.leave_balance.update",

  ONBOARDING_READ: "hr.onboarding.read",
  ONBOARDING_MANAGE: "hr.onboarding.manage",
  ONBOARDING_COMPLETE: "hr.onboarding.complete",
  OFFBOARDING_READ: "hr.offboarding.read",
  OFFBOARDING_MANAGE: "hr.offboarding.manage",
  OFFBOARDING_COMPLETE: "hr.offboarding.complete",
  CONTRACT_READ: "hr.contract.read",
  CONTRACT_CREATE: "hr.contract.create",
  CONTRACT_UPDATE: "hr.contract.update",
  CONTRACT_TERMINATE: "hr.contract.terminate",
  AUDIT_READ: "hr.audit.read",

  // Calendar
  CALENDAR_READ: "hr.calendar.read",
  CALENDAR_WRITE: "hr.calendar.write",
  CALENDAR_VIEW_OTHERS: "hr.calendar.view_others",

  ACCOUNT_READ: "hr.account.read",
  ACCOUNT_CREATE: "hr.account.create",
  ACCOUNT_UPDATE: "hr.account.update",
  ACCOUNT_LOCK: "hr.account.lock",
  ACCOUNT_DEACTIVATE: "hr.account.deactivate",
  ACCOUNT_RESTORE: "hr.account.restore",
  ACCOUNT_RESET_PASSWORD: "hr.account.reset_password",
  ACCOUNT_ASSIGN_ROLE: "hr.account.assign_role",
  ACCOUNT_ASSIGN_PERMISSION: "hr.account.assign_permission",
  ACCOUNT_DELETE: "hr.account.delete",
} as const;

export const AUTH_ADMIN_PERMISSIONS = {
  USERS_READ: "auth.user.read",
  USERS_UPDATE: "auth.user.update_status",
  USERS_PROVISION: "auth.user.provision",
  USERS_REVOKE_SESSIONS: "auth.user.revoke_sessions",
  USERS_SEND_ACTIVATION: "auth.user.send_activation",
  ROLES_READ: "auth.role.read",
  ROLES_MANAGE: "auth.role.manage",
  ROLES_ASSIGN: "auth.user.assign_role",
  PERMISSIONS_READ: "auth.role.read",
  PERMISSIONS_ASSIGN: "auth.user.assign_permission",
  PERMISSION_GROUPS_READ: "auth.role.read",
  PERMISSION_GROUPS_ASSIGN: "auth.user.assign_permission",
  ASSIGN_SENSITIVE_ROLE: "auth.user.assign_sensitive_role",
  REVOKE_SENSITIVE_ROLE: "auth.user.revoke_sensitive_role",
  ASSIGN_SENSITIVE_PERMISSION: "auth.user.assign_sensitive_permission",
  ASSIGN_SENSITIVE_GROUP: "auth.user.assign_sensitive_group",
  ASSIGN_SCOPE: "auth.user.assign_scope",
} as const;

export function hasPermission(
  user: AuthUser | null | undefined,
  permission: string,
): boolean {
  if (!user) {
    return false;
  }

  return (
    user.permissions?.includes(AUTHORIZATION_WILDCARD_PERMISSION) ||
    user.permissions?.includes(permission) ||
    false
  );
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  if (!user) {
    return false;
  }

  return (
    user.permissions?.includes(AUTHORIZATION_WILDCARD_PERMISSION) ||
    permissions.some((permission) => user.permissions?.includes(permission))
  );
}

export function hasAllPermissions(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  if (!user) {
    return false;
  }

  return (
    user.permissions?.includes(AUTHORIZATION_WILDCARD_PERMISSION) ||
    permissions.every((permission) => user.permissions?.includes(permission))
  );
}
