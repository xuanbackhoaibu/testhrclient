import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { markTimesheetMonthStale } from "./timesheetStaleMonths";

import {
  applyWeeklyShiftTemplate,
  bulkAssignShifts,
  cancelShiftAssignmentDay,
  cancelWeeklyShiftAssignments,
  cloneHolidays,
  createHoliday,
  createShiftAssignment,
  createWorkShift,
  createWeeklyShiftTemplate,
  deleteHoliday,
  deleteWorkShift,
  deleteWeeklyShiftTemplate,
  endShiftAssignment,
  getShiftAssignmentGrid,
  getWorkCalendar,
  includeShiftAssignmentRowsInTimesheet,
  listHolidays,
  listShiftAssignments,
  listWorkShifts,
  listWeeklyShiftTemplates,
  listWeeklyShiftAssignments,
  replaceShiftAssignmentDay,
  updateWorkCalendarDay,
  updateShiftAssignmentWeekdays,
  updateWorkShift,
  updateWeeklyShiftTemplate,
} from "./workScheduleApi";
import type {
  ApplyWeeklyShiftTemplatePayload,
  BulkShiftAssignmentPayload,
  CancelShiftAssignmentDayPayload,
  CancelWeeklyShiftAssignmentsPayload,
  CloneHolidaysPayload,
  HolidayPayload,
  IncludeShiftAssignmentRowsInTimesheetPayload,
  ReplaceShiftAssignmentDayPayload,
  ShiftAssignmentGridQuery,
  ShiftAssignmentPayload,
  UpdateShiftAssignmentWeekdaysPayload,
  WorkCalendarDayPayload,
  WorkShiftPayload,
  WeeklyShiftTemplatePayload,
  WeeklyShiftAssignmentQuery,
} from "./workScheduleTypes";

export const workScheduleKeys = {
  all: ["work-schedule"] as const,
  shifts: () => ["work-schedule", "shifts"] as const,
  holidays: (year: number) => ["work-schedule", "holidays", year] as const,
  assignments: (params?: Record<string, string | undefined>) =>
    ["work-schedule", "assignments", params] as const,
  assignmentGrid: (query: ShiftAssignmentGridQuery | null) =>
    ["work-schedule", "assignment-grid", query] as const,
  weeklyShifts: () => ["work-schedule", "weekly-shifts"] as const,
  weeklyShiftAssignments: (params: WeeklyShiftAssignmentQuery) => ["work-schedule", "weekly-shifts", "assignments", params] as const,
  calendar: () => ["work-schedule", "calendar"] as const,
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
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<WorkShiftPayload>;
    }) => updateWorkShift(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}

export function useDeleteWorkShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkShift(id),
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

export function useShiftAssignments(
  params: {
    employeeId?: string;
    departmentId?: string;
    unitId?: string;
  } = {},
) {
  return useQuery({
    queryKey: workScheduleKeys.assignments(params),
    queryFn: () => listShiftAssignments(params),
    staleTime: 30_000,
  });
}

export function useCreateShiftAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ShiftAssignmentPayload) =>
      createShiftAssignment(payload),
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

export function useUpdateShiftAssignmentWeekdays() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateShiftAssignmentWeekdaysPayload;
    }) => updateShiftAssignmentWeekdays(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["timesheet"] });
    },
  });
}

export function useShiftAssignmentGrid(query: ShiftAssignmentGridQuery | null) {
  return useQuery({
    queryKey: workScheduleKeys.assignmentGrid(query),
    queryFn: () => getShiftAssignmentGrid(query!),
    enabled: Boolean(query),
    staleTime: 30_000,
  });
}

export function useBulkAssignShifts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkShiftAssignmentPayload) =>
      bulkAssignShifts(payload),
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
      // Lịch ca đổi thì bảng công đã tính của kỳ này thành cũ, kể cả khi lần
      // này không đưa ai vào BCC — người đã ở trong BCC vẫn đổi ca.
      markTimesheetMonthStale(payload);
      if (payload.includeInTimesheet) {
        void queryClient.invalidateQueries({ queryKey: ["timesheet"] });
      }
    },
  });
}

/** Cancels one direct employee day while preserving whether the employee is in BCC. */
export function useCancelShiftAssignmentDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CancelShiftAssignmentDayPayload) =>
      cancelShiftAssignmentDay(payload),
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["timesheet"] });
      markTimesheetMonthStale(payload);
    },
  });
}

/** Replaces one planned day while preserving whether the employee is in BCC. */
export function useReplaceShiftAssignmentDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReplaceShiftAssignmentDayPayload) =>
      replaceShiftAssignmentDay(payload),
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["timesheet"] });
      markTimesheetMonthStale(payload);
    },
  });
}

export function useIncludeShiftAssignmentRowsInTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: IncludeShiftAssignmentRowsInTimesheetPayload) =>
      includeShiftAssignmentRowsInTimesheet(payload),
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["timesheet"] });
      markTimesheetMonthStale(payload);
    },
  });
}

// ─── Ca tuần ─────────────────────────────────────────────────────────────────

export function useWeeklyShiftTemplates() {
  return useQuery({
    queryKey: workScheduleKeys.weeklyShifts(),
    queryFn: listWeeklyShiftTemplates,
    staleTime: 30_000,
  });
}

export function useCreateWeeklyShiftTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WeeklyShiftTemplatePayload) =>
      createWeeklyShiftTemplate(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}

export function useUpdateWeeklyShiftTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<WeeklyShiftTemplatePayload>;
    }) => updateWeeklyShiftTemplate(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}

export function useDeleteWeeklyShiftTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWeeklyShiftTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}

export function useApplyWeeklyShiftTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyWeeklyShiftTemplatePayload) =>
      applyWeeklyShiftTemplate(payload),
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["timesheet"] });
      markTimesheetMonthStale(payload);
    },
  });
}

export function useWeeklyShiftAssignments(
  params: WeeklyShiftAssignmentQuery = {},
) {
  return useQuery({
    queryKey: workScheduleKeys.weeklyShiftAssignments(params),
    queryFn: () => listWeeklyShiftAssignments(params),
    staleTime: 30_000,
  });
}

export function useCancelWeeklyShiftAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CancelWeeklyShiftAssignmentsPayload) =>
      cancelWeeklyShiftAssignments(payload),
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["timesheet"] });
      markTimesheetMonthStale(payload);
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
    mutationFn: (payload: WorkCalendarDayPayload) =>
      updateWorkCalendarDay(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workScheduleKeys.all });
    },
  });
}
