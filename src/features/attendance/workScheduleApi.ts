import { api } from '../../shared/api/httpClient';
import type {
  CloneHolidaysPayload,
  CloneHolidaysResult,
  Holiday,
  HolidayPayload,
  ShiftAssignment,
  ShiftAssignmentPayload,
  WorkCalendarDay,
  WorkCalendarDayPayload,
  WorkShift,
  WorkShiftPayload,
} from './workScheduleTypes';

/**
 * Cấu hình ca / ngày lễ / phân ca / lịch tuần.
 * Backend: hr-api-service /attendance/work-schedule/*
 *
 * Không có mock mode: đây là cấu hình vận hành thật, chạy với backend thật.
 * Envelope đã được unwrap ở httpClient nên nhận thẳng data.
 */

const BASE = '/attendance/work-schedule';

// ─── Ca làm việc ──────────────────────────────────────────────────────────────

export async function listWorkShifts(): Promise<WorkShift[]> {
  return api.get<WorkShift[]>(`${BASE}/shifts`);
}

export async function createWorkShift(payload: WorkShiftPayload): Promise<WorkShift> {
  return api.post<WorkShift>(`${BASE}/shifts`, payload);
}

export async function updateWorkShift(
  id: string,
  payload: Partial<WorkShiftPayload>,
): Promise<WorkShift> {
  return api.patch<WorkShift>(`${BASE}/shifts/${id}`, payload);
}

// ─── Ngày lễ ──────────────────────────────────────────────────────────────────

export async function listHolidays(year: number): Promise<Holiday[]> {
  return api.get<Holiday[]>(`${BASE}/holidays`, { params: { year } });
}

export async function createHoliday(payload: HolidayPayload): Promise<Holiday> {
  return api.post<Holiday>(`${BASE}/holidays`, payload);
}

export async function deleteHoliday(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`${BASE}/holidays/${id}`);
}

export async function cloneHolidays(
  payload: CloneHolidaysPayload,
): Promise<CloneHolidaysResult> {
  return api.post<CloneHolidaysResult>(`${BASE}/holidays/clone`, payload);
}

// ─── Phân ca ──────────────────────────────────────────────────────────────────

export async function listShiftAssignments(params: {
  employeeId?: string;
  departmentId?: string;
  unitId?: string;
} = {}): Promise<ShiftAssignment[]> {
  return api.get<ShiftAssignment[]>(`${BASE}/assignments`, { params });
}

export async function createShiftAssignment(
  payload: ShiftAssignmentPayload,
): Promise<ShiftAssignment> {
  return api.post<ShiftAssignment>(`${BASE}/assignments`, payload);
}

export async function endShiftAssignment(id: string): Promise<ShiftAssignment> {
  return api.patch<ShiftAssignment>(`${BASE}/assignments/${id}/end`, {});
}

// ─── Lịch tuần ────────────────────────────────────────────────────────────────

export async function getWorkCalendar(): Promise<WorkCalendarDay[]> {
  return api.get<WorkCalendarDay[]>(`${BASE}/calendar`);
}

export async function updateWorkCalendarDay(
  payload: WorkCalendarDayPayload,
): Promise<WorkCalendarDay> {
  return api.put<WorkCalendarDay>(`${BASE}/calendar/day`, payload);
}
