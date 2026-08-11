import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cloneHolidays,
  createHoliday,
  createShiftAssignment,
  createWorkShift,
  deleteHoliday,
  endShiftAssignment,
  getWorkCalendar,
  listHolidays,
  listShiftAssignments,
  listWorkShifts,
  updateWorkCalendarDay,
  updateWorkShift,
} from './workScheduleApi';
import type {
  CloneHolidaysPayload,
  HolidayPayload,
  ShiftAssignmentPayload,
  WorkCalendarDayPayload,
  WorkShiftPayload,
} from './workScheduleTypes';

export const workScheduleKeys = {
  all: ['work-schedule'] as const,
  shifts: () => ['work-schedule', 'shifts'] as const,
  holidays: (year: number) => ['work-schedule', 'holidays', year] as const,
  assignments: (params?: Record<string, string | undefined>) =>
    ['work-schedule', 'assignments', params] as const,
  calendar: () => ['work-schedule', 'calendar'] as const,
};

// ─── Ca làm việc ──────────────────────────────────────────────────────────────

export function useWorkShifts() {
  return useQuery({
    queryKey: workScheduleKeys.shifts(),
    queryFn: listWorkShifts,
    staleTime: 60_000,
  });
}

export function useCreateWorkShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkShiftPayload) => createWorkShift(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}

export function useUpdateWorkShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<WorkShiftPayload> }) =>
      updateWorkShift(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}

// ─── Ngày lễ ──────────────────────────────────────────────────────────────────

export function useHolidays(year: number) {
  return useQuery({
    queryKey: workScheduleKeys.holidays(year),
    queryFn: () => listHolidays(year),
    staleTime: 60_000,
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: HolidayPayload) => createHoliday(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}

export function useCloneHolidays() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CloneHolidaysPayload) => cloneHolidays(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}

// ─── Phân ca ──────────────────────────────────────────────────────────────────

export function useShiftAssignments(params: {
  employeeId?: string;
  departmentId?: string;
  unitId?: string;
} = {}) {
  return useQuery({
    queryKey: workScheduleKeys.assignments(params),
    queryFn: () => listShiftAssignments(params),
    staleTime: 30_000,
  });
}

export function useCreateShiftAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ShiftAssignmentPayload) => createShiftAssignment(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}

export function useEndShiftAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => endShiftAssignment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}

// ─── Lịch tuần ────────────────────────────────────────────────────────────────

export function useWorkCalendar() {
  return useQuery({
    queryKey: workScheduleKeys.calendar(),
    queryFn: getWorkCalendar,
    staleTime: 60_000,
  });
}

export function useUpdateWorkCalendarDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkCalendarDayPayload) => updateWorkCalendarDay(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}
