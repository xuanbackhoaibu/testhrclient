import type { TimesheetGridDay } from "./timesheetTypes";

type AttendanceEventDay = Pick<
  TimesheetGridDay,
  | "displaySymbol"
  | "firstPunch"
  | "lastPunch"
  | "needsExplanation"
  | "totalMinutes"
>;

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
  return day?.needsExplanation && hasTimesheetAttendanceEvent(day) ? "?" : "";
}
