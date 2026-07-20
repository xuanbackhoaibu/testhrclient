import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

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
    'ROUTES.onboarding',
    'ROUTES.offboarding',
  ]) {
    assert.match(source, new RegExp(`ProtectedRoute route=\\{${route.replace('.', '\\.')}\\}`));
  }
});

test('authority is never restored from persisted current-user data', () => {
  const source = read('./authClient.ts');
  assert.doesNotMatch(source, /setStoredString\(STORAGE_KEYS\.currentUser/);
  assert.doesNotMatch(source, /function getStoredUser/);
});

test('sensitive routes without backend permission contracts fail closed', () => {
  const source = read('./routePolicies.ts');
  for (const route of [
    'ROUTES.auditLogs',
    'ROUTES.movements',
    'ROUTES.contracts',
    'ROUTES.leave',
    'ROUTES.onboarding',
    'ROUTES.offboarding',
  ]) {
    assert.match(
      source,
      new RegExp(`\\[${route.replace('.', '\\.')}\\]: \\{[\\s\\S]{0,180}kind: 'unavailable'`),
    );
  }
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
});
