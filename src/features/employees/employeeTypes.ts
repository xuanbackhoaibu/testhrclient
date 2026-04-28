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
  currentEmployeeAssignment: EmployeeAssignment | null;
}

export interface EmployeePayload {
  fullName: string;
  companyEmail?: string;
  personalEmail?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  hireDate: string;
  employmentStatus: string;
  citizenId?: string;
  unitId?: string;
  departmentId?: string;
  positionId?: string;
  jobTitle?: string;
  managerName?: string;
}
