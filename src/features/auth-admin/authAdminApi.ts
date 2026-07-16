import { authAdminApi } from '../../api/authAdminApiClient';
import type {
  AuthAdminUser,
  AssignPermissionsInput,
  AssignPermissionGroupsInput,
  AssignPermissionsResult,
  AssignRolesInput,
  AssignRolesResult,
  BulkProvisionFromBatchInput,
  BulkProvisionFromBatchResult,
  BulkProvisionFromEmployeesInput,
  BulkProvisionFromEmployeesResult,
  CreatePermissionGroupInput,
  CreatePermissionInput,
  CreateRoleInput,
  DisableUserPayload,
  EffectivePermissionsResult,
  ForceChangePasswordResult,
  LifecycleActionResult,
  LinkEmployeePayload,
  LinkEmployeeResult,
  ListPermissionsParams,
  ListUsersParams,
  ListUsersResult,
  PendingHrLinkQuery,
  PendingHrLinkUsersResult,
  PermissionDefinition,
  PermissionGroupDefinition,
  PermissionGroupDetail,
  PermissionsGroupedResult,
  ProvisionFromEmployeeInput,
  ProvisionFromEmployeeResult,
  ResetPasswordInput,
  RoleDefinition,
  RoleDetail,
  RevokeSessionsResult,
  ResetPasswordResult,
  SendActivationResult,
  UpdateAccountStatusInput,
  UpdateAccountStatusResult,
  UpdateHrClaimPayload,
  UpdatePermissionGroupInput,
  UserPermissionGroupsResult,
  UpdatePermissionInput,
  UpdateRoleInput,
} from './authAdminTypes';

const BASE = '/auth-admin';

// ─── Provision ───────────────────────────────────────────────────────────────

export async function provisionFromEmployee(
  input: ProvisionFromEmployeeInput,
): Promise<ProvisionFromEmployeeResult> {
  return authAdminApi.post<ProvisionFromEmployeeResult>(
    `${BASE}/users/provision-from-employee`,
    input,
  );
}

// ─── User lookup ─────────────────────────────────────────────────────────────

export async function getAuthUserByEmployeeId(employeeId: string): Promise<AuthAdminUser> {
  return authAdminApi.get<AuthAdminUser>(`${BASE}/users/by-employee/${employeeId}`);
}

export async function getAuthUserByEmployeeCode(employeeCode: string): Promise<AuthAdminUser> {
  return authAdminApi.get<AuthAdminUser>(`${BASE}/users/by-employee-code/${employeeCode}`);
}

export async function getAuthUserByEmail(email: string): Promise<AuthAdminUser> {
  return authAdminApi.get<AuthAdminUser>(`${BASE}/users/by-email/${encodeURIComponent(email)}`);
}

export async function getAuthUser(authUserId: string): Promise<AuthAdminUser> {
  return authAdminApi.get<AuthAdminUser>(`${BASE}/users/${authUserId}`);
}

export async function listUsers(params?: ListUsersParams): Promise<ListUsersResult> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return authAdminApi.get<ListUsersResult>(`${BASE}/users${qs ? `?${qs}` : ''}`);
}

export async function getPendingHrLinkUsers(
  params?: PendingHrLinkQuery,
): Promise<PendingHrLinkUsersResult> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return authAdminApi.get<PendingHrLinkUsersResult>(
    `${BASE}/users/pending-hr-link${qs ? `?${qs}` : ''}`,
  );
}

export async function updateHrClaim(
  authUserId: string,
  payload: UpdateHrClaimPayload,
): Promise<AuthAdminUser> {
  return authAdminApi.post<AuthAdminUser>(
    `${BASE}/users/${authUserId}/update-hr-claim`,
    payload,
  );
}

export async function linkUserToEmployee(
  authUserId: string,
  payload: LinkEmployeePayload,
): Promise<LinkEmployeeResult> {
  return authAdminApi.post<LinkEmployeeResult>(
    `${BASE}/users/${authUserId}/link-employee`,
    payload,
  );
}

export async function disablePendingHrLinkUser(
  authUserId: string,
  payload?: DisableUserPayload,
): Promise<LifecycleActionResult> {
  return authAdminApi.post<LifecycleActionResult>(
    `${BASE}/users/${authUserId}/disable`,
    payload,
  );
}

// ─── Account lifecycle ────────────────────────────────────────────────────────

export async function updateAccountStatus(
  authUserId: string,
  input: UpdateAccountStatusInput,
): Promise<UpdateAccountStatusResult> {
  return authAdminApi.patch<UpdateAccountStatusResult>(
    `${BASE}/users/${authUserId}/status`,
    input,
  );
}

