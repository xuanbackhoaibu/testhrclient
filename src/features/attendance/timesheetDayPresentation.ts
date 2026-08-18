import type { TimesheetGridDay } from "./timesheetTypes";
import { isWeeklyTemplateAssignmentSource } from "./shiftAssignmentWeekdays";

type AttendanceEventDay = Pick<
  TimesheetGridDay,
  | "displaySymbol"
  | "firstPunch"
  | "lastPunch"
  | "isWorkingDay"
  | "needsExplanation"
  | "source"
  | "totalMinutes"

>;

/** A template OFF is an explicit rest day, never an unassigned schedule. */
export function isWeeklyTemplateOffDay(
  day: Pick<TimesheetGridDay, "isWorkingDay" | "source"> | undefined,
): boolean {
  return Boolean(
    day &&
      isWeeklyTemplateAssignmentSource(day.source ?? "") &&
      !day.isWorkingDay,
  );
}

/** A question mark is meaningful only when there was a real attendance event. */
export function hasTimesheetAttendanceEvent(
  day: AttendanceEventDay | undefined,
): boolean {
  return Boolean(
    day?.firstPunch ||
      day?.lastPunch ||
      typeof day?.totalMinutes === "number",
  );
}

/** Keep the BCC grid's cell text aligned with the Excel exporter. */
export function timesheetDayDisplayValue(
  day: AttendanceEventDay | undefined,
): string {
  const symbol = day?.displaySymbol || "";
  if (symbol) return symbol;
  // A default-full decision is an explicit HR outcome. Older responses may
  // omit its redundant displaySymbol, but must still render the same `+`
  // used by the BCC and Excel contract. Do not infer a symbol for UNASSIGNED.
  if (day?.source === "DEFAULT_FULL_ATTENDANCE") return "+";
  return day?.needsExplanation && hasTimesheetAttendanceEvent(day) ? "?" : "";
}

export interface TimesheetDataGapCounts {
  /** Ô chưa có dữ liệu từ máy chấm công. Ca vẫn đã phân. */
  missingAttendance: number;
  /** Ô có chấm công nhưng chưa đủ căn cứ tính đủ công. */
  awaitingExplanation: number;
  /** Ô thật sự chưa phân ca — nhóm duy nhất cần sửa ở màn Phân ca. */
  unassigned: number;
}

export interface TimesheetDataGapDay {
  day: number;
  source?: string;
  needsExplanation?: boolean;
  firstPunch?: string | null;
  lastPunch?: string | null;
  totalMinutes?: number | null;
}

/**
 * Đếm vì sao các ô trên bảng công chưa có công, tách theo nguyên nhân.
 *
 * HR nhìn ô trống rất dễ kết luận "phân ca sai", trong khi phần lớn là thiếu
 * dữ liệu chấm công hoặc đang chờ giải trình — hai việc không sửa được ở màn
 * Phân ca. Tách ba nhóm để chỉ đúng nhóm `unassigned` mới dẫn HR về Phân ca.
 *
 * Bỏ qua ngày trong tương lai: chưa tới thì chưa thể có chấm công, đếm vào sẽ
 * báo động giả suốt nửa tháng cuối.
 */
export function countTimesheetDataGaps(
  rows: readonly { days?: readonly TimesheetDayGapInput[] }[],
  today: { year: number; month: number; day: number },
  gridPeriod: { year: number; month: number },
): TimesheetDataGapCounts {
  const isCurrentMonth =
    gridPeriod.year === today.year && gridPeriod.month === today.month;
  const isFuturePeriod =
    gridPeriod.year > today.year ||
    (gridPeriod.year === today.year && gridPeriod.month > today.month);
  if (isFuturePeriod) {
    return { missingAttendance: 0, awaitingExplanation: 0, unassigned: 0 };
  }

  let missingAttendance = 0;
  let awaitingExplanation = 0;
  let unassigned = 0;
  for (const row of rows) {
    for (const day of row.days ?? []) {
      if (isCurrentMonth && day.day > today.day) continue;
      if (day.source === "UNASSIGNED") {
        unassigned += 1;
        continue;
      }
      const hasEvent = hasTimesheetAttendanceEvent(day);
      if (day.source === "MISSING" && !hasEvent) {
        missingAttendance += 1;
        continue;
      }
      if (day.needsExplanation && hasEvent) {
        awaitingExplanation += 1;
      }
    }
  }
  return { missingAttendance, awaitingExplanation, unassigned };
}

type TimesheetDayGapInput = TimesheetDataGapDay & AttendanceEventDay;
