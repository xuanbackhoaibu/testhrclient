import { httpClient } from '../../shared/api/httpClient';
import { normalizePaginatedResponse, unwrapApiResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockContracts, mockLeaveRequests, mockAttendanceRecords, mockAuditLogs } from '../../shared/mocks/mockWorkflows';
import { maskSensitiveValue } from '../../shared/utils/format';
import type { ListQueryParams, PaginatedResponse } from '../../shared/types/api';
import type { AttendanceRecord } from '../attendance/attendanceTypes';
import type { AuditLog } from '../audit/auditTypes';
import type { Contract } from '../contracts/contractTypes';
import type { LeaveRequest } from '../leave/leaveTypes';
import type { Employee, EmployeeAssignment, EmployeePayload } from './employeeTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

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

  const response = await httpClient.get('/employees', { params });
  return normalizePaginatedResponse<Employee>(response.data, params);
}

export async function getEmployee(id: string): Promise<Employee> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === id);
    if (!employee) {
      throw new Error('Employee not found');
    }
    return employee;
  }

  const response = await httpClient.get(`/employees/${id}`);
  return unwrapApiResponse<Employee>(response.data);
}

export async function createEmployee(payload: EmployeePayload): Promise<Employee> {
  if (isMockMode) {
    await mockDelay();
    const employee: Employee = {
      id: generateId('emp'),
      employeeCode: `NV${String(mockEmployees.length + 1).padStart(6, '0')}`,
      fullName: payload.fullName,
      companyEmail: payload.companyEmail,
      personalEmail: payload.personalEmail,
      phone: payload.phone,
      gender: payload.gender,
      dateOfBirth: payload.dateOfBirth,
      hireDate: payload.hireDate,
      employmentStatus: payload.employmentStatus,
      citizenIdMasked: maskSensitiveValue(payload.citizenId),
      currentEmployeeAssignment: {
        unitId: payload.unitId ?? 'le-01',
        unitName: 'HACOM Holdings',
        departmentId: payload.departmentId ?? 'ou-hr',
        departmentName: 'Human Resources',
        positionId: payload.positionId ?? 'pos-hro',
        positionName: payload.jobTitle ?? 'HR Officer',
        jobTitle: payload.jobTitle ?? 'HR Officer',
        managerName: payload.managerName ?? 'Nguyen Ha Linh',
      },
    };

    mockEmployees.unshift(employee);
    appendAuditLog({ entityType: 'EMPLOYEE', entityId: employee.id, action: 'CREATE', afterJson: employee as unknown as Record<string, unknown> });
    return employee;
  }

  const response = await httpClient.post('/employees', payload);
  return unwrapApiResponse<Employee>(response.data);
}

export async function updateEmployee(id: string, payload: Partial<EmployeePayload>): Promise<Employee> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === id);
    if (!employee) {
      throw new Error('Employee not found');
    }

    const before = { ...employee };
    Object.assign(employee, {
      ...payload,
      citizenIdMasked: payload.citizenId ? maskSensitiveValue(payload.citizenId) : employee.citizenIdMasked,
      currentEmployeeAssignment: employee.currentEmployeeAssignment
        ? {
            ...employee.currentEmployeeAssignment,
            jobTitle: payload.jobTitle ?? employee.currentEmployeeAssignment.jobTitle,
            managerName: payload.managerName ?? employee.currentEmployeeAssignment.managerName,
          }
        : null,
    });
    appendAuditLog({
      entityType: 'EMPLOYEE',
      entityId: employee.id,
      action: 'UPDATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: employee as unknown as Record<string, unknown>,
    });
    return employee;
  }

  const response = await httpClient.patch(`/employees/${id}`, payload);
  return unwrapApiResponse<Employee>(response.data);
}

export async function getEmployeeAssignments(id: string): Promise<EmployeeAssignment[]> {
  if (isMockMode) {
    const employee = await getEmployee(id);
    return employee.currentEmployeeAssignment ? [employee.currentEmployeeAssignment] : [];
  }

  const response = await httpClient.get(`/employees/${id}/employee-assignments`);
  return unwrapApiResponse<EmployeeAssignment[]>(response.data);
}

export async function getEmployeeContracts(id: string): Promise<Contract[]> {
  if (isMockMode) {
    await mockDelay();
    return mockContracts.filter((item) => item.employeeId === id);
  }

  const response = await httpClient.get(`/employees/${id}/contracts`);
  return unwrapApiResponse<Contract[]>(response.data);
}

export async function getEmployeeAuditLogs(id: string): Promise<AuditLog[]> {
  if (isMockMode) {
    await mockDelay();
    return mockAuditLogs.filter((item) => item.entityId === id || item.entityType === 'EMPLOYEE');
  }

  const response = await httpClient.get(`/employees/${id}/audit-logs`);
  return unwrapApiResponse<AuditLog[]>(response.data);
}

export async function getEmployeeLeave(id: string): Promise<LeaveRequest[]> {
  if (isMockMode) {
    await mockDelay();
    return mockLeaveRequests.filter((item) => item.employeeId === id);
  }

  const response = await httpClient.get('/leave/requests', { params: { employeeId: id, page: 1, pageSize: 100 } });
  return normalizePaginatedResponse<LeaveRequest>(response.data).items;
}

export async function getEmployeeAttendance(id: string): Promise<AttendanceRecord[]> {
  if (isMockMode) {
    await mockDelay();
    return mockAttendanceRecords.filter((item) => item.employeeId === id);
  }

  const response = await httpClient.get('/attendance/records', { params: { employeeId: id, page: 1, pageSize: 100 } });
  return normalizePaginatedResponse<AttendanceRecord>(response.data).items;
}
