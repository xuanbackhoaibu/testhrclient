import { httpClient } from '../../shared/api/httpClient';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockAttendanceRecords } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams, PaginatedResponse } from '../../shared/types/api';
import type { AttendancePayload, AttendanceRecord } from './attendanceTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export async function listAttendanceRecords(params: ListQueryParams = {}): Promise<PaginatedResponse<AttendanceRecord>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockAttendanceRecords
      .filter((item) => (params.employeeId ? item.employeeId === params.employeeId : true))
      .filter((item) => (params.source ? item.source === params.source : true))
      .filter((item) => (params.status ? item.status === params.status : true))
      .filter((item) => (params.fromDate ? item.workDate >= params.fromDate : true))
      .filter((item) => (params.toDate ? item.workDate <= params.toDate : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.employeeName, params.search) ||
          includesIgnoreCase(item.source, params.search) ||
          (!params.search && true),
      );

    return paginate(filtered, params);
  }

  const response = await httpClient.get<PaginatedResponse<AttendanceRecord>>('/attendance-records', { params });
  return response.data;
}

export async function createAttendanceRecord(payload: AttendancePayload): Promise<AttendanceRecord> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === payload.employeeId);
    const record: AttendanceRecord = {
      id: generateId('att'),
      employeeName: employee?.fullName ?? payload.employeeId,
      ...payload,
    };
    mockAttendanceRecords.unshift(record);
    appendAuditLog({ entityType: 'ATTENDANCE', entityId: record.id, action: 'CREATE', afterJson: record as unknown as Record<string, unknown> });
    return record;
  }

  const response = await httpClient.post<AttendanceRecord>('/attendance-records', payload);
  return response.data;
}

export async function updateAttendanceRecord(id: string, payload: Partial<AttendancePayload>): Promise<AttendanceRecord> {
  if (isMockMode) {
    await mockDelay();
    const record = mockAttendanceRecords.find((item) => item.id === id);
    if (!record) {
      throw new Error('Attendance record not found');
    }
    const before = { ...record };
    Object.assign(record, payload);
    appendAuditLog({
      entityType: 'ATTENDANCE',
      entityId: id,
      action: 'UPDATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: record as unknown as Record<string, unknown>,
    });
    return record;
  }

  const response = await httpClient.patch<AttendanceRecord>(`/attendance-records/${id}`, payload);
  return response.data;
}
