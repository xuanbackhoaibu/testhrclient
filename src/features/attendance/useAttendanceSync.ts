import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AttendanceDailyFilterParams } from './attendanceTypes';
import {
  listAttendanceDailyRecords,
  getAttendanceSyncStatus,
  listAttendanceSyncRuns,
  manualAttendanceSync,
} from './attendanceApi';

// ─── Daily Records ─────────────────────────────────────────────────────────────

export function useAttendanceDailyRecords(params: AttendanceDailyFilterParams = {}) {
  return useQuery({
    queryKey: ['attendance-daily', params],
    queryFn: () => listAttendanceDailyRecords(params),
    staleTime: 30_000,
  });
}

// ─── Sync Status ───────────────────────────────────────────────────────────────

export function useAttendanceSyncStatus() {
  return useQuery({
    queryKey: ['attendance-sync-status'],
    queryFn: getAttendanceSyncStatus,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// ─── Sync Runs ─────────────────────────────────────────────────────────────────

export function useAttendanceSyncRuns(params: Parameters<typeof listAttendanceSyncRuns>[0] = {}) {
  return useQuery({
    queryKey: ['attendance-sync-runs', params],
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
      void queryClient.invalidateQueries({ queryKey: ['attendance-daily'] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-sync-runs'] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-sync-status'] });
    },
  });
}
