import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { applyMove } from './rowOrderDrop';

import {
  adjustTimesheetDay,
  closeTimesheetPeriod,
  deleteTimesheetPeriod,
  getAttendanceRowOrder,
  moveAttendanceRow,
  resetAttendanceRowOrder,
  getTimesheetGrid,
  getMonthlyTimesheetRoster,
  initializeMonthlyTimesheetRoster,
  listTimesheetConfirmations,
  listTimesheetPeriods,
  openTimesheetPeriod,
  reopenTimesheetPeriod,
  setAutoFullAttendance,
  updateMonthlyTimesheetRosterMembers,
  updateTimesheetPeriod,
} from './timesheetApi';
import type {
  AdjustTimesheetDayPayload,
  AttendanceRowOrder,
  MoveAttendanceRowPayload,
  InitializeMonthlyTimesheetRosterPayload,
  MonthlyTimesheetRosterQuery,
  OpenTimesheetPeriodPayload,
  ReopenTimesheetPeriodPayload,
  SetAutoFullAttendancePayload,
  TimesheetGridQuery,
  UpdateMonthlyTimesheetRosterMembersPayload,
  UpdateTimesheetPeriodPayload,
} from './timesheetTypes';

export const timesheetKeys = {
  all: ['timesheet'] as const,
  grid: (query: TimesheetGridQuery) => ['timesheet', 'grid', query] as const,
  monthlyRoster: (query: MonthlyTimesheetRosterQuery | null) =>
    ['timesheet', 'monthly-roster', query] as const,
  periods: (year: number) => ['timesheet', 'periods', year] as const,
  rowOrder: (departmentId: string | null) =>
    ['timesheet', 'row-order', departmentId] as const,
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

export function useMonthlyTimesheetRoster(
  query: MonthlyTimesheetRosterQuery | null,
) {
  return useQuery({
    queryKey: timesheetKeys.monthlyRoster(query),
    queryFn: () => getMonthlyTimesheetRoster(query!),
    enabled: Boolean(query),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useInitializeMonthlyTimesheetRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InitializeMonthlyTimesheetRosterPayload) =>
      initializeMonthlyTimesheetRoster(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}

export function useUpdateMonthlyTimesheetRosterMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateMonthlyTimesheetRosterMembersPayload;
    }) => updateMonthlyTimesheetRosterMembers(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all }),
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

export function useAttendanceRowOrder(departmentId: string | null) {
  return useQuery({
    queryKey: timesheetKeys.rowOrder(departmentId),
    queryFn: () => getAttendanceRowOrder(departmentId!),
    enabled: Boolean(departmentId),
    staleTime: 30_000,
  });
}

/**
 * Kéo thả phải phản hồi ngay dưới ngón tay, không đợi mạng. Ghi thẳng thứ tự
 * mới vào cache trước khi gọi API; nếu server từ chối thì trả lại nguyên trạng
 * và React Query tự đồng bộ lại bằng lần refetch sau.
 */
export function useMoveAttendanceRow(departmentId: string | null) {
  const queryClient = useQueryClient();
  const key = timesheetKeys.rowOrder(departmentId);
  return useMutation({
    mutationFn: (payload: MoveAttendanceRowPayload) =>
      moveAttendanceRow(departmentId!, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AttendanceRowOrder>(key);
      if (previous) {
        const from = previous.members.findIndex(
          (member) => member.employeeId === payload.employeeId,
        );
        if (from !== -1) {
          // Dùng chung applyMove với chỗ tính toIndex, để thứ tự hiện ngay dưới
          // ngón tay trùng đúng thứ tự server trả về — lệch là danh sách nhảy.
          queryClient.setQueryData<AttendanceRowOrder>(key, {
            ...previous,
            members: applyMove(previous.members, from, payload.toIndex),
          });
        }
      }
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      // Lưới BCC và Excel đọc theo thứ tự này nên phải làm mới cùng lúc.
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}

export function useResetAttendanceRowOrder(departmentId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resetAttendanceRowOrder(departmentId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}

export function useUpdateTimesheetPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateTimesheetPeriodPayload;
    }) => updateTimesheetPeriod(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
    },
  });
}

export function useDeleteTimesheetPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTimesheetPeriod(id),
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
