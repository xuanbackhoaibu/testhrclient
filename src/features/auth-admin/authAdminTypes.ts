export type AuthAccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
export type AuthAccountState = 'INACTIVE' | 'ACTIVE' | 'LOCKED' | 'DISABLED' | 'DEACTIVATED' | 'TOMBSTONED' | string;

export interface AuthAdminUser {
  authUserId: string;
  email: string;
  username?: string;
  hrEmployeeId?: string | null;
  employeeCode?: string | null;
  displayName?: string | null;
  accountStatus: AuthAccountStatus | string;
  accountState: AuthAccountState;
  isActive: boolean;
  tokenVersion?: number;
  permissionVersion?: number;
  lastSeen?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProvisionFromEmployeeInput {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  unitCode?: string;
  unitName?: string;
  departmentName?: string;
  positionName?: string;
  sendActivationEmail?: boolean;
}

export interface ProvisionFromEmployeeResult {
  authUserId: string;
  employeeId: string;
  employeeCode: string;
  email: string;
  accountStatus: string;
  accountState: string;
}

export interface UpdateAccountStatusInput {
  status: AuthAccountStatus;
  revokeSessions?: boolean;
  reason?: string;
}

export interface UpdateAccountStatusResult {
  authUserId: string;
  accountStatus: string;
  accountState: string;
  tokenVersion?: number;
  revokedSessions: boolean;
}

export interface RevokeSessionsResult {
  authUserId: string;
  revokedSessions: boolean;
  reason?: string | null;
}

export interface AssignRolesInput {
  roles: string[];
  reason?: string;
}

export interface AssignRolesResult {
  authUserId: string;
  roles: string[];
  permissionVersion?: number;
}

export interface AssignPermissionsInput {
  permissions: string[];
  reason?: string;
}

export interface AssignPermissionsResult {
  authUserId: string;
  permissions: string[];
}

export interface EffectivePermissionsResult {
  authUserId: string;
  roles: string[];
  directPermissions: string[];
  effectivePermissions: string[];
  permissionVersion?: number;
  tokenVersion?: number;
}

export interface SendActivationResult {
  authUserId: string;
  sent: boolean;
  maskedEmail?: string | null;
}

export const SENSITIVE_ROLES = new Set(['SUPER_ADMIN', 'super_admin', 'IAM_ADMIN', 'iam_admin']);

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  NOT_CREATED: 'Chưa tạo tài khoản',
  PENDING_ACTIVATION: 'Chờ kích hoạt',
  ACTIVE: 'Đang hoạt động',
  SUSPENDED: 'Tạm khóa',
  DISABLED: 'Vô hiệu hóa',
  INACTIVE: 'Chờ kích hoạt',
  LOCKED: 'Bị khóa',
  DEACTIVATED: 'Đã hủy kích hoạt',
  TOMBSTONED: 'Đã xóa',
};
