import type { AuthAdminUser } from './authAdminTypes';
import type { Employee } from '../employees/employeeTypes';
import type {
  EffectivePermissionDeny,
  EffectivePermissionGrantSource,
  UserPermissionOverride,
} from '@hacom/chat-shared-types/auth';

export type Permission = {
  id: string;
  code: string;
  name: string;
  system: string;
  module: string;
  action: string;
  description?: string;
  active: boolean;
  isSensitive: boolean;
  assignable: boolean;
  source?: string;
};

export type PermissionGroup = {
  id: string;
  code: string;
  name: string;
  description?: string;
  system: string;
  permissions?: Permission[];
  isSensitive: boolean;
};

export type Role = {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSensitive?: boolean;
  permissionGroups?: PermissionGroup[];
  permissions?: Permission[];
};

export type AccountPermissionSource = {
  type: EffectivePermissionGrantSource;
  id: string;
  code: string;
  name: string;
};

export type EffectivePermission = {
  permission: Permission;
  sources: AccountPermissionSource[];
  denies: EffectivePermissionDeny[];
  effective: boolean;
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
  directOverrides: UserPermissionOverride[];
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
