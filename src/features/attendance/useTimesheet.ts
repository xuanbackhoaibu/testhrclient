import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adjustTimesheetDay,
  closeTimesheetPeriod,
  getTimesheetGrid,
  listTimesheetConfirmations,
  listTimesheetPeriods,
  openTimesheetPeriod,
  recomputeTimesheet,
  reopenTimesheetPeriod,
  setAutoFullAttendance,
} from './timesheetApi';
import type {
  AdjustTimesheetDayPayload,
  OpenTimesheetPeriodPayload,
  RecomputePayload,
  ReopenTimesheetPeriodPayload,
  SetAutoFullAttendancePayload,
  TimesheetGridQuery,
} from './timesheetTypes';

export const timesheetKeys = {
  all: ['timesheet'] as const,
  grid: (query: TimesheetGridQuery) => ['timesheet', 'grid', query] as const,
  periods: (year: number) => ['timesheet', 'periods', year] as const,
  confirmations: (periodId: string | null) =>
    ['timesheet', 'period-confirmations', periodId] as const,
};

export function useTimesheetGrid(query: TimesheetGridQuery) {
  return useQuery({
    queryKey: timesheetKeys.grid(query),
    queryFn: () => getTimesheetGrid(query),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdjustTimesheetDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdjustTimesheetDayPayload }) =>
      adjustTimesheetDay(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}

export function useRecomputeTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecomputePayload) => recomputeTimesheet(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all }),
  });
}

export function useSetAutoFullAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      payload,
    }: {
      employeeId: string;
      payload: SetAutoFullAttendancePayload;
    }) => setAutoFullAttendance(employeeId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}

export function useTimesheetPeriods(year: number) {
  return useQuery({
    queryKey: timesheetKeys.periods(year),
    queryFn: () => listTimesheetPeriods(year),
    staleTime: 30_000,
  });
}

export function useTimesheetConfirmations(periodId: string | null) {
  return useQuery({
    queryKey: timesheetKeys.confirmations(periodId),
    queryFn: () => listTimesheetConfirmations(periodId ?? ''),
    enabled: Boolean(periodId),
    staleTime: 15_000,
  });
}

export function useOpenTimesheetPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OpenTimesheetPeriodPayload) => openTimesheetPeriod(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}

export function useCloseTimesheetPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeTimesheetPeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}

export function useReopenTimesheetPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ReopenTimesheetPeriodPayload;
    }) => reopenTimesheetPeriod(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}
