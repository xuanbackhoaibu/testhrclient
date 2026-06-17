export type AuthAccountStatus =
  | 'PENDING_ACTIVATION'
  | 'PENDING_HR_LINK'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DISABLED';
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
  externalEmployeeId?: string | null;
  employeeCode?: string | null;
  claimedEmployeeCode?: string | null;
  claimedEmail?: string | null;
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

export interface ResetPasswordInput {
  password?: string;
  autoGenerate?: boolean;
  mustChangePassword?: boolean;
  notifyUser?: boolean;
  reason?: string;
}

export interface ProvisionFromEmployeeInput {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  // Optional: HRM accounts log in by employee code. Omit/null when no email.
  email?: string | null;
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
  email: string | null;
  username?: string;
  /** The credential the employee logs in with (the employee code). */
  loginAccount?: string;
  accountStatus: string;
  accountState: string;
  /** True when this call created a brand-new account (vs. an existing one). */
  created?: boolean;
  /** True when an existing account had its email/mapping synced from HRM. */
  updated?: boolean;
  status?: 'created' | 'updated' | 'already_exists';
  mustChangePassword?: boolean;
  message?: string;
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
  temporaryPassword?: string;
  tempPassword?: string;
  mustChangePassword: boolean;
  passwordChangedAt?: string;
  tokenVersion?: number;
  notifyUser?: boolean;
}

interface PasswordRevealPayload {
  temporaryPassword?: string;
  tempPassword?: string;
  initialPassword?: string;
}

export function extractTemporaryPassword(
  result: PasswordRevealPayload,
): string | null {
  return result.temporaryPassword ?? result.tempPassword ?? result.initialPassword ?? null;
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

export interface PendingHrLinkQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PendingHrLinkUsersResult extends ListUsersResult {
  data: AuthAdminUser[];
}

export interface UpdateHrClaimPayload {
  claimedEmployeeCode?: string | null;
  claimedEmail?: string | null;
  reason?: string;
}

export interface LinkEmployeePayload {
  hrEmployeeId?: string;
  employeeId?: string;
  employeeCode?: string;
  claimedEmployeeCode?: string | null;
  claimedEmail?: string | null;
  syncEmailFromHr?: boolean;
  reason?: string;
}

export interface LinkedHrEmployee {
  hrEmployeeId: string;
  employeeId: string;
  employeeCode: string;
  email: string | null;
  fullName: string | null;
  departmentName?: string | null;
  orgUnit?: string | null;
  unitCode?: string | null;
  title?: string | null;
  status?: string | null;
}

export interface LinkEmployeeResult extends AuthAdminUser {
  linkedEmployee?: LinkedHrEmployee;
}

export interface DisableUserPayload {
  reason?: string;
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
  // Optional: emailless employees are provisioned with a code-login account.
  email?: string | null;
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

export type BulkProvisionItemStatus =
  | 'CREATED'
  | 'UPDATED'
  | 'SKIPPED'
  | 'FAILED'
  | 'INVALID';

export interface BulkProvisionItemResult {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  accountId: string | null;
  username: string | null;
  /** The credential the employee logs in with (the employee code). */
  loginAccount: string | null;
  status: BulkProvisionItemStatus;
  mustChangePassword?: boolean;
  reason: string | null;
}

export interface BulkProvisionFromEmployeesResult {
  total: number;
  created: number;
  /** Accounts that already existed (alias of skipped). */
  alreadyExists?: number;
  skipped: number;
  /** Existing accounts whose email/mapping was synced from HRM. */
  updated?: number;
  failed: number;
  results: BulkProvisionItemResult[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SENSITIVE_ROLES = new Set(['super_admin', 'security_admin', 'SUPER_ADMIN', 'IAM_ADMIN', 'iam_admin']);

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  NOT_CREATED: 'Chưa tạo tài khoản',
  PENDING_ACTIVATION: 'Chờ kích hoạt',
  PENDING_HR_LINK: 'Chờ liên kết nhân sự',
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
  PENDING_HR_LINK: 'yellow',
  LOCKED: 'orange',
  DISABLED: 'red',
  DEACTIVATED: 'red',
  TOMBSTONED: 'gray',
};
