import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adjustTimesheetDay,
  getTimesheetGrid,
  recomputeTimesheet,
} from './timesheetApi';
import type {
  AdjustTimesheetDayPayload,
  RecomputePayload,
  TimesheetGridQuery,
} from './timesheetTypes';

export const timesheetKeys = {
  all: ['timesheet'] as const,
  grid: (query: TimesheetGridQuery) => ['timesheet', 'grid', query] as const,
};

export function useTimesheetGrid(query: TimesheetGridQuery) {
  return useQuery({
    queryKey: timesheetKeys.grid(query),
    queryFn: () => getTimesheetGrid(query),
    staleTime: 30_000,
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}
