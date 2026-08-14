import assert from 'node:assert/strict';
import { test } from 'vitest';

import { getAuthorizationCapabilities } from './authorizationCapabilities.ts';

test('role definition and user role assignment are distinct UI capabilities', () => {
  const roleAssigner = getAuthorizationCapabilities((permission) => permission === 'auth.user.assign_role');
  assert.equal(roleAssigner.canAssignRoles, true);
  assert.equal(roleAssigner.canManageRoles, false);

  const roleManager = getAuthorizationCapabilities((permission) => permission === 'auth.role.manage');
  assert.equal(roleManager.canManageRoles, true);
  assert.equal(roleManager.canAssignRoles, false);
});
