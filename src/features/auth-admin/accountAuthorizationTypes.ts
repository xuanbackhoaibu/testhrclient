import type { AuthAdminUser } from './authAdminTypes';
import type { Employee } from '../employees/employeeTypes';

export type Permission = {
  id: string;
  code: string;
  name: string;
  system: string;
  module: string;
  action: string;
  description?: string;
};

export type PermissionGroup = {
  id: string;
  code: string;
  name: string;
  system: string;
  permissions?: Permission[];
};

export type Role = {
  id: string;
  code: string;
  name: string;
  description?: string;
  permissionGroups?: PermissionGroup[];
  permissions?: Permission[];
};

export type AccountPermissionSource = {
  type: 'ROLE' | 'PERMISSION_GROUP' | 'DIRECT_PERMISSION' | 'DIRECT_PERMISSION_GROUP';
  id: string;
  code: string;
  name: string;
};

export type EffectivePermission = {
  permission: Permission;
  sources: AccountPermissionSource[];
};

export type MissingAccountAuthorizationEndpoint = {
  method: 'GET' | 'PUT';
  endpoint: string;
  reason: string;
};

export type AccountAuthorizationDetail = {
  accountId: string;
  account: AuthAdminUser;
  roles: Role[];
  directPermissionGroups: PermissionGroup[];
  directPermissions: Permission[];
  effectivePermissions: EffectivePermission[];
  roleCatalog: Role[];
  permissionGroupCatalog: PermissionGroup[];
  permissionCatalog: Permission[];
  missingEndpoints: MissingAccountAuthorizationEndpoint[];
};

export type AccountManagementRow = {
  account: AuthAdminUser;
  employee: Employee | null;
  roles: Role[];
  /** Role data is intentionally deferred until an operator opens the account. */
  rolesLoaded: boolean;
  effectivePermissionsCount: number | null;
};
