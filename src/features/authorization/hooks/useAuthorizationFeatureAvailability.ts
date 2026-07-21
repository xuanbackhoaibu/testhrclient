import type { AuthorizationBackendCapabilities } from '../types/authorization.types';

// This audited static boundary avoids speculative 404 probes on each page load.
// Replace with the canonical Auth capability endpoint when Phase 2B provides it.
export const AUTHORIZATION_BACKEND_CAPABILITIES: AuthorizationBackendCapabilities = {
  rolesRead: true,
  roleMutation: true,
  userRoleMutation: true,
  directPermissionMutation: true,
  directGroupMutation: true,
  scopeMutation: true,
  workReportSpecializedEditor: true,
  assignableRoles: false,
  assignableScopes: false,
  grantAuthorityDetail: false,
  roleAssignmentPreview: false,
  roleMutationPreview: false,
  effectivePermissionProvenance: false,
  authorizationAuditQuery: false,
  authorizationOverview: false,
};

export function useAuthorizationFeatureAvailability() {
  return AUTHORIZATION_BACKEND_CAPABILITIES;
}
