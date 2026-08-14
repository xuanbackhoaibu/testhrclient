import { api } from '../../shared/api/httpClient';
import { normalizePaginatedResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockAttendanceRecords } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import type {
  AttendancePayload,
  AttendanceRecord,
  AttendanceDailyRecord,
  AttendanceDailyRecordsResponse,
  AttendanceDailyFilterParams,
  AttendanceSyncStatusResponse,
  AttendanceSyncRunsResponse,
  SyncRunsFilterParams,
  ManualSyncResponse,
  BioTimeDepartment,
  BioTimeDepartmentsResponse,
  BioTimeDepartmentSyncResponse,
  MappingStats,
  UnmappedAttendanceItem,
  EmployeeSuggestion,
  MapAttendancePayload,
  MapAttendanceResult,
  RemapResult,
} from './attendanceTypes';
import { longRunningAttendanceMutationConfig } from './longRunningMutation';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

// ─── BioTime Daily Records ────────────────────────────────────────────────────

export async function listAttendanceDailyRecords(
  params: AttendanceDailyFilterParams = {},
): Promise<AttendanceDailyRecordsResponse> {
  const response = await api.get<PaginatedData<AttendanceDailyRecord> & { summary?: unknown }>('/attendance/daily', { params });
  return normalizePaginatedResponse<AttendanceDailyRecord>(response, params) as AttendanceDailyRecordsResponse;
}

export async function getAttendanceSyncStatus(): Promise<AttendanceSyncStatusResponse> {
  return api.get('/attendance/sync/status');
}

export async function listAttendanceSyncRuns(
  params: SyncRunsFilterParams = {},
): Promise<AttendanceSyncRunsResponse> {
  const response = await api.get<PaginatedData<unknown>>('/attendance/sync/runs', { params });
  return normalizePaginatedResponse<unknown>(response, params) as AttendanceSyncRunsResponse;
}

export async function manualAttendanceSync(body: {
  startDate?: string;
  endDate?: string;
  refreshDepartments?: boolean;
}): Promise<ManualSyncResponse> {
  return api.post(
    '/attendance/sync/manual',
    body,
    longRunningAttendanceMutationConfig,
  );
}

// ─── BioTime Departments ─────────────────────────────────────────────────────

export async function listBioTimeDepartments(params: {
  isActive?: boolean;
  isLeaf?: boolean;
  keyword?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<BioTimeDepartmentsResponse> {
  const response = await api.get<PaginatedData<BioTimeDepartment>>('/attendance/biotime/departments', { params });
  return normalizePaginatedResponse<BioTimeDepartment>(response, params) as BioTimeDepartmentsResponse;
}

export async function syncBioTimeDepartments(): Promise<BioTimeDepartmentSyncResponse> {
  return api.post('/attendance/biotime/departments/sync');
}

// ─── Legacy manual attendance (keep existing) ────────────────────────────────

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

  const response = await api.get<PaginatedData<AttendanceRecord>>('/attendance/records', { params });
  return normalizePaginatedResponse<AttendanceRecord>(response, params);
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

  return api.post<AttendanceRecord>('/attendance/records', payload);
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

  return api.patch<AttendanceRecord>(`/attendance/records/${id}`, payload);
}

// ─── Attendance Mapping ────────────────────────────────────────────────────────

export async function getAttendanceMappingStats(): Promise<MappingStats> {
  const response = await api.get<{ data: MappingStats }>('/attendance/mapping/stats');
  return response.data;
}

export async function getUnmappedAttendance(params: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}): Promise<{
  items: UnmappedAttendanceItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  return api.get('/attendance/mapping/unmapped', { params });
}

export async function getAttendanceMappingSuggestions(params: {
  empCode: string;
  fullName?: string;
  deptName?: string;
}): Promise<EmployeeSuggestion[]> {
  return api.get<EmployeeSuggestion[]>('/attendance/mapping/suggestions', { params });
}

export async function mapAttendanceEmployee(payload: MapAttendancePayload): Promise<MapAttendanceResult> {
  return api.post<MapAttendanceResult>('/attendance/mapping/map', payload);
}

export async function remapAttendance(payload?: {
  fromDate?: string;
  toDate?: string;
  empCodes?: string[];
}): Promise<RemapResult> {
  return api.post<RemapResult>('/attendance/mapping/remap', payload ?? {});
}
