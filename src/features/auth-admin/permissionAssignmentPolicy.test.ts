import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DirectPermissionAssignmentError,
  isDirectlyAssignablePermission,
  validateDirectPermissionKeys,
} from './permissionAssignmentPolicy.ts';
import type { Permission } from './accountAuthorizationTypes.ts';

const permission = (overrides: Partial<Permission>): Permission => ({
  id: 'permission-id',
  code: 'hr.employee.read',
  name: 'Read employee',
  system: 'hr',
  module: 'employee',
  action: 'read',
  active: true,
  isSensitive: false,
  assignable: true,
  ...overrides,
});

test('ordinary active catalog permission remains directly assignable', () => {
  assert.equal(isDirectlyAssignablePermission(permission({})), true);
});

test('non-assignable and work-report permissions are rejected from direct assignment', () => {
  assert.equal(isDirectlyAssignablePermission(permission({ assignable: false })), false);
  assert.equal(isDirectlyAssignablePermission(permission({ code: 'work_report.group.aggregate' })), false);
  assert.equal(isDirectlyAssignablePermission(permission({ active: false })), false);
});

test('sensitive permission remains assignable when catalog marks it assignable', () => {
  assert.equal(isDirectlyAssignablePermission(permission({ isSensitive: true })), true);
});

test('mixed direct-assignment payload is rejected atomically instead of silently filtered', () => {
  const ordinary = permission({ code: 'hr.employee.read' });
  const workReport = permission({
    id: 'work-report',
    code: 'work_report.group.aggregate',
    assignable: false,
    source: 'HRM_MANAGED',
  });
  const result = validateDirectPermissionKeys([ordinary.code, workReport.code], [ordinary, workReport]);

  assert.deepEqual(result, { valid: false, invalidKeys: [workReport.code] });
  assert.throws(
    () => {
      if (!result.valid) throw new DirectPermissionAssignmentError(result.invalidKeys);
    },
    DirectPermissionAssignmentError,
  );
});
