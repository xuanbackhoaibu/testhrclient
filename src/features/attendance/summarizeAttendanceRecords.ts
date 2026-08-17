import type { AttendanceDailyRecord, AttendanceSummary } from './attendanceTypes';

const EMPTY_SUMMARY: AttendanceSummary = {
  total: 0,
  present: 0,
  late: 0,
  absent: 0,
  singlePunch: 0,
  unknown: 0,
  mapped: 0,
  autoMapped: 0,
  unmapped: 0,
  conflict: 0,
};

/**
 * Counts attendance statuses for a set of records.
 *
 * `GET /attendance/daily` returns only `items` and `pagination`, so the screen
 * derives its own counters from the records it received. The figures therefore
 * describe the current page, not every record matching the filter.
 */
export function summarizeAttendanceRecords(
  records: AttendanceDailyRecord[],
): AttendanceSummary {
  const summary: AttendanceSummary = { ...EMPTY_SUMMARY, total: records.length };

  for (const record of records) {
    switch (record.status) {
      case 'PRESENT':
        summary.present += 1;
        break;
      case 'LATE':
        summary.late += 1;
        break;
      case 'ABSENT':
        summary.absent += 1;
        break;
      case 'SINGLE_PUNCH':
        summary.singlePunch += 1;
        break;
      default:
        summary.unknown += 1;
        break;
    }

    switch (record.mappingStatus) {
      case 'MAPPED':
        summary.mapped += 1;
        break;
      case 'AUTO_MAPPED':
        summary.autoMapped += 1;
        break;
      case 'CONFLICT':
        summary.conflict += 1;
        break;
      default:
        summary.unmapped += 1;
        break;
    }
  }

  return summary;
}
