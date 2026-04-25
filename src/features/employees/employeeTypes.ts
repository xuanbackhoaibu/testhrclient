export interface EmployeeAssignment {
  legalEntityId: string;
  legalEntityName: string;
  orgUnitId: string;
  orgUnitName: string;
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
  currentAssignment: EmployeeAssignment;
}

export interface EmployeePayload {
  employeeCode: string;
  fullName: string;
  companyEmail?: string;
  personalEmail?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  hireDate: string;
  employmentStatus: string;
  citizenId?: string;
  legalEntityId?: string;
  orgUnitId?: string;
  positionId?: string;
  jobTitle?: string;
  managerName?: string;
}

