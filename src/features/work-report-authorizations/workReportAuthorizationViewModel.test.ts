import assert from 'node:assert/strict';
import { test } from 'vitest';

import { workReportAuthorizationToEmployeePermissionViewModel } from './workReportAuthorizationViewModel.ts';

test('keeps duplicate department names distinct through owner unit context and lifecycle', () => {
  const view = workReportAuthorizationToEmployeePermissionViewModel({
    employeeId: 'employee', authUserId: 'auth', employeeCode: 'HC001', fullName: 'Nguyen Van A', email: null,
    departmentId: null, departmentName: null, unitId: null, unitName: null, accountStatus: 'ACTIVE', assignmentCount: 2, updatedAt: null,
    permissions: [
      { type: 'DEPARTMENT_REPORT', scopeId: 'one', actions: ['READ'], status: 'ACTIVE' },
      { type: 'DEPARTMENT_REPORT', scopeId: 'two', actions: ['READ', 'SUBMIT'], status: 'INACTIVE' },
    ],
  }, [
    { departmentId: 'one', departmentName: 'Ban Giám đốc', departmentCode: 'DV001_03', unitId: 'u1', unitName: 'Hacom Holdings', unitCode: 'DV001', status: 'ACTIVE' },
    { departmentId: 'two', departmentName: 'Ban Giám đốc', departmentCode: 'DV008_03', unitId: 'u2', unitName: 'Hacom Lào Cai', unitCode: 'DV008', status: 'ACTIVE' },
  ]);
  assert.equal(view.departmentPermissions[0].ownerCode, 'DV001');
  assert.equal(view.departmentPermissions[1].ownerCode, 'DV008');
  assert.equal(view.departmentPermissions[0].accessLabel, 'Chỉ đọc');
  assert.equal(view.departmentPermissions[1].accessLabel, 'Đọc và gửi');
  assert.equal(view.departmentPermissions[1].statusLabel, 'Tạm dừng');
  assert.equal(view.summary.inactiveCount, 1);
});
