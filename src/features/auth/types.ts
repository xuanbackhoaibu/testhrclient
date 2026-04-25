export interface AuthUser {
  id: string;
  externalAuthUserId: string;
  email: string;
  fullName: string;
  employeeId: string;
  roles: string[];
  dataScopes: string[];
}

export type DemoRole = 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

