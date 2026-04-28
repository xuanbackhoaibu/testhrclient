import type { AuthUser, DemoRole } from '../../features/auth/types';

export const MOCK_TOKENS: Record<DemoRole, string> = {
  SUPER_ADMIN: 'dev-admin-token',
  ADMIN: 'dev-hr-token',
  HR: 'dev-hr-token',
  BAN_LANH_DAO: 'dev-manager-token',
  BAN_LANH_DAO_DON_VI: 'dev-manager-token',
  EMPLOYEE: 'dev-employee-token',
};

export const MOCK_AUTH_USERS: Record<DemoRole, AuthUser> = {
  SUPER_ADMIN: {
    id: 'usr-super-admin',
    externalAuthUserId: 'auth-1000',
    email: 'super.admin@hacom.local',
    fullName: 'Super Admin',
    accountStatus: 'ACTIVE',
    employeeId: 'EMP0001',
    employee: {
      id: 'EMP0001',
      employeeCode: '000001',
      fullName: 'Super Admin',
      unitId: 'le-01',
      departmentId: 'ou-hr',
      positionId: 'pos-hrm',
    },
    roles: ['SUPER_ADMIN'],
    dataScopes: [{ scopeType: 'GLOBAL', unitId: null, departmentId: null }],
  },
  ADMIN: {
    id: 'usr-admin',
    externalAuthUserId: 'auth-1001-admin',
    email: 'admin@hacom.local',
    fullName: 'Admin',
    accountStatus: 'ACTIVE',
    employeeId: 'EMP0001',
    employee: {
      id: 'EMP0001',
      employeeCode: '000001',
      fullName: 'Admin',
      unitId: 'le-01',
      departmentId: 'ou-hr',
      positionId: 'pos-hrm',
    },
    roles: ['ADMIN'],
    dataScopes: [{ scopeType: 'GLOBAL', unitId: null, departmentId: null }],
  },
  HR: {
    id: 'usr-hr-admin',
    externalAuthUserId: 'auth-1001',
    email: 'hr.admin@hacom.local',
    fullName: 'Nguyen Ha Linh',
    accountStatus: 'ACTIVE',
    employeeId: 'EMP0001',
    employee: {
      id: 'EMP0001',
      employeeCode: '000001',
      fullName: 'Nguyen Ha Linh',
      unitId: 'le-01',
      departmentId: 'ou-hr',
      positionId: 'pos-hrm',
    },
    roles: ['HR'],
    dataScopes: [{ scopeType: 'GLOBAL', unitId: null, departmentId: null }],
  },
  BAN_LANH_DAO: {
    id: 'usr-leadership',
    externalAuthUserId: 'auth-1002-leader',
    email: 'leadership@hacom.local',
    fullName: 'Ban Lanh Dao',
    accountStatus: 'ACTIVE',
    employeeId: 'EMP0002',
    employee: {
      id: 'EMP0002',
      employeeCode: '000002',
      fullName: 'Ban Lanh Dao',
      unitId: 'le-01',
      departmentId: 'ou-sales',
      positionId: 'pos-sls',
    },
    roles: ['BAN_LANH_DAO'],
    dataScopes: [{ scopeType: 'GLOBAL', unitId: null, departmentId: null }],
  },
  BAN_LANH_DAO_DON_VI: {
    id: 'usr-manager',
    externalAuthUserId: 'auth-1002',
    email: 'manager.ops@hacom.local',
    fullName: 'Tran Minh Quan',
    accountStatus: 'ACTIVE',
    employeeId: 'EMP0002',
    employee: {
      id: 'EMP0002',
      employeeCode: '000002',
      fullName: 'Tran Minh Quan',
      unitId: 'le-01',
      departmentId: 'ou-sales',
      positionId: 'pos-sls',
    },
    roles: ['BAN_LANH_DAO_DON_VI'],
    dataScopes: [
      { scopeType: 'UNIT', unitId: 'le-01', departmentId: null },
      { scopeType: 'DEPARTMENT', unitId: null, departmentId: 'ou-sales' },
    ],
  },
  EMPLOYEE: {
    id: 'usr-employee',
    externalAuthUserId: 'auth-1003',
    email: 'employee@hacom.local',
    fullName: 'Le Thanh Mai',
    accountStatus: 'ACTIVE',
    employeeId: 'EMP0003',
    employee: {
      id: 'EMP0003',
      employeeCode: '000003',
      fullName: 'Le Thanh Mai',
      unitId: 'le-02',
      departmentId: 'ou-retail',
      positionId: 'pos-hro',
    },
    roles: ['EMPLOYEE'],
    dataScopes: [{ scopeType: 'SELF', unitId: null, departmentId: null }],
  },
};

export function getMockUserByToken(token?: string | null): AuthUser | null {
  const matched = Object.entries(MOCK_TOKENS).find(([, value]) => value === token)?.[0] as DemoRole | undefined;
  return matched ? MOCK_AUTH_USERS[matched] : null;
}
