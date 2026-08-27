import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AttendanceDailyFilterParams, SyncRunsFilterParams } from './attendanceTypes';
import {
  listAttendanceDailyRecords,
  getAttendanceSyncStatus,
  listAttendanceSyncRuns,
  manualAttendanceSync,
  listBioTimeDepartments,
  syncBioTimeDepartments,
  getAttendanceMappingStats,
  getUnmappedAttendance,
  mapAttendanceEmployee,
  remapAttendance,
} from './attendanceApi';

// ─── Query Key Factories ──────────────────────────────────────────────────────

export const attendanceKeys = {
  all: ['attendance'] as const,
  daily: (params?: AttendanceDailyFilterParams) =>
    ['attendance-daily', params] as const,
  status: () => ['attendance-sync-status'] as const,
  runs: (params?: SyncRunsFilterParams) =>
    ['attendance-sync-runs', params] as const,
  departments: (params?: { isActive?: boolean; isLeaf?: boolean; keyword?: string }) =>
    ['attendance-departments', params] as const,
  mappingStats: () => ['attendance-mapping-stats'] as const,
  mappingUnmapped: (page: number, search: string) =>
    ['attendance-mapping', page, search] as const,
};

// ─── Daily Records ─────────────────────────────────────────────────────────────

export function useAttendanceDailyRecords(params: AttendanceDailyFilterParams = {}) {
  return useQuery({
    queryKey: attendanceKeys.daily(params),
    queryFn: () => listAttendanceDailyRecords(params),
    staleTime: 30_000,
  });
}

// ─── Sync Status ───────────────────────────────────────────────────────────────

export function useAttendanceSyncStatus() {
  return useQuery({
    queryKey: attendanceKeys.status(),
    queryFn: getAttendanceSyncStatus,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// ─── Sync Runs ─────────────────────────────────────────────────────────────────

export function useAttendanceSyncRuns(params: SyncRunsFilterParams = {}) {
  return useQuery({
    queryKey: attendanceKeys.runs(params),
    queryFn: () => listAttendanceSyncRuns(params),
    staleTime: 10_000,
  });
}

// ─── Manual Sync ───────────────────────────────────────────────────────────────

export function useManualAttendanceSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { startDate?: string; endDate?: string; refreshDepartments?: boolean }) =>
      manualAttendanceSync(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}

// ─── BioTime Departments ─────────────────────────────────────────────────────

export function useBioTimeDepartments(params: {
  isActive?: boolean;
  isLeaf?: boolean;
  keyword?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  return useQuery({
    queryKey: attendanceKeys.departments(params),
    queryFn: () => listBioTimeDepartments(params),
    staleTime: 60_000,
  });
}

export function useSyncBioTimeDepartments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncBioTimeDepartments(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.departments() });
    },
  });
}

// ─── Attendance Mapping ───────────────────────────────────────────────────────

export function useAttendanceMappingStats() {
  return useQuery({
    queryKey: attendanceKeys.mappingStats(),
    queryFn: getAttendanceMappingStats,
    staleTime: 30_000,
  });
}

export function useUnmappedAttendance(params: { page: number; search: string }) {
  return useQuery({
    queryKey: attendanceKeys.mappingUnmapped(params.page, params.search),
    queryFn: () =>
      getUnmappedAttendance({
        page: params.page,
        pageSize: 20,
        search: params.search || undefined,
      }),
    staleTime: 30_000,
  });
}

export function useMapAttendance(options?: {
  onSuccess?: (result: Awaited<ReturnType<typeof mapAttendanceEmployee>>) => void;
  onError?: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { empCode: string; employeeId: string }) =>
      mapAttendanceEmployee(payload),
    onError: options?.onError,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.mappingStats() });
      void queryClient.invalidateQueries({ queryKey: ['attendance-mapping'] });
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
      void queryClient.invalidateQueries({ queryKey: ['employee-detail'] });
      options?.onSuccess?.(result);
    },
  });
}

export function useRemapAttendance(options?: {
  onSuccess?: (result: Awaited<ReturnType<typeof remapAttendance>>) => void;
  onError?: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: { fromDate?: string; toDate?: string }) =>
      remapAttendance(payload),
    onError: options?.onError,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.mappingStats() });
      void queryClient.invalidateQueries({ queryKey: ['attendance-mapping'] });
      options?.onSuccess?.(result);
    },
  });
}
