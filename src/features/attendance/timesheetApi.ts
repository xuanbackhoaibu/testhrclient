import { api } from '../../shared/api/httpClient';
import type {
  AdjustTimesheetDayPayload,
  AttendanceRowOrder,
  MoveAttendanceRowPayload,
  RecomputePayload,
  RecomputeResult,
  TimesheetRecomputeJob,
  SetAutoFullAttendancePayload,
  SetAutoFullAttendanceResult,
  InitializeMonthlyTimesheetRosterPayload,
  MonthlyTimesheetRosterQuery,
  MonthlyTimesheetRosterResult,
  OpenTimesheetPeriodPayload,
  ReopenTimesheetPeriodPayload,
  TimesheetGrid,
  TimesheetGridQuery,
  TimesheetConfirmation,
  TimesheetPeriod,
  UpdateMonthlyTimesheetRosterMembersPayload,
  UpdateTimesheetPeriodPayload,
} from './timesheetTypes';
import { longRunningAttendanceMutationConfig } from './longRunningMutation';

const BASE = '/attendance/timesheet';
const RECOMPUTE_JOB_BASE = `${BASE}/recompute-jobs`;
const PERIOD_BASE = '/timesheet/periods';
const MONTHLY_ROSTER_BASE = '/attendance/monthly-timesheet-roster';

/** API nhận các bộ lọc nhiều lựa chọn dạng CSV để Nest xử lý ổn định ở cả
 * proxy và query parser khác nhau (tránh phụ thuộc departmentIds[]=...). */
function timesheetParams(query: TimesheetGridQuery): Record<string, unknown> {
  return {
    ...query,
    departmentIds: query.departmentIds?.length
      ? query.departmentIds.join(',')
      : undefined,
    unitIds: query.unitIds?.length ? query.unitIds.join(',') : undefined,
  };
}

export async function getTimesheetGrid(
  query: TimesheetGridQuery,
): Promise<TimesheetGrid> {
  return api.get<TimesheetGrid>(`${BASE}/grid`, { params: timesheetParams(query) });
}

export async function downloadTimesheetGridExport(
  query: TimesheetGridQuery,
): Promise<void> {
  return api.download(
    `${BASE}/export`,
    `bang-cham-cong-${query.year}-${String(query.month).padStart(2, '0')}.xlsx`,
    timesheetParams(query),
  );
}

export async function adjustTimesheetDay(
  id: string,
  payload: AdjustTimesheetDayPayload,
): Promise<unknown> {
  return api.patch(`${BASE}/days/${id}/adjust`, payload);
}

export async function recomputeTimesheet(
  payload: RecomputePayload,
  signal?: AbortSignal,
): Promise<RecomputeResult> {
  return api.post<RecomputeResult>(
    `${BASE}/recompute`,
    payload,
    signal
      ? { ...longRunningAttendanceMutationConfig, signal }
      : longRunningAttendanceMutationConfig,
  );
}

export async function startTimesheetRecomputeJob(
  payload: RecomputePayload,
): Promise<TimesheetRecomputeJob> {
  return api.post<TimesheetRecomputeJob>(
    RECOMPUTE_JOB_BASE,
    payload,
    longRunningAttendanceMutationConfig,
  );
}

export async function getTimesheetRecomputeJob(
  id: string,
  signal?: AbortSignal,
): Promise<TimesheetRecomputeJob> {
  return api.get<TimesheetRecomputeJob>(
    `${RECOMPUTE_JOB_BASE}/${id}`,
    signal ? { signal } : undefined,
  );
}

export async function cancelTimesheetRecomputeJob(
  id: string,
): Promise<TimesheetRecomputeJob> {
  return api.post<TimesheetRecomputeJob>(
    `${RECOMPUTE_JOB_BASE}/${id}/cancel`,
  );
}

export async function setAutoFullAttendance(
  employeeId: string,
  payload: SetAutoFullAttendancePayload,
): Promise<SetAutoFullAttendanceResult> {
  return api.patch<SetAutoFullAttendanceResult>(
    `${BASE}/employees/${employeeId}/auto-full-attendance`,
    payload,
  );
}

export async function getMonthlyTimesheetRoster(
  query: MonthlyTimesheetRosterQuery,
): Promise<MonthlyTimesheetRosterResult> {
  return api.get<MonthlyTimesheetRosterResult>(MONTHLY_ROSTER_BASE, {
    params: query,
  });
}

export async function initializeMonthlyTimesheetRoster(
  payload: InitializeMonthlyTimesheetRosterPayload,
): Promise<MonthlyTimesheetRosterResult> {
  return api.post<MonthlyTimesheetRosterResult>(
    `${MONTHLY_ROSTER_BASE}/initialize`,
    payload,
  );
}

export async function updateMonthlyTimesheetRosterMembers(
  id: string,
  payload: UpdateMonthlyTimesheetRosterMembersPayload,
): Promise<MonthlyTimesheetRosterResult> {
  return api.patch<MonthlyTimesheetRosterResult>(
    `${MONTHLY_ROSTER_BASE}/${id}/members`,
    payload,
  );
}

export async function listTimesheetPeriods(year: number): Promise<TimesheetPeriod[]> {
  return api.get<TimesheetPeriod[]>(PERIOD_BASE, { params: { year } });
}

export async function listTimesheetConfirmations(
  periodId: string,
): Promise<TimesheetConfirmation[]> {
  return api.get<TimesheetConfirmation[]>(`${PERIOD_BASE}/${periodId}/confirmations`);
}

export async function downloadTimesheetPeriodExport(period: TimesheetPeriod): Promise<void> {
  await api.download(
    `${PERIOD_BASE}/${period.id}/export`,
    `timesheet-confirmations-${period.year}-${String(period.month).padStart(2, '0')}.xlsx`,
  );
}

export async function openTimesheetPeriod(
  payload: OpenTimesheetPeriodPayload,
): Promise<TimesheetPeriod> {
  return api.post<TimesheetPeriod>(`${PERIOD_BASE}/open`, payload);
}

export async function closeTimesheetPeriod(id: string): Promise<TimesheetPeriod> {
  return api.post<TimesheetPeriod>(`${PERIOD_BASE}/${id}/close`);
}

const ROW_ORDER_BASE = '/attendance/row-order/departments';

export async function getAttendanceRowOrder(
  departmentId: string,
): Promise<AttendanceRowOrder> {
  return api.get<AttendanceRowOrder>(`${ROW_ORDER_BASE}/${departmentId}`);
}

export async function moveAttendanceRow(
  departmentId: string,
  payload: MoveAttendanceRowPayload,
): Promise<AttendanceRowOrder> {
  return api.patch<AttendanceRowOrder>(
    `${ROW_ORDER_BASE}/${departmentId}/move`,
    payload,
  );
}

export async function resetAttendanceRowOrder(
  departmentId: string,
): Promise<AttendanceRowOrder> {
  return api.delete<AttendanceRowOrder>(`${ROW_ORDER_BASE}/${departmentId}`);
}

export async function updateTimesheetPeriod(
  id: string,
  payload: UpdateTimesheetPeriodPayload,
): Promise<TimesheetPeriod> {
  return api.patch<TimesheetPeriod>(`${PERIOD_BASE}/${id}`, payload);
}

export async function deleteTimesheetPeriod(
  id: string,
): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`${PERIOD_BASE}/${id}`);
}

export async function reopenTimesheetPeriod(
  id: string,
  payload: ReopenTimesheetPeriodPayload,
): Promise<TimesheetPeriod> {
  return api.post<TimesheetPeriod>(`${PERIOD_BASE}/${id}/reopen`, payload);
}
