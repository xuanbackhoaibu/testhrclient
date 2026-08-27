import { compareRowOrder } from "./rowOrderCompare";
import type { TimesheetGridRow } from "./timesheetTypes";

type AttendanceIdentity = Pick<
  TimesheetGridRow,
  "attendanceCode" | "employeeCode" | "rowOrder"
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
 * Giữ thứ tự lưới BCC khớp đúng file Excel. Quy tắc thật nằm ở compareRowOrder
 * — dùng chung với màn Phân ca để ba nơi không bao giờ xếp khác nhau.
 */
export function compareAttendanceIdentity(
  left: AttendanceIdentity,
  right: AttendanceIdentity,
): number {
  return compareRowOrder(left, right);
}
