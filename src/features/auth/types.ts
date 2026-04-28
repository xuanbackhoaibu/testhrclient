export interface AuthUser {
  id: string;
  authUserId?: string;
  auth_user_id?: string;
  externalAuthUserId: string;
  email: string;
  fullName: string;
  accountStatus?: string;
  account_status?: string;
  employeeId: string | null;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    unitId: string | null;
    departmentId: string | null;
    positionId: string | null;
  } | null;
  roles: string[];
  dataScopes: Array<{
    scopeType: string;
    unitId: string | null;
    departmentId: string | null;
  }>;
}

export type DemoRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'HR'
  | 'BAN_LANH_DAO'
  | 'BAN_LANH_DAO_DON_VI'
  | 'EMPLOYEE';

export interface LoginCredentials {
  loginIdentifier: string;
  password: string;
  rememberMe?: boolean;
}
