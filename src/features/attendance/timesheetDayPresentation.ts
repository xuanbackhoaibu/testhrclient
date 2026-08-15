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
