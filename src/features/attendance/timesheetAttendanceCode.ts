import type { TimesheetGridRow } from "./timesheetTypes";

type AttendanceIdentity = Pick<
  TimesheetGridRow,
  "attendanceCode" | "employeeCode"
>;

function normalizedAttendanceCode(
  value: string | null | undefined,
): string | null {
  const code = value?.trim();
  return code ? code : null;
}

/**
 * BCC uses the raw BioTime/MCB code. The HR employee code must never be used
 * as a visual fallback because it is a different identity and may look valid.
 */
export function formatAttendanceCode(value: string | null | undefined): string {
  return normalizedAttendanceCode(value) ?? "—";
}

/**
 * Keeps grid order deterministic and identical to the workbook contract:
 * mapped raw MCB/BioTime codes first, numeric-natural order, missing codes last.
 * employeeCode is deliberately a hidden tie-breaker only.
 */
export function compareAttendanceIdentity(
  left: AttendanceIdentity,
  right: AttendanceIdentity,
): number {
  const leftCode = normalizedAttendanceCode(left.attendanceCode);
  const rightCode = normalizedAttendanceCode(right.attendanceCode);

  if (leftCode && rightCode) {
    const byAttendanceCode = leftCode.localeCompare(rightCode, "vi", {
      numeric: true,
      sensitivity: "base",
    });
    if (byAttendanceCode !== 0) return byAttendanceCode;
  } else if (leftCode) {
    return -1;
  } else if (rightCode) {
    return 1;
  }

  return left.employeeCode.localeCompare(right.employeeCode, "vi", {
    numeric: true,
    sensitivity: "base",
  });
}
