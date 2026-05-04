import { api } from '../../shared/api/httpClient';
import { normalizePaginatedResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { mockDepartments, mockPositions, mockUnits } from '../../shared/mocks/mockOrganization';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockContracts, mockLeaveRequests, mockAttendanceRecords, mockAuditLogs } from '../../shared/mocks/mockWorkflows';
import { maskSensitiveValue } from '../../shared/utils/format';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import type { AttendanceRecord } from '../attendance/attendanceTypes';
import type { AuditLog } from '../audit/auditTypes';
import type { Contract } from '../contracts/contractTypes';
import type { LeaveRequest } from '../leave/leaveTypes';
import type {
  Employee,
  EmployeeAccount,
  EmployeeAccountRole,
  EmployeeAssignment,
  EmployeePayload,
} from './employeeTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
const employeeCodePattern = /^\d{6}$/;

type EmployeeApiDebugContext = {
  source: string;
  idSemanticType: 'employeeId' | 'authUserIds';
  value: string | string[];
};

function debugEmployeeApiRequest(context: EmployeeApiDebugContext) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.debug('[employeesApi]', context);
}

function findNextMockEmployeeCode() {
  const usedCodes = new Set(
    mockEmployees
      .map((employee) => employee.employeeCode)
      .filter((code) => employeeCodePattern.test(code))
      .map((code) => Number(code)),
  );

  for (let value = 1; value <= 999999; value += 1) {
    if (!usedCodes.has(value)) {
      return String(value).padStart(6, '0');
    }
  }

  throw new Error('Đã sử dụng hết mã nhân sự từ 000001 đến 999999.');
}

function applyEmployeeFilters(items: Employee[], params: ListQueryParams = {}): Employee[] {
  return items.filter((employee) => {
    const matchedSearch =
      includesIgnoreCase(employee.employeeCode, params.search) ||
      includesIgnoreCase(employee.fullName, params.search) ||
      includesIgnoreCase(employee.companyEmail, params.search);

    const matchedStatus = params.employmentStatus
      ? employee.employmentStatus === params.employmentStatus
      : true;
    const matchedUnit = params.unitId
      ? employee.currentEmployeeAssignment?.unitId === params.unitId
      : true;
    const matchedDepartment = params.departmentId
      ? employee.currentEmployeeAssignment?.departmentId === params.departmentId
      : true;

    return matchedSearch && matchedStatus && matchedUnit && matchedDepartment;
  });
}

export async function listEmployees(params: ListQueryParams = {}): Promise<PaginatedResponse<Employee>> {
  if (isMockMode) {
    await mockDelay();
    return paginate(applyEmployeeFilters(mockEmployees, params), params);
  }

  const response = await api.get<PaginatedData<Employee>>('/employees', { params });
  return normalizePaginatedResponse<Employee>(response, params);
}

export async function getEmployeeById(
  employeeId: string,
  options?: { source?: string },
): Promise<Employee> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }
    return employee;
  }

  debugEmployeeApiRequest({
    source: options?.source ?? 'unknown',
    idSemanticType: 'employeeId',
    value: employeeId,
  });
  return api.get<Employee>(`/employees/${employeeId}`);
}

export async function getEmployeesByAuthUserIds(
  authUserIds: string[],
  options?: { source?: string },
): Promise<Employee[]> {
  const normalizedAuthUserIds = Array.from(
    new Set(authUserIds.map((value) => value.trim()).filter(Boolean)),
  );
  if (normalizedAuthUserIds.length === 0) {
    return [];
  }

  if (isMockMode) {
    await mockDelay();
    return mockEmployees.filter((employee) =>
      employee.authUserId ? normalizedAuthUserIds.includes(employee.authUserId) : false,
    );
  }

  debugEmployeeApiRequest({
    source: options?.source ?? 'unknown',
    idSemanticType: 'authUserIds',
    value: normalizedAuthUserIds,
  });
  return api.post<Employee[]>('/employees/batch-by-auth-user-ids', {
    authUserIds: normalizedAuthUserIds,
  });
}

