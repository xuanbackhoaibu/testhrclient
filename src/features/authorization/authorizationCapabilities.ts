const AUTHORIZATION_ACTIONS = {
  usersRead: 'auth.user.read',
  rolesAssign: 'auth.user.assign_role',
  permissionsAssign: 'auth.user.assign_permission',
  scopesAssign: 'auth.user.assign_scope',
  rolesRead: 'auth.role.read',
  rolesManage: 'auth.role.manage',
} as const;

/** Pure capability projection for route and action UX, never grant authority. */
export function getAuthorizationCapabilities(can: (permission: string) => boolean) {
  return {
    canReadUsers: can(AUTHORIZATION_ACTIONS.usersRead),
    canAssignRoles: can(AUTHORIZATION_ACTIONS.rolesAssign),
    canAssignPermissions: can(AUTHORIZATION_ACTIONS.permissionsAssign),
    canAssignScopes: can(AUTHORIZATION_ACTIONS.scopesAssign),
    canReadRoles: can(AUTHORIZATION_ACTIONS.rolesRead),
    canManageRoles: can(AUTHORIZATION_ACTIONS.rolesManage),
    canReadPermissions: can(AUTHORIZATION_ACTIONS.rolesRead),
    canManagePermissionGroups: can(AUTHORIZATION_ACTIONS.rolesManage),
    canReadTechnicalCatalog: can(AUTHORIZATION_ACTIONS.rolesRead),
  };
}
