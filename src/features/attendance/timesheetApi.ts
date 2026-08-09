import { api } from '../../shared/api/httpClient';
import type {
  AdjustTimesheetDayPayload,
  RecomputePayload,
  RecomputeResult,
  TimesheetGrid,
  TimesheetGridQuery,
} from './timesheetTypes';

const BASE = '/attendance/timesheet';

export async function getTimesheetGrid(
  query: TimesheetGridQuery,
): Promise<TimesheetGrid> {
  return api.get<TimesheetGrid>(`${BASE}/grid`, { params: query });
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
