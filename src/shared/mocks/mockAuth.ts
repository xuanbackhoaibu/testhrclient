import type { AuthUser, DemoRole } from '../../features/auth/types';

export const MOCK_TOKENS: Record<DemoRole, string> = {
  HR_ADMIN: 'dev-hr-token',
  MANAGER: 'dev-manager-token',
  EMPLOYEE: 'dev-employee-token',
};

export const MOCK_AUTH_USERS: Record<DemoRole, AuthUser> = {
  HR_ADMIN: {
    id: 'usr-hr-admin',
    externalAuthUserId: 'auth-1001',
    email: 'hr.admin@hacom.local',
    fullName: 'Nguyen Ha Linh',
    employeeId: 'EMP0001',
    roles: ['HR_ADMIN', 'ORG_ADMIN'],
    dataScopes: ['LEGAL_ENTITY:*', 'ORG_UNIT:*', 'EMPLOYEE:*'],
  },
  MANAGER: {
    id: 'usr-manager',
    externalAuthUserId: 'auth-1002',
    email: 'manager.ops@hacom.local',
    fullName: 'Tran Minh Quan',
    employeeId: 'EMP0002',
    roles: ['MANAGER'],
    dataScopes: ['LEGAL_ENTITY:LE-01', 'ORG_UNIT:OU-SALES'],
  },
  EMPLOYEE: {
    id: 'usr-employee',
    externalAuthUserId: 'auth-1003',
    email: 'employee@hacom.local',
    fullName: 'Le Thanh Mai',
    employeeId: 'EMP0003',
    roles: ['EMPLOYEE'],
    dataScopes: ['SELF'],
  },
};

export function getMockUserByToken(token?: string | null): AuthUser | null {
  const matched = Object.entries(MOCK_TOKENS).find(([, value]) => value === token)?.[0] as DemoRole | undefined;
  return matched ? MOCK_AUTH_USERS[matched] : null;
}

