import { api } from '../../shared/api/httpClient';
import type {
  AdjustTimesheetDayPayload,
  RecomputePayload,
  RecomputeResult,
  OpenTimesheetPeriodPayload,
  ReopenTimesheetPeriodPayload,
  TimesheetGrid,
  TimesheetGridQuery,
  TimesheetConfirmation,
  TimesheetPeriod,
} from './timesheetTypes';

const BASE = '/attendance/timesheet';
const PERIOD_BASE = '/timesheet/periods';

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
  await api.download(
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
): Promise<RecomputeResult> {
  return api.post<RecomputeResult>(`${BASE}/recompute`, payload);
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

export async function reopenTimesheetPeriod(
  id: string,
  payload: ReopenTimesheetPeriodPayload,
): Promise<TimesheetPeriod> {
  return api.post<TimesheetPeriod>(`${PERIOD_BASE}/${id}/reopen`, payload);
}
