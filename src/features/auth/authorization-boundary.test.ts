import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'vitest';

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('authorization utilities contain no role-name privilege bypass', () => {
  const source = read('./permissions.ts');
  assert.doesNotMatch(source, /isSuperadmin/);
  assert.doesNotMatch(source, /return true;\s*\/\/.*super/i);
});

test('role catalog has no hard-coded fallback authority', () => {
  const source = read('../auth-admin/useAvailableRoles.ts');
  assert.doesNotMatch(source, /FALLBACK_ROLES/);
});

test('every router screen is wrapped by the shared route policy', () => {
  const source = read('../../app/router.tsx');
  for (const route of [
    'ROUTES.dashboard',
    'ROUTES.movements',
    'ROUTES.contracts',
    'ROUTES.leave',
    'ROUTES.leaveApprovalAssignments',
    'ROUTES.onboarding',
    'ROUTES.offboarding',
    'ROUTES.weeklyShifts',
    'ROUTES.annualLeaveBalances',
  ]) {
    assert.match(source, new RegExp(`ProtectedRoute route=\\{${route.replace('.', '\\.')}\\}`));
  }
});

test('weekly schedules are discoverable through the attendance navigation', () => {
  const layout = read('../../layouts/MainLayout.tsx');
  const policies = read('./routePolicies.ts');

  assert.match(
    layout,
    /label: "Mẫu lịch tuần"[\s\S]*?path: ROUTES\.weeklyShifts/,
  );
  assert.match(
    policies,
    /\[ROUTES\.weeklyShifts\][\s\S]*?HR_PERMISSIONS\.ATTENDANCE_READ/,
  );
});

test('annual leave balances use their dedicated permission and attendance navigation', () => {
  const layout = read('../../layouts/MainLayout.tsx');
  const policies = read('./routePolicies.ts');

  assert.match(
    layout,
    /label: "Bảng phép năm"[\s\S]*?path: ROUTES\.annualLeaveBalances/,
  );
  assert.match(
    policies,
    /\[ROUTES\.annualLeaveBalances\][\s\S]*?HR_PERMISSIONS\.LEAVE_BALANCE_READ/,
  );
});
test('authority is never restored from persisted current-user data', () => {
  const source = read('./authClient.ts');
  assert.doesNotMatch(source, /setStoredString\(STORAGE_KEYS\.currentUser/);
  assert.doesNotMatch(source, /function getStoredUser/);
});

test('every authenticated account can inspect its own effective access', () => {
  const router = read('../../app/router.tsx');
  const policies = read('./routePolicies.ts');
  const layout = read('../../layouts/MainLayout.tsx');

  assert.match(router, /ProtectedRoute route=\{ROUTES\.myAccess\}/);
  assert.match(
    policies,
    /\[ROUTES\.myAccess\]: \{ kind: ["']authenticated["'] \}/,
  );
  assert.match(layout, /Quyền của tôi/);
});

test('workflow and audit routes use canonical read permissions', () => {
  const source = read('./routePolicies.ts');
  for (const permission of [
    'HR_PERMISSIONS.AUDIT_READ',
    'HR_PERMISSIONS.MOVEMENT_READ',
    'HR_PERMISSIONS.CONTRACT_READ',
    'HR_PERMISSIONS.LEAVE_READ',
    'HR_PERMISSIONS.LEAVE_UPDATE',
    'HR_PERMISSIONS.ONBOARDING_READ',
    'HR_PERMISSIONS.OFFBOARDING_READ',
  ]) {
    assert.match(source, new RegExp(permission.replace('.', '\\.')));
  }
  assert.doesNotMatch(source, /canonical permission contract/);
});

test('attendance navigation follows the requested workflow and keeps settings last', () => {
  const source = read('../../layouts/MainLayout.tsx');
  const navigation = source.slice(
    source.indexOf('const attendanceSections'),
    source.indexOf('const finalItems'),
  );
  const expectedOrder = [
    'Quy trình chấm công',
    'Xếp lịch làm việc',
    'Bảng chấm công',
    'Kỳ chốt công',
    'Bảng phép năm',
    'Thiết lập',
    'Ca làm việc',
    'Loại nghỉ phép',
    'Mẫu lịch tuần',
    'Máy chấm công',
    'Dữ liệu chấm công',
    'Đối soát dữ liệu',
    'Cấu hình',
    'Thứ tự nhân sự',
    'Ngày lễ',
    'Cấu hình duyệt phép',
  ];

  let previousIndex = -1;
  for (const label of expectedOrder) {
    const currentIndex = navigation.indexOf(`label: "${label}"`);
    assert.ok(currentIndex > previousIndex, `${label} must follow the requested order`);
    previousIndex = currentIndex;
  }

  assert.match(source, /visibleAttendanceSections\.map[\s\S]*?label=\{section\.label\}[\s\S]*?defaultOpened/);
  assert.ok(source.indexOf('const finalItems') > source.indexOf('const attendanceSections'));
});

test('attendance setup screens use the requested business labels', () => {
  const workShifts = read('../../pages/attendance/WorkShiftsPage.tsx');
  const weeklyShifts = read('../../pages/attendance/WeeklyShiftTemplatesPage.tsx');

  assert.match(workShifts, /header: "Thời gian làm việc"/);
  assert.doesNotMatch(workShifts, /header: "Giờ ca"/);
  assert.match(weeklyShifts, /header: "Lịch tuần"/);
  assert.match(weeklyShifts, /label="Lịch tuần"/);
  assert.doesNotMatch(weeklyShifts, /(?:header: |label=)"Tên ca tuần"/);
});

test('employee account controls use canonical Auth actor permissions', () => {
  const tab = read('../../pages/employees/tabs/AccountTab.tsx');
  const drawer = read('../employees/AccountDetailDrawer.tsx');
  for (const source of [tab, drawer]) {
    assert.match(source, /AUTH_ADMIN_PERMISSIONS\.USERS_READ/);
    assert.match(source, /AUTH_ADMIN_PERMISSIONS\.USERS_UPDATE/);
    assert.match(source, /AUTH_ADMIN_PERMISSIONS\.USERS_REVOKE_SESSIONS/);
    assert.doesNotMatch(source, /can\(['"]hr\.account\.read['"]\)/);
  }
  assert.doesNotMatch(tab, /HR_PERMISSIONS\.ACCOUNT_UPDATE/);
});
