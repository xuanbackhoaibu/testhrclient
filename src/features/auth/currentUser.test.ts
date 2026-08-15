import assert from 'node:assert/strict';
import { test } from 'vitest';

import { normalizeCurrentUser } from './currentUser.ts';

test('uses nested canonical identity and ignores conflicting flat legacy authority', () => {
  const user = normalizeCurrentUser({
    data: {
      roles: ['LEGACY_ADMIN'],
      permissions: ['legacy.all'],
      identity: {
        authUserId: 'auth-1',
        accountStatus: 'ACTIVE',
        roles: ['employee'],
        permissions: ['hr.employee.read'],
        scopes: [],
        tokenVersion: 3,
        permissionVersion: 8,
      },
      employee: null,
    },
  });

  assert.deepEqual(user.roles, ['employee']);
  assert.deepEqual(user.permissions, ['hr.employee.read']);
  assert.equal(user.permissionVersion, 8);
  assert.equal(user.authoritySource, 'chat-auth-runtime');
});

test('fails closed when /auth/me does not contain canonical identity', () => {
  assert.throws(
    () => normalizeCurrentUser({ data: { roles: ['SUPER_ADMIN'], permissions: ['*'] } }),
    /Canonical identity is missing/,
  );
});

test('deduplicates canonical roles and permissions without changing case', () => {
  const user = normalizeCurrentUser({
    identity: {
      authUserId: 'auth-2',
      accountStatus: 'ACTIVE',
      roles: ['HR_ADMIN', 'HR_ADMIN'],
      permissions: ['hr.employee.read', 'hr.employee.read', 'HR.EMPLOYEE.READ'],
      scopes: [],
    },
  });

  assert.deepEqual(user.roles, ['HR_ADMIN']);
  assert.deepEqual(user.permissions, ['hr.employee.read', 'HR.EMPLOYEE.READ']);
});
