export interface EmployeeAssignment {
  unitId: string;
  unitName: string;
  departmentId: string;
  departmentName: string;
  positionId: string;
  positionName: string;
  jobTitle: string;
  managerName: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  companyEmail?: string;
  personalEmail?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  hireDate: string;
  employmentStatus: string;
  citizenIdMasked?: string;
  unitId?: string | null;
  unitName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  positionId?: string | null;
  positionName?: string | null;
  authUserId?: string | null;
  /** True when the employee is linked to any auth account (either mirror). */
  hasAccount?: boolean;
  /** Canonical account status: NOT_CREATED | ACTIVE | LOCKED | DEACTIVATED | ... */
  accountStatus?: string | null;
  /** Pre-translated Vietnamese label for the account status, from the API. */
  accountDisplayStatus?: string | null;
  account?: EmployeeAccount | null;
  currentEmployeeAssignment: EmployeeAssignment | null;
  biotimeEmployeeCode?: string | null;
}

export interface EmployeeAccount {
  employeeId: string;
  employeeCode?: string;
  authUserId: string | null;
  accountStatus: string;
  localStatus?: string | null;
  email?: string | null;
  loginIdentifier?: string | null;
  roles: string[];
  linked: boolean;
  syncStatus: 'SYNCED' | 'AUTH_UNAVAILABLE' | 'NOT_LINKED' | string;
}

export interface EmployeeCodePreview {
  businessSectorId: string;
  businessSectorCode: string;
  nextNumber: number | null;
  employeeCode: string | null;
}

export type EmployeeAccountRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'HR'
  | 'BAN_LANH_DAO'
  | 'BAN_LANH_DAO_DON_VI'
  | 'EMPLOYEE';

export interface EmployeePayload {
  employeeCode?: string;
  fullName: string;
  companyEmail?: string;
  personalEmail?: string;
  phone: string;
  gender?: string;
  dateOfBirth?: string;
  hireDate: string;
  employmentStatus: string;
  citizenId?: string;
  unitId: string;
  departmentId: string;
  positionId: string;
  jobTitle?: string;
  managerName?: string;
  biotimeEmployeeCode?: string | null;
}