export async function lockAccount(authUserId: string, reason?: string): Promise<LifecycleActionResult> {
  return authAdminApi.post<LifecycleActionResult>(`${BASE}/users/${authUserId}/lock`, { reason });
}

export async function unlockAccount(authUserId: string, reason?: string): Promise<LifecycleActionResult> {
  return authAdminApi.post<LifecycleActionResult>(`${BASE}/users/${authUserId}/unlock`, { reason });
}

export async function deactivateAccount(authUserId: string, reason?: string): Promise<LifecycleActionResult> {
  return authAdminApi.post<LifecycleActionResult>(`${BASE}/users/${authUserId}/deactivate`, { reason });
}

export async function activateAccount(authUserId: string, reason?: string): Promise<LifecycleActionResult> {
  return authAdminApi.post<LifecycleActionResult>(`${BASE}/users/${authUserId}/activate`, { reason });
}

export async function softDeleteAccount(authUserId: string, reason?: string): Promise<LifecycleActionResult> {
  return authAdminApi.post<LifecycleActionResult>(`${BASE}/users/${authUserId}/soft-delete`, { reason });
}

export async function restoreAccount(authUserId: string, reason?: string): Promise<LifecycleActionResult> {
  return authAdminApi.post<LifecycleActionResult>(`${BASE}/users/${authUserId}/restore`, { reason });
}

export async function resetPassword(
  authUserId: string,
  input: ResetPasswordInput,
): Promise<ResetPasswordResult> {
  return authAdminApi.post<ResetPasswordResult>(
    `${BASE}/users/${authUserId}/reset-password`,
    input,
  );
}

export async function revokeSessions(
  authUserId: string,
  reason?: string,
): Promise<RevokeSessionsResult> {
  return authAdminApi.post<RevokeSessionsResult>(
    `${BASE}/users/${authUserId}/revoke-sessions`,
    { reason },
  );
}

export async function sendActivation(authUserId: string): Promise<SendActivationResult> {
  return authAdminApi.post<SendActivationResult>(`${BASE}/users/${authUserId}/send-activation`);
}

export async function forceChangePassword(
  authUserId: string,
  reason?: string,
): Promise<ForceChangePasswordResult> {
  return authAdminApi.patch<ForceChangePasswordResult>(
    `${BASE}/users/${authUserId}/force-change-password`,
    { reason },
  );
}

// ─── Role/Permission assignment ───────────────────────────────────────────────

export async function assignRoles(
  authUserId: string,
  input: AssignRolesInput,
): Promise<AssignRolesResult> {
  return authAdminApi.put<AssignRolesResult>(`${BASE}/users/${authUserId}/roles`, input);
}

export async function assignPermissions(
  authUserId: string,
  input: AssignPermissionsInput,
): Promise<AssignPermissionsResult> {
  return authAdminApi.put<AssignPermissionsResult>(`${BASE}/users/${authUserId}/permissions`, input);
}

export async function getUserPermissionGroups(
  authUserId: string,
): Promise<UserPermissionGroupsResult> {
  return authAdminApi.get<UserPermissionGroupsResult>(
    `${BASE}/users/${authUserId}/permission-groups`,
  );
}

export async function assignPermissionGroups(
  authUserId: string,
  input: AssignPermissionGroupsInput,
): Promise<UserPermissionGroupsResult> {
  return authAdminApi.put<UserPermissionGroupsResult>(
    `${BASE}/users/${authUserId}/permission-groups`,
    input,
  );
}

export async function getEffectivePermissions(
  authUserId: string,
): Promise<EffectivePermissionsResult> {
  return authAdminApi.get<EffectivePermissionsResult>(
    `${BASE}/users/${authUserId}/effective-permissions`,
  );
}

// ─── Role management ─────────────────────────────────────────────────────────

export async function getRoles(params?: { search?: string; status?: string }): Promise<RoleDefinition[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return authAdminApi.get<RoleDefinition[]>(`${BASE}/roles${qs ? `?${qs}` : ''}`);
}

export async function getRole(roleId: string): Promise<RoleDetail> {
  return authAdminApi.get<RoleDetail>(`${BASE}/roles/${roleId}`);
}

export async function createRole(input: CreateRoleInput): Promise<RoleDefinition> {
  return authAdminApi.post<RoleDefinition>(`${BASE}/roles`, input);
}

