import { authAdminApi } from '../../api/authAdminApiClient';
import type {
  AuthAdminUser,
  AssignPermissionsInput,
  AssignPermissionsResult,
  AssignRolesInput,
  AssignRolesResult,
  BulkProvisionFromBatchInput,
  BulkProvisionFromBatchResult,
  EffectivePermissionsResult,
  ProvisionFromEmployeeInput,
  ProvisionFromEmployeeResult,
  RoleDefinition,
  RevokeSessionsResult,
  SendActivationResult,
  UpdateAccountStatusInput,
  UpdateAccountStatusResult,
} from './authAdminTypes';

const BASE = '/auth-admin';

export async function provisionFromEmployee(
  input: ProvisionFromEmployeeInput,
): Promise<ProvisionFromEmployeeResult> {
  return authAdminApi.post<ProvisionFromEmployeeResult>(
    `${BASE}/users/provision-from-employee`,
    input,
  );
}

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

export async function updateAccountStatus(
  authUserId: string,
  input: UpdateAccountStatusInput,
): Promise<UpdateAccountStatusResult> {
  return authAdminApi.patch<UpdateAccountStatusResult>(
    `${BASE}/users/${authUserId}/status`,
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
  return authAdminApi.post<SendActivationResult>(
    `${BASE}/users/${authUserId}/send-activation`,
  );
}

export async function assignRoles(
  authUserId: string,
  input: AssignRolesInput,
): Promise<AssignRolesResult> {
  return authAdminApi.put<AssignRolesResult>(
    `${BASE}/users/${authUserId}/roles`,
    input,
  );
}

export async function assignPermissions(
  authUserId: string,
  input: AssignPermissionsInput,
): Promise<AssignPermissionsResult> {
  return authAdminApi.put<AssignPermissionsResult>(
    `${BASE}/users/${authUserId}/permissions`,
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

export async function getRoles(): Promise<RoleDefinition[]> {
  return authAdminApi.get<RoleDefinition[]>(`${BASE}/roles`);
}

export async function bulkProvisionFromBatch(
  input: BulkProvisionFromBatchInput,
): Promise<BulkProvisionFromBatchResult> {
  return authAdminApi.post<BulkProvisionFromBatchResult>(
    `${BASE}/accounts/bulk-provision-from-batch`,
    input,
  );
}