export async function getEmployeeAccount(id: string): Promise<EmployeeAccount> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === id);
    if (!employee) {
      throw new Error('Employee not found');
    }
    return employee.account ?? {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      authUserId: employee.authUserId ?? null,
      accountStatus: employee.accountStatus ?? 'NOT_LINKED',
      roles: [],
      linked: Boolean(employee.authUserId),
      syncStatus: employee.authUserId ? 'SYNCED' : 'NOT_LINKED',
    };
  }

  return api.get<EmployeeAccount>(`/employees/${id}/account`);
}

export async function createEmployeeAccount(
  id: string,
  roleCode: EmployeeAccountRole = 'HR',
): Promise<EmployeeAccount> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === id);
    if (!employee) {
      throw new Error('Employee not found');
    }
    const account: EmployeeAccount = {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      authUserId: employee.authUserId ?? generateId('auth'),
      accountStatus: 'INACTIVE',
      localStatus: 'ACTIVE',
      email: employee.companyEmail ?? employee.personalEmail ?? null,
      loginIdentifier: employee.employeeCode,
      roles: [roleCode],
      linked: true,
      syncStatus: 'SYNCED',
    };
    employee.authUserId = account.authUserId;
    employee.accountStatus = account.accountStatus;
    employee.account = account;
    return account;
  }

  return api.post<EmployeeAccount>(`/employees/${id}/account`, { roleCode });
}

export async function lockEmployeeAccount(id: string): Promise<EmployeeAccount> {
  if (isMockMode) {
    await mockDelay();
    const account = await getEmployeeAccount(id);
    account.accountStatus = 'LOCKED';
    return account;
  }

  return api.post<EmployeeAccount>(`/employees/${id}/account/lock`);
}

export async function unlockEmployeeAccount(id: string): Promise<EmployeeAccount> {
  if (isMockMode) {
    await mockDelay();
    const account = await getEmployeeAccount(id);
    account.accountStatus = 'ACTIVE';
    return account;
  }

  return api.post<EmployeeAccount>(`/employees/${id}/account/unlock`);
}

export async function updateEmployeeAccountRoles(
  id: string,
  roles: EmployeeAccountRole[],
): Promise<EmployeeAccount> {
  if (isMockMode) {
    await mockDelay();
    const account = await getEmployeeAccount(id);
    account.roles = roles;
    return account;
  }

  return api.patch<EmployeeAccount>(`/employees/${id}/account/roles`, { roles });
}

export async function getNextEmployeeCode(): Promise<{ code: string }> {
  if (isMockMode) {
    await mockDelay();
    return { code: findNextMockEmployeeCode() };
  }

  return api.get<{ code: string }>('/employees/next-code');
}

export async function createEmployee(payload: EmployeePayload): Promise<Employee> {
  if (isMockMode) {
    await mockDelay();
    const unit = mockUnits.find((item) => item.id === payload.unitId);
    const department = mockDepartments.find((item) => item.id === payload.departmentId);
    const position = mockPositions.find((item) => item.id === payload.positionId);
    const employee: Employee = {
      id: generateId('emp'),
      employeeCode: findNextMockEmployeeCode(),
      fullName: payload.fullName,
      companyEmail: payload.companyEmail,
      personalEmail: payload.personalEmail,
      phone: payload.phone,
      gender: payload.gender,
      dateOfBirth: payload.dateOfBirth,
      hireDate: payload.hireDate,
      employmentStatus: payload.employmentStatus,
      citizenIdMasked: maskSensitiveValue(payload.citizenId),
      unitId: payload.unitId,
      unitName: unit?.name ?? '',
      departmentId: payload.departmentId,
      departmentName: department?.name ?? '',
      positionId: payload.positionId,
      positionName: position?.name ?? '',
      currentEmployeeAssignment: {
        unitId: payload.unitId,
        unitName: unit?.name ?? '',
        departmentId: payload.departmentId,
        departmentName: department?.name ?? '',
        positionId: payload.positionId,
        positionName: position?.name ?? '',
        jobTitle: position?.name ?? payload.jobTitle ?? '',
        managerName: payload.managerName ?? 'Nguyen Ha Linh',
      },
    };

    mockEmployees.unshift(employee);
    appendAuditLog({ entityType: 'EMPLOYEE', entityId: employee.id, action: 'CREATE', afterJson: employee as unknown as Record<string, unknown> });
    return employee;
  }

  return api.post<Employee>('/employees', payload);
}

