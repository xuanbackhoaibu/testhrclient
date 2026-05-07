export type ScopeClaim = {
  system: string;
  scopeType: string;
  resourceType?: string;
  resourceIds?: string[];
  unitId?: string;
  unitIds?: string[];
  departmentId?: string;
  departmentIds?: string[];
};

export interface CurrentUser {
  id: string;
  userId: string;
  authUserId?: string;
  auth_user_id?: string;
  authPrincipalUserId?: string;
  externalAuthUserId: string;
  email: string;
  username?: string | null;
  fullName: string;
  accountStatus: string;
  account_status?: string;
  employeeId: string | null;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    email: string | null;
    companyEmail: string | null;
    personalEmail: string | null;
    phone: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    dateOfJoining: string | null;
    citizenIdMasked: string | null;
    status: string | null;
    employmentStatus: string | null;
    unitId: string | null;
    departmentId: string | null;
    positionId: string | null;
    businessSector: { id: string; code: string; name: string } | null;
    unit: { id: string; code: string; name: string; shortName: string | null; taxCode: string | null } | null;
    department: { id: string; code: string; name: string } | null;
    position: { id: string; code: string; name: string } | null;
  } | null;
  roles: string[];
  permissions: string[];
  permissionVersion?: number;
  tokenVersion?: number;
  mustChangePassword?: boolean;
  identityWarnings?: string[];
  scopes?: ScopeClaim[];
  dataScopes: Array<{
    scopeType: string;
    unitId: string | null;
    departmentId: string | null;
  }>;
}

export type AuthUser = CurrentUser;

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