export async function updateRole(roleId: string, input: UpdateRoleInput): Promise<RoleDefinition> {
  return authAdminApi.patch<RoleDefinition>(`${BASE}/roles/${roleId}`, input);
}

export async function addPermissionToRole(roleId: string, permissionKey: string): Promise<void> {
  await authAdminApi.post(`${BASE}/roles/${roleId}/permissions`, { permissionKey });
}

export async function removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
  await authAdminApi.delete(`${BASE}/roles/${roleId}/permissions/${permissionId}`);
}

export async function addPermissionGroupToRole(roleId: string, groupId: string): Promise<void> {
  await authAdminApi.post(`${BASE}/roles/${roleId}/permission-groups`, { groupId });
}

export async function removePermissionGroupFromRole(roleId: string, groupId: string): Promise<void> {
  await authAdminApi.delete(`${BASE}/roles/${roleId}/permission-groups/${groupId}`);
}

// ─── Permission management ────────────────────────────────────────────────────

export async function getPermissions(params?: ListPermissionsParams): Promise<PermissionDefinition[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.system) query.set('system', params.system);
  if (params?.module) query.set('module', params.module);
  if (params?.status) query.set('status', params.status);
  if (params?.isSensitive !== undefined) query.set('isSensitive', String(params.isSensitive));
  const qs = query.toString();
  return authAdminApi.get<PermissionDefinition[]>(`${BASE}/permissions${qs ? `?${qs}` : ''}`);
}

export async function getPermissionsGrouped(): Promise<PermissionsGroupedResult> {
  return authAdminApi.get<PermissionsGroupedResult>(`${BASE}/permissions/grouped`);
}

export async function createPermission(input: CreatePermissionInput): Promise<PermissionDefinition> {
  return authAdminApi.post<PermissionDefinition>(`${BASE}/permissions`, input);
}

export async function updatePermission(
  permissionId: string,
  input: UpdatePermissionInput,
): Promise<PermissionDefinition> {
  return authAdminApi.patch<PermissionDefinition>(`${BASE}/permissions/${permissionId}`, input);
}

export async function deprecatePermission(
  permissionId: string,
  reason?: string,
): Promise<PermissionDefinition> {
  return authAdminApi.patch<PermissionDefinition>(
    `${BASE}/permissions/${permissionId}/deprecate`,
    { reason },
  );
}

// ─── Permission Group management ─────────────────────────────────────────────

export async function getPermissionGroups(params?: {
  search?: string;
  system?: string;
  status?: string;
}): Promise<PermissionGroupDefinition[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.system) query.set('system', params.system);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return authAdminApi.get<PermissionGroupDefinition[]>(
    `${BASE}/permission-groups${qs ? `?${qs}` : ''}`,
  );
}

export async function getPermissionGroup(groupId: string): Promise<PermissionGroupDetail> {
  return authAdminApi.get<PermissionGroupDetail>(`${BASE}/permission-groups/${groupId}`);
}

export async function createPermissionGroup(
  input: CreatePermissionGroupInput,
): Promise<PermissionGroupDefinition> {
  return authAdminApi.post<PermissionGroupDefinition>(`${BASE}/permission-groups`, input);
}

export async function updatePermissionGroup(
  groupId: string,
  input: UpdatePermissionGroupInput,
): Promise<PermissionGroupDefinition> {
  return authAdminApi.patch<PermissionGroupDefinition>(
    `${BASE}/permission-groups/${groupId}`,
    input,
  );
}

export async function addPermissionToGroup(groupId: string, permissionKey: string): Promise<void> {
  await authAdminApi.post(`${BASE}/permission-groups/${groupId}/permissions`, { permissionKey });
}

export async function removePermissionFromGroup(
  groupId: string,
  permissionId: string,
): Promise<void> {
  await authAdminApi.delete(`${BASE}/permission-groups/${groupId}/permissions/${permissionId}`);
}

// ─── Bulk operations ──────────────────────────────────────────────────────────

export async function bulkProvisionFromBatch(
  input: BulkProvisionFromBatchInput,
): Promise<BulkProvisionFromBatchResult> {
  return authAdminApi.post<BulkProvisionFromBatchResult>(
    `${BASE}/accounts/bulk-provision-from-batch`,
    input,
  );
}

export async function bulkProvisionFromEmployees(
  input: BulkProvisionFromEmployeesInput,
): Promise<BulkProvisionFromEmployeesResult> {
  return authAdminApi.post<BulkProvisionFromEmployeesResult>(
    `${BASE}/users/bulk-provision-from-employees`,
    input,
  );
}
