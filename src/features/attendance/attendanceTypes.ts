export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  checkIn?: string;
  checkOut?: string;
  source: string;
  status: string;
}

export interface AttendancePayload {
  employeeId: string;
  workDate: string;
  checkIn?: string;
  checkOut?: string;
  source: string;
  status: string;
}

// ─── BioTime Daily Record (from new sync API) ────────────────────────────────

export type AttendanceStatusBiometric = 'PRESENT' | 'LATE' | 'ABSENT' | 'SINGLE_PUNCH' | 'UNKNOWN';

export type MappingStatus = 'MAPPED' | 'AUTO_MAPPED' | 'UNMAPPED' | 'CONFLICT';

export type SyncStatusValue = 'SUCCESS' | 'FAILED';

export interface AttendanceDailyRecord {
  id: string;
  empCode: string;
  employeeId: string | null;
  employeeCode: string | null;
  fullName: string | null;
  biotimeDepartmentId: number | null;
  deptName: string | null;
  workDate: string;
  firstPunch: string | null;
  lastPunch: string | null;
  totalTime: string | null;
  totalMinutes: number | null;
  status: AttendanceStatusBiometric | null;
  mappingStatus: MappingStatus;
  syncStatus: SyncStatusValue;
}

/**
 * Totals for every record matching the current filter, computed by the backend
 * over the whole result set rather than the page on screen.
 *
 * `mapped` already includes AUTO_MAPPED, and the backend reports no CONFLICT
 * bucket, so both are optional here and only rendered when present.
 */
export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  singlePunch: number;
  unknown: number;
  mapped: number;
  unmapped: number;
  autoMapped?: number;
  conflict?: number;
}

// ─── Mapping Stats ────────────────────────────────────────────────────────────

export interface MappingStats {
  total: number;
  mapped: number;
  autoMapped: number;
  unmapped: number;
  conflict: number;
}

export interface UnmappedAttendanceItem {
  empCode: string;
  fullName: string | null;
  deptName: string | null;
  recordCount: number;
  firstWorkDate: string;
  lastWorkDate: string;
}

export interface EmployeeSuggestion {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  departmentName: string | null;
  biotimeEmployeeCode: string | null;
  score: number;
  reasons: string[];
}

export interface MapAttendancePayload {
  empCode: string;
  employeeId: string;
}

export interface MapAttendanceResult {
  updatedAttendanceCount: number;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
  };
}

export interface RemapResult {
  totalProcessed: number;
  mappedCount: number;
  autoMappedCount: number;
  unmappedCount: number;
  conflictCount: number;
}

export interface AttendanceDailyRecordsResponse {
  data: AttendanceDailyRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  summary?: AttendanceSummary;
}

// ─── Sync Status ─────────────────────────────────────────────────────────────

export interface SyncJobLatestRun {
  status: string | null;
  totalFetched: number;
  totalUpserted: number;
  errorMessage: string | null;
}

export interface SyncJobStatus {
  isRunning: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  totalSynced: number;
  latestRun: SyncJobLatestRun | null;
}

export interface AttendanceSyncStatus {
  hasAttendanceData: boolean;
  attendanceTotal: number;
  departmentTotal: number;
  dailyToday: SyncJobStatus;
  nightly7Days: SyncJobStatus;
  manualSync: SyncJobStatus;
}

/**
 * `api.get` already unwraps the `{ success, data }` envelope, so the sync
 * status endpoint resolves to the status object itself.
 */
export type AttendanceSyncStatusResponse = AttendanceSyncStatus;

// ─── Sync Runs ───────────────────────────────────────────────────────────────

export type SyncRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'PARTIAL';

export interface AttendanceSyncRun {
  id: string;
  jobName: string;
  status: SyncRunStatus;
  startDate: string;
  endDate: string;
  totalFetched: number;
  totalUpserted: number;
  mappedCount: number;
  unmappedCount: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  triggeredBy: string | null;
}

export interface AttendanceSyncRunsResponse {
  data: AttendanceSyncRun[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ─── Manual Sync ─────────────────────────────────────────────────────────────

export interface ManualSyncResponse {
  data: {
    syncRunId: string;
    jobName: string;
    status: SyncRunStatus;
    totalFetched: number;
    totalUpserted: number;
    mappedCount: number;
    unmappedCount: number;
    errorMessage?: string;
    departmentIds?: number[];
  };
}

// ─── Filter Params ────────────────────────────────────────────────────────────

export interface AttendanceDailyFilterParams {
  search?: string;
  date?: string;
  from?: string;
  to?: string;
  empCode?: string;
  employeeId?: string;
  biotimeDepartmentId?: number;
  deptName?: string;
  status?: string;
  mappingStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface SyncRunsFilterParams {
  jobName?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ─── BioTime Departments ───────────────────────────────────────────────────────

export interface BioTimeDepartment {
  id: string;
  biotimeDepartmentId: number;
  name: string;
  parentId: number | null;
  level: number;
  path: string | null;
  isLeaf: boolean;
  isActive: boolean;
  syncedAt: string;
}

export interface BioTimeDepartmentsResponse {
  data: BioTimeDepartment[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface BioTimeDepartmentSyncResponse {
  data: {
    total: number;
    upserted: number;
  };
}
