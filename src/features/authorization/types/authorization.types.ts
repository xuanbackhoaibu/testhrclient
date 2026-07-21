export type AuthorizationFeatureState = 'IMPLEMENTED' | 'UNAVAILABLE';

export type AuthorizationBackendCapabilities = {
  rolesRead: boolean;
  roleMutation: boolean;
  userRoleMutation: boolean;
  directPermissionMutation: boolean;
  directGroupMutation: boolean;
  scopeMutation: boolean;
  workReportSpecializedEditor: boolean;
  assignableRoles: boolean;
  assignableScopes: boolean;
  grantAuthorityDetail: boolean;
  roleAssignmentPreview: boolean;
  roleMutationPreview: boolean;
  effectivePermissionProvenance: boolean;
  authorizationAuditQuery: boolean;
  authorizationOverview: boolean;
};

export type PermissionDisplayMetadata = {
  label: string;
  description?: string;
  moduleLabel: string;
  isFallback: boolean;
};
