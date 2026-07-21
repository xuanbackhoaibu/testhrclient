import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUTH_ADMIN_PERMISSIONS,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from './permissions.ts';

const principal = (permissions: string[], roles: string[] = []) => ({
  accountStatus: 'ACTIVE',
  authoritySource: 'chat-auth-runtime',
  permissions,
  roles,
});

test('role names never bypass canonical effective permissions', () => {
  const user = principal([], ['SUPER_ADMIN']);
  assert.equal(hasPermission(user as never, 'hr.employee.update'), false);
  assert.equal(hasAnyPermission(user as never, ['auth.user.assign_role']), false);
});

test('can/canAny/canAll are derived only from the current permission snapshot', () => {
  const user = principal(['hr.employee.read', 'hr.employee.update']);
  assert.equal(hasPermission(user as never, 'hr.employee.read'), true);
  assert.equal(hasAnyPermission(user as never, ['hr.employee.delete', 'hr.employee.update']), true);
  assert.equal(hasAllPermissions(user as never, ['hr.employee.read', 'hr.employee.update']), true);
  assert.equal(hasAllPermissions(user as never, ['hr.employee.read', 'hr.employee.delete']), false);
});

test('permission matching is exact and supports only the canonical explicit wildcard', () => {
  const user = principal(['hr.employee.read', '*']);
  assert.equal(hasPermission(user as never, 'HR.EMPLOYEE.READ'), true);
  assert.equal(hasPermission(user as never, 'hr.employee.update'), true);
  assert.equal(hasPermission(user as never, '*'), true);
});

test('empty, duplicate, null, and undefined inputs fail closed predictably', () => {
  const duplicateUser = principal(['hr.employee.read', 'hr.employee.read']);
  assert.equal(hasAllPermissions(duplicateUser as never, []), true);
  assert.equal(hasAnyPermission(duplicateUser as never, []), false);
  assert.equal(hasPermission(null, 'hr.employee.read'), false);
  assert.equal(hasPermission(undefined, 'hr.employee.read'), false);
  assert.equal(hasAllPermissions(duplicateUser as never, ['hr.employee.read']), true);
});

test('a permission removed by canonical direct deny is absent and therefore denied', () => {
  const effectiveAfterDeny = principal(['hr.employee.read'], ['HR_ADMIN']);
  assert.equal(hasPermission(effectiveAfterDeny as never, 'hr.employee.update'), false);
});

test('role definition management is not conflated with assigning a role to a user', () => {
  assert.equal(AUTH_ADMIN_PERMISSIONS.ROLES_MANAGE, 'auth.role.manage');
  assert.equal(AUTH_ADMIN_PERMISSIONS.ROLES_ASSIGN, 'auth.user.assign_role');
  assert.notEqual(
    AUTH_ADMIN_PERMISSIONS.ROLES_MANAGE,
    AUTH_ADMIN_PERMISSIONS.ROLES_ASSIGN,
  );
});
