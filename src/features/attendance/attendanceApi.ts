import { api } from '../../shared/api/httpClient';
import { normalizePaginatedResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { mockDepartments } from '../../shared/mocks/mockOrganization';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockAttendanceRecords } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import type {
  AttendancePayload,
  AttendanceRecord,
  AttendanceDailyRecord,
  AttendanceDailyRecordsResponse,
  AttendanceDailyFilterParams,
  AttendanceSummary,
  AttendanceSyncStatusResponse,
  AttendanceSyncRun,
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

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

function mockPagination(total: number, page = 1, pageSize = 20) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function toTime(value?: string): string | null {
  if (!value) return null;
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function buildMockDailyRecord(record: AttendanceRecord, index: number): AttendanceDailyRecord {
  const employee = mockEmployees.find((item) => item.id === record.employeeId);
  const departmentName =
    employee?.currentEmployeeAssignment?.departmentName ??
    employee?.departmentName ??
    record.employeeName ??
    null;
  const firstPunch = toTime(record.checkIn);
  const lastPunch = toTime(record.checkOut);
  const totalMinutes = firstPunch && lastPunch ? 8 * 60 : firstPunch ? null : 0;
  const status =
    record.status === 'ABSENT'
      ? 'ABSENT'
      : firstPunch && !lastPunch
        ? 'SINGLE_PUNCH'
        : firstPunch && firstPunch > '08:30'
          ? 'LATE'
          : firstPunch
            ? 'PRESENT'
            : 'UNKNOWN';

  return {
    id: record.id,
    empCode: employee?.biotimeEmployeeCode ?? employee?.employeeCode ?? `BT${String(index + 1).padStart(4, '0')}`,
    employeeId: employee?.id ?? null,
    employeeCode: employee?.employeeCode ?? null,
    fullName: employee?.fullName ?? record.employeeName ?? null,
    biotimeDepartmentId: index + 1,
    deptName: departmentName,
    workDate: record.workDate,
    firstPunch,
    lastPunch,
    totalTime: totalMinutes ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : null,
    totalMinutes,
    status,
    mappingStatus: employee ? 'MAPPED' : 'UNMAPPED',
    syncStatus: 'SUCCESS',
  };
}

function getMockDailyRecords(): AttendanceDailyRecord[] {
  return mockAttendanceRecords.map(buildMockDailyRecord);
}

function summarizeDaily(records: AttendanceDailyRecord[]): AttendanceSummary {
  return {
    total: records.length,
    present: records.filter((item) => item.status === 'PRESENT').length,
    late: records.filter((item) => item.status === 'LATE').length,
    absent: records.filter((item) => item.status === 'ABSENT').length,
    singlePunch: records.filter((item) => item.status === 'SINGLE_PUNCH').length,
    unknown: records.filter((item) => item.status === 'UNKNOWN').length,
    mapped: records.filter((item) => item.mappingStatus === 'MAPPED').length,
    autoMapped: records.filter((item) => item.mappingStatus === 'AUTO_MAPPED').length,
    unmapped: records.filter((item) => item.mappingStatus === 'UNMAPPED').length,
    conflict: records.filter((item) => item.mappingStatus === 'CONFLICT').length,
  };
}

function applyMockDailyFilters(
  records: AttendanceDailyRecord[],
  params: AttendanceDailyFilterParams,
): AttendanceDailyRecord[] {
  return records
    .filter((item) =>
      includesIgnoreCase(item.empCode, params.search) ||
      includesIgnoreCase(item.fullName ?? undefined, params.search) ||
      includesIgnoreCase(item.deptName ?? undefined, params.search) ||
      (!params.search && true),
    )
    .filter((item) => (params.date ? item.workDate === params.date : true))
    .filter((item) => (params.from ? item.workDate >= params.from : true))
    .filter((item) => (params.to ? item.workDate <= params.to : true))
    .filter((item) => (params.status ? item.status === params.status : true))
    .filter((item) => (params.mappingStatus ? item.mappingStatus === params.mappingStatus : true))
    .filter((item) =>
      params.biotimeDepartmentId
        ? item.biotimeDepartmentId === params.biotimeDepartmentId
        : true,
    );
}

const successfulSyncJob = {
  isRunning: false,
  lastSuccessAt: new Date().toISOString(),
  lastError: null,
  lastErrorAt: null,
  totalSynced: mockAttendanceRecords.length,
  latestRun: {
    status: 'SUCCESS',
    totalFetched: mockAttendanceRecords.length,
    totalUpserted: mockAttendanceRecords.length,
    errorMessage: null,
  },
};

// ─── BioTime Daily Records ────────────────────────────────────────────────────

export async function listAttendanceDailyRecords(
  params: AttendanceDailyFilterParams = {},
): Promise<AttendanceDailyRecordsResponse> {
  if (isMockMode) {
    await mockDelay();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const filtered = applyMockDailyFilters(getMockDailyRecords(), params);
    const start = (page - 1) * pageSize;
    return {
      data: filtered.slice(start, start + pageSize),
      pagination: mockPagination(filtered.length, page, pageSize),
      summary: summarizeDaily(filtered),
    };
  }

  const response = await api.get<PaginatedData<AttendanceDailyRecord> & { summary?: unknown }>('/attendance/daily', { params });
  return normalizePaginatedResponse<AttendanceDailyRecord>(response, params) as AttendanceDailyRecordsResponse;
}

export async function getAttendanceSyncStatus(): Promise<AttendanceSyncStatusResponse> {
  if (isMockMode) {
    await mockDelay();
    return {
      data: {
        hasAttendanceData: mockAttendanceRecords.length > 0,
        attendanceTotal: mockAttendanceRecords.length,
        departmentTotal: mockDepartments.length,
        dailyToday: successfulSyncJob,
        nightly7Days: successfulSyncJob,
        manualSync: successfulSyncJob,
      },
    };
  }

  return api.get('/attendance/sync/status');
}

export async function listAttendanceSyncRuns(
  params: SyncRunsFilterParams = {},
): Promise<AttendanceSyncRunsResponse> {
  if (isMockMode) {
    await mockDelay();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const items: AttendanceSyncRun[] = [
      {
        id: 'mock-sync-run-1',
        jobName: 'manual',
        status: 'SUCCESS',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        totalFetched: mockAttendanceRecords.length,
        totalUpserted: mockAttendanceRecords.length,
        mappedCount: mockAttendanceRecords.length,
        unmappedCount: 0,
        errorMessage: null,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        triggeredBy: 'Mock mode',
      },
    ];
    return {
      data: items.slice((page - 1) * pageSize, page * pageSize),
      pagination: mockPagination(items.length, page, pageSize),
    };
  }

  const response = await api.get<PaginatedData<unknown>>('/attendance/sync/runs', { params });
  return normalizePaginatedResponse<unknown>(response, params) as AttendanceSyncRunsResponse;
}

export async function manualAttendanceSync(body: {
  startDate?: string;
  endDate?: string;
  refreshDepartments?: boolean;
}): Promise<ManualSyncResponse> {
  if (isMockMode) {
    await mockDelay();
    return {
      data: {
        syncRunId: generateId('sync'),
        jobName: body.refreshDepartments ? 'manual-with-departments' : 'manual',
        status: 'SUCCESS',
        totalFetched: mockAttendanceRecords.length,
        totalUpserted: mockAttendanceRecords.length,
        mappedCount: mockAttendanceRecords.length,
        unmappedCount: 0,
      },
    };
  }

  return api.post('/attendance/sync/manual', body);
}

// ─── BioTime Departments ─────────────────────────────────────────────────────

export async function listBioTimeDepartments(params: {
  isActive?: boolean;
  isLeaf?: boolean;
  keyword?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<BioTimeDepartmentsResponse> {
  if (isMockMode) {
    await mockDelay();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const items: BioTimeDepartment[] = mockDepartments.map((department, index) => ({
      id: `mock-biotime-dept-${department.id}`,
      biotimeDepartmentId: index + 1,
      name: department.name,
      parentId: null,
      level: 1,
      path: department.name,
      isLeaf: true,
      isActive: department.status === 'ACTIVE',
      syncedAt: new Date().toISOString(),
    })).filter((department) => (params.isActive === undefined ? true : department.isActive === params.isActive))
      .filter((department) => (params.isLeaf === undefined ? true : department.isLeaf === params.isLeaf))
      .filter((department) => includesIgnoreCase(department.name, params.keyword) || (!params.keyword && true));

    return {
      data: items.slice((page - 1) * pageSize, page * pageSize),
      pagination: mockPagination(items.length, page, pageSize),
    };
  }

  const response = await api.get<PaginatedData<BioTimeDepartment>>('/attendance/biotime/departments', { params });
  return normalizePaginatedResponse<BioTimeDepartment>(response, params) as BioTimeDepartmentsResponse;
}

export async function syncBioTimeDepartments(): Promise<BioTimeDepartmentSyncResponse> {
  if (isMockMode) {
    await mockDelay();
    return { data: { total: mockDepartments.length, upserted: mockDepartments.length } };
  }

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
  if (isMockMode) {
    await mockDelay();
    const summary = summarizeDaily(getMockDailyRecords());
    return {
      total: summary.total,
      mapped: summary.mapped,
      autoMapped: summary.autoMapped,
      unmapped: summary.unmapped,
      conflict: summary.conflict,
    };
  }

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
  if (isMockMode) {
    await mockDelay();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const unmapped = getMockDailyRecords()
      .filter((item) => item.mappingStatus === 'UNMAPPED')
      .filter((item) =>
        includesIgnoreCase(item.empCode, params.search) ||
        includesIgnoreCase(item.fullName ?? undefined, params.search) ||
        includesIgnoreCase(item.deptName ?? undefined, params.search) ||
        (!params.search && true),
      );
    const items = unmapped.map((item) => ({
      empCode: item.empCode,
      fullName: item.fullName,
      deptName: item.deptName,
      recordCount: 1,
      firstWorkDate: item.workDate,
      lastWorkDate: item.workDate,
    }));
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
    };
  }

  return api.get('/attendance/mapping/unmapped', { params });
}

export async function getAttendanceMappingSuggestions(params: {
  empCode: string;
  fullName?: string;
  deptName?: string;
}): Promise<EmployeeSuggestion[]> {
  if (isMockMode) {
    await mockDelay();
    return mockEmployees
      .filter((employee) =>
        includesIgnoreCase(employee.employeeCode, params.empCode) ||
        includesIgnoreCase(employee.fullName, params.fullName) ||
        includesIgnoreCase(employee.currentEmployeeAssignment?.departmentName, params.deptName),
      )
      .slice(0, 5)
      .map((employee, index) => ({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        departmentName: employee.currentEmployeeAssignment?.departmentName ?? null,
        biotimeEmployeeCode: employee.biotimeEmployeeCode ?? null,
        score: Math.max(70, 98 - index * 6),
        reasons: ['Mock suggestion'],
      }));
  }

  return api.get<EmployeeSuggestion[]>('/attendance/mapping/suggestions', { params });
}

export async function mapAttendanceEmployee(payload: MapAttendancePayload): Promise<MapAttendanceResult> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === payload.employeeId);
    return {
      updatedAttendanceCount: 1,
      employee: {
        id: employee?.id ?? payload.employeeId,
        employeeCode: employee?.employeeCode ?? payload.employeeId,
        fullName: employee?.fullName ?? payload.employeeId,
      },
    };
  }

  return api.post<MapAttendanceResult>('/attendance/mapping/map', payload);
}

export async function remapAttendance(payload?: {
  fromDate?: string;
  toDate?: string;
  empCodes?: string[];
}): Promise<RemapResult> {
  if (isMockMode) {
    await mockDelay();
    const summary = summarizeDaily(getMockDailyRecords());
    return {
      totalProcessed: summary.total,
      mappedCount: summary.mapped,
      autoMappedCount: summary.autoMapped,
      unmappedCount: summary.unmapped,
      conflictCount: summary.conflict,
    };
  }

  return api.post<RemapResult>('/attendance/mapping/remap', payload ?? {});
}
