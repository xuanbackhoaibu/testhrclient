export type AuthAccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
export type AuthAccountState =
  | 'INACTIVE'
  | 'ACTIVE'
  | 'LOCKED'
  | 'DISABLED'
  | 'DEACTIVATED'
  | 'TOMBSTONED'
  | string;

export interface AuthAdminUser {
  authUserId: string;
  email: string;
  username?: string;
  // chat-auth HR projection ID, not hr-api-service employee.id
  hrEmployeeId?: string | null;
  employeeCode?: string | null;
  displayName?: string | null;
  accountStatus: AuthAccountStatus | string;
  accountState: AuthAccountState;
  isActive: boolean;
  mustChangePassword?: boolean;
  tokenVersion?: number;
  permissionVersion?: number;
  lastSeen?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ForceChangePasswordResult {
  authUserId: string;
  mustChangePassword: boolean;
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
  initialPassword?: string;
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

export interface LifecycleActionResult {
  authUserId: string;
  accountState: string;
}

export interface ResetPasswordResult {
  authUserId: string;
  tempPassword: string;
  mustChangePassword: boolean;
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

// ─── Role types ───────────────────────────────────────────────────────────────

export interface RoleDefinition {
  id?: string;
  key?: string;
  name: string;
  label?: string;
  description?: string | null;
  status?: string;
  isSensitive?: boolean;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleDetail extends RoleDefinition {
  id: string;
  key: string;
  permissions: PermissionDefinition[];
  permissionGroups: PermissionGroupDefinition[];
}

export interface CreateRoleInput {
  key: string;
  name: string;
  description?: string;
  isSensitive?: boolean;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  status?: 'active' | 'disabled';
  isSensitive?: boolean;
}

// ─── Permission types ─────────────────────────────────────────────────────────

export interface PermissionDefinition {
  id: string;
  key: string;
  name?: string | null;
  description?: string | null;
  domain?: string | null;
  system?: string | null;
  module?: string | null;
  action?: string | null;
  isSensitive?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionSystemGroup {
  domain: string;
  permissions: PermissionDefinition[];
}

export interface PermissionsGroupedResult {
  systems: PermissionSystemGroup[];
  total: number;
}

export interface ListPermissionsParams {
  search?: string;
  system?: string;
  module?: string;
  status?: string;
  isSensitive?: boolean;
}

export interface CreatePermissionInput {
  key: string;
  name?: string;
  description?: string;
  isSensitive?: boolean;
}

export interface UpdatePermissionInput {
  name?: string;
  description?: string;
  isSensitive?: boolean;
}

// ─── Permission Group types ───────────────────────────────────────────────────

export interface PermissionGroupDefinition {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  system?: string | null;
  module?: string | null;
  status: string;
  permissionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionGroupDetail extends PermissionGroupDefinition {
  permissions: PermissionDefinition[];
}

export interface CreatePermissionGroupInput {
  key: string;
  name: string;
  description?: string;
  system?: string;
  module?: string;
}

export interface UpdatePermissionGroupInput {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

// ─── User list types ──────────────────────────────────────────────────────────

export interface ListUsersParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ListUsersResult {
  data: AuthAdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BulkProvisionFromBatchInput {
  batchId: string;
  defaultRoles?: string[];
  initialStatus?: 'PENDING_ACTIVATION' | 'ACTIVE';
  sendActivationEmail?: boolean;
}

export interface BulkProvisionFromBatchResult {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  errors?: Array<{ employeeId: string; reason: string }>;
}

// ─── Bulk provision from employee selection ───────────────────────────────────

export interface BulkProvisionEmployeeItem {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  unitCode?: string;
  unitName?: string;
  departmentName?: string;
  positionName?: string;
}

export interface BulkProvisionFromEmployeesInput {
  employees: BulkProvisionEmployeeItem[];
  sendOtp?: boolean;
  skipExisting?: boolean;
}

export type BulkProvisionItemStatus = 'CREATED' | 'SKIPPED' | 'FAILED' | 'INVALID';

export interface BulkProvisionItemResult {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  accountId: string | null;
  username: string | null;
  status: BulkProvisionItemStatus;
  initialPassword?: string;
  reason: string | null;
}

export interface BulkProvisionFromEmployeesResult {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  results: BulkProvisionItemResult[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SENSITIVE_ROLES = new Set(['super_admin', 'security_admin', 'SUPER_ADMIN', 'IAM_ADMIN', 'iam_admin']);

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  NOT_CREATED: 'Chưa tạo tài khoản',
  PENDING_ACTIVATION: 'Chờ kích hoạt',
  ACTIVE: 'Đang hoạt động',
  SUSPENDED: 'Tạm khóa',
  DISABLED: 'Vô hiệu hóa',
  INACTIVE: 'Chờ kích hoạt',
  LOCKED: 'Bị khóa',
  DEACTIVATED: 'Đã vô hiệu',
  TOMBSTONED: 'Đã xóa mềm',
};

export const ACCOUNT_STATE_COLOR: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'yellow',
  LOCKED: 'orange',
  DISABLED: 'red',
  DEACTIVATED: 'red',
  TOMBSTONED: 'gray',
};
