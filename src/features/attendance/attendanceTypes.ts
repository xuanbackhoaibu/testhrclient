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

export type MappingStatus = 'MAPPED' | 'AUTO_MAPPED' | 'UNMAPPED';

export type SyncStatusValue = 'SUCCESS' | 'FAILED';

export interface AttendanceDailyRecord {
  id: string;
  empCode: string;
  employeeId: string | null;
  employeeCode: string | null;
  fullName: string | null;
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
}

// ─── Sync Status ─────────────────────────────────────────────────────────────

export interface SyncJobStatus {
  isRunning: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  totalSynced: number;
}

export interface AttendanceSyncStatus {
  dailyToday: SyncJobStatus;
  nightly7Days: SyncJobStatus;
  manualSync: SyncJobStatus;
}

export interface AttendanceSyncStatusResponse {
  data: AttendanceSyncStatus;
}

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
  };
}

// ─── Filter Params ────────────────────────────────────────────────────────────

export interface AttendanceDailyFilterParams {
  date?: string;
  from?: string;
  to?: string;
  empCode?: string;
  employeeId?: string;
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
