import type { AttendanceDailyFilterParams } from './attendanceTypes';

/** Builds a normalized, unpaginated export query from the active daily query. */
export function buildAttendanceDailyExportParams(
  params: AttendanceDailyFilterParams,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([key, value]) =>
        key !== 'page' &&
        key !== 'pageSize' &&
        value !== undefined &&
        value !== '',
    ),
  );
}