export async function updateEmployee(id: string, payload: Partial<EmployeePayload>): Promise<Employee> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === id);
    if (!employee) {
      throw new Error('Employee not found');
    }

    const before = { ...employee };
    const unit = mockUnits.find((item) => item.id === payload.unitId);
    const department = mockDepartments.find((item) => item.id === payload.departmentId);
    const position = mockPositions.find((item) => item.id === payload.positionId);
    Object.assign(employee, {
      ...payload,
      citizenIdMasked: payload.citizenId ? maskSensitiveValue(payload.citizenId) : employee.citizenIdMasked,
      currentEmployeeAssignment: employee.currentEmployeeAssignment
        ? {
            ...employee.currentEmployeeAssignment,
            unitId: payload.unitId ?? employee.currentEmployeeAssignment.unitId,
            unitName: unit?.name ?? employee.currentEmployeeAssignment.unitName,
            departmentId: payload.departmentId ?? employee.currentEmployeeAssignment.departmentId,
            departmentName: department?.name ?? employee.currentEmployeeAssignment.departmentName,
            positionId: payload.positionId ?? employee.currentEmployeeAssignment.positionId,
            positionName: position?.name ?? employee.currentEmployeeAssignment.positionName,
            jobTitle: position?.name ?? payload.jobTitle ?? employee.currentEmployeeAssignment.jobTitle,
            managerName: payload.managerName ?? employee.currentEmployeeAssignment.managerName,
          }
        : null,
    });
    employee.unitId = payload.unitId ?? employee.currentEmployeeAssignment?.unitId;
    employee.unitName = unit?.name ?? employee.currentEmployeeAssignment?.unitName;
    employee.departmentId = payload.departmentId ?? employee.currentEmployeeAssignment?.departmentId;
    employee.departmentName = department?.name ?? employee.currentEmployeeAssignment?.departmentName;
    employee.positionId = payload.positionId ?? employee.currentEmployeeAssignment?.positionId;
    employee.positionName = position?.name ?? employee.currentEmployeeAssignment?.positionName;
    appendAuditLog({
      entityType: 'EMPLOYEE',
      entityId: employee.id,
      action: 'UPDATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: employee as unknown as Record<string, unknown>,
    });
    return employee;
  }

  return api.patch<Employee>(`/employees/${id}`, payload);
}

export async function getEmployeeAssignments(id: string): Promise<EmployeeAssignment[]> {
  if (isMockMode) {
    const employee = await getEmployeeById(id, {
      source: 'employeesApi.getEmployeeAssignments',
    });
    return employee.currentEmployeeAssignment ? [employee.currentEmployeeAssignment] : [];
  }

  return api.get<EmployeeAssignment[]>(`/employees/${id}/employee-assignments`);
}

export async function getEmployeeContracts(id: string): Promise<Contract[]> {
  if (isMockMode) {
    await mockDelay();
    return mockContracts.filter((item) => item.employeeId === id);
  }

  return api.get<Contract[]>(`/employees/${id}/contracts`);
}

export async function getEmployeeAuditLogs(id: string): Promise<AuditLog[]> {
  if (isMockMode) {
    await mockDelay();
    return mockAuditLogs.filter((item) => item.entityId === id || item.entityType === 'EMPLOYEE');
  }

  return api.get<AuditLog[]>(`/employees/${id}/audit-logs`);
}

export async function getEmployeeLeave(id: string): Promise<LeaveRequest[]> {
  if (isMockMode) {
    await mockDelay();
    return mockLeaveRequests.filter((item) => item.employeeId === id);
  }

  const response = await api.get<PaginatedData<LeaveRequest>>('/leave/requests', { params: { employeeId: id, page: 1, pageSize: 100 } });
  return normalizePaginatedResponse<LeaveRequest>(response).items;
}

export async function getEmployeeAttendance(id: string): Promise<AttendanceRecord[]> {
  if (isMockMode) {
    await mockDelay();
    return mockAttendanceRecords.filter((item) => item.employeeId === id);
  }

  const response = await api.get<PaginatedData<AttendanceRecord>>('/attendance/records', { params: { employeeId: id, page: 1, pageSize: 100 } });
  return normalizePaginatedResponse<AttendanceRecord>(response).items;
}
