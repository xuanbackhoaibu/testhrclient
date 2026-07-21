import assert from 'node:assert/strict';
import test from 'node:test';

import { getPermissionBusinessLabel } from './mappers/permissionBusinessLabel.ts';

test('permission display mapper uses known metadata and a safe fallback', () => {
  assert.equal(getPermissionBusinessLabel('auth.role.manage').label, 'Quản lý vai trò');
  const fallback = getPermissionBusinessLabel('hr.employee.read');
  assert.equal(fallback.label, 'Read Employee');
  assert.equal(fallback.isFallback, true);
});
