import type { WorkShift } from "./workScheduleTypes";

export const ALL_ASSIGNMENT_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const MONDAY_TO_FRIDAY = [1, 2, 3, 4, 5] as const;
export const SATURDAY_ONLY = [6] as const;
export const SUNDAY_ONLY = [0] as const;

export type AssignmentWeekdayPreset =
  "all" | "weekdays" | "saturday" | "sunday" | "custom";

/** A named Ca tuần is a persisted employee schedule, not a direct day override. */
export function isWeeklyTemplateAssignmentSource(source: string): boolean {
  return (
    source === "WEEKLY_TEMPLATE_EMPLOYEE" || source === "WEEKLY_TEMPLATE"
  );
}

/**
 * A correction over any resolved source is stored as an exact employee/day
 * override. This deliberately includes an explicit Ca tuần OFF: it restores
 * the OFF when that direct-day override is later cancelled, and leaves BCC
 * membership untouched.
 */
export function requiresOneDayShiftOverride(source: string): boolean {
  return (
    source === "ASSIGNMENT_EMPLOYEE" ||
    source === "ASSIGNMENT_DEPARTMENT" ||
    source === "ASSIGNMENT_UNIT" ||
    source === "CALENDAR" ||
    isWeeklyTemplateAssignmentSource(source)
  );
}

const SHORT_WEEKDAY_LABELS: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

function normalizedWeekdays(
  weekdays: readonly number[] | null | undefined,
): number[] {
  return [...new Set(weekdays ?? ALL_ASSIGNMENT_WEEKDAYS)]
    .filter(
      (weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6,
    )
    .sort((left, right) => left - right);
}

function sameWeekdays(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return (
    left.length === right.length &&
    left.every((weekday, index) => weekday === right[index])
  );
}

export function getAssignmentWeekdayPreset(
  weekdays: readonly number[] | null | undefined,
): AssignmentWeekdayPreset {
  const normalized = normalizedWeekdays(weekdays);
  if (sameWeekdays(normalized, ALL_ASSIGNMENT_WEEKDAYS)) return "all";
  if (sameWeekdays(normalized, MONDAY_TO_FRIDAY)) return "weekdays";
  if (sameWeekdays(normalized, SATURDAY_ONLY)) return "saturday";
  if (sameWeekdays(normalized, SUNDAY_ONLY)) return "sunday";
  return "custom";
}

export function weekdaysForAssignmentPreset(
  preset: AssignmentWeekdayPreset,
  current: readonly number[],
): number[] {
  switch (preset) {
    case "all":
      return [...ALL_ASSIGNMENT_WEEKDAYS];
    case "weekdays":
      return [...MONDAY_TO_FRIDAY];
    case "saturday":
      return [...SATURDAY_ONLY];
    case "sunday":
      return [...SUNDAY_ONLY];
    case "custom":
      return normalizedWeekdays(current);
  }
}

/** Omit the legacy T2–T7 preset so the backend keeps its non-Sunday scope. */
export function optionalAssignmentWeekdays(
  weekdays: readonly number[],
): number[] | undefined {
  const normalized = normalizedWeekdays(weekdays);
  return sameWeekdays(normalized, ALL_ASSIGNMENT_WEEKDAYS)
    ? undefined
    : normalized;
}

export function formatAssignmentWeekdays(
  weekdays: readonly number[] | null | undefined,
): string {
  const preset = getAssignmentWeekdayPreset(weekdays);
  if (preset === "all") return "T2–T7";
  if (preset === "weekdays") return "T2–T6";
  if (preset === "saturday") return "Thứ 7";
  if (preset === "sunday") return "Chủ nhật";

  const normalized = normalizedWeekdays(weekdays);
  return normalized.length
    ? normalized.map((weekday) => SHORT_WEEKDAY_LABELS[weekday]).join(", ")
    : "Chưa chọn ngày";
}

/** Uses UTC so selecting a grid date never shifts weekday in the HR browser. */
export function weekdayForShiftAssignmentDate(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Keeps a direct grid selection scoped to exactly its clicked day. */
export function singleDayShiftAssignmentScope(date: string): {
  effectiveFrom: string;
  effectiveTo: string;
  weekdays: number[];
} {
  return {
    effectiveFrom: date,
    effectiveTo: date,
    weekdays: [weekdayForShiftAssignmentDate(date)],
  };
}

/**
 * An unassigned T2–T7 cell must stay selectable even though the resolver
 * correctly reports `isWorkingDay = false` until the first shift is assigned.
 * Sunday is a rest day by default, but HR may explicitly assign a shift there.
 */
export function canSelectShiftAssignmentGridDay(
  day: {
    date: string;
    inAttendanceWindow: boolean;
    calendarIsWorkingDay: boolean;
    isWorkingDay: boolean;
    holidayName: string | null;
    source: string;
  },
  canInclude: boolean,
  disabled: boolean,
  hasActiveDirectShift: boolean,
): boolean {
  const weekday = weekdayForShiftAssignmentDate(day.date);

  return (
    !disabled &&
    canInclude &&
    day.inAttendanceWindow &&
    (weekday === 0
      ? hasActiveDirectShift
      : day.calendarIsWorkingDay && weekday >= 1 && weekday <= 6) &&
    !day.holidayName &&
    day.source === "UNASSIGNED"
  );
}

/**
 * Opens the single-day picker for either a blank plan cell or a cell that
 * already resolves from an employee, department, unit, or work calendar. The
 * latter is a correction, not an edit to the shared department/unit rule.
 */
export function canOpenShiftAssignmentGridPicker(
  day: {
    date: string;
    inAttendanceWindow: boolean;
    calendarIsWorkingDay: boolean;
    isWorkingDay: boolean;
    holidayName: string | null;
    source: string;
    shift?: unknown;
  },
  canInclude: boolean,
  disabled: boolean,
  hasActiveDirectShift: boolean,
): boolean {
  if (
    disabled ||
    !canInclude ||
    !day.inAttendanceWindow ||
    Boolean(day.holidayName)
  ) {
    return false;
  }

  // Ca tuần is an employee-level plan. Both a working template day and an
  // explicit OFF may receive an intentional one-day exception (for example
  // Sunday work), saved as a direct day override.
  if (isWeeklyTemplateAssignmentSource(day.source)) {
    return true;
  }

  // A resolved assignment can be corrected even when it intentionally falls
  // on a non-default working day, for example an explicitly assigned Sunday.
  if (
    day.source === "ASSIGNMENT_EMPLOYEE" ||
    day.source === "ASSIGNMENT_DEPARTMENT" ||
    day.source === "ASSIGNMENT_UNIT" ||
    day.source === "CALENDAR"
  ) {
    return true;
  }

  return canSelectShiftAssignmentGridDay(
    day,
    canInclude,
    disabled,
    hasActiveDirectShift,
  );
}

function parseShiftTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function normalizeShiftText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chỉ nhận diện ca hành chính trọn ngày để mặc định T2–T6 trong lưới phân ca.
 * Dùng đồng thời mã/nhãn/nhóm và khung giờ thực tế: HC4 08:00–12:00 không bị
 * nhầm với ca hành chính cả ngày dù có thể cùng nhóm hoặc cùng số công.
 */
export function isFullDayAdministrativeOfficeShift(
  shift: Pick<
    WorkShift,
    "code" | "name" | "groupName" | "standardMinutes" | "startTime" | "endTime"
  >,
): boolean {
  const code = normalizeShiftText(shift.code);
  const codeAndName = normalizeShiftText([shift.code, shift.name].join(" "));
  const group = normalizeShiftText(shift.groupName);
  const isAdministrative =
    /^hc(?:[-_ ]|\d|\b)/.test(code) ||
    /\bhanh\s*chinh\b|\boffice\b/.test(codeAndName) ||
    (/\bvan\s*phong\b/.test(codeAndName) &&
      /\bhanh\s*chinh\b|\boffice\b/.test(group));
  if (!isAdministrative) return false;

  const start = parseShiftTime(shift.startTime);
  const end = parseShiftTime(shift.endTime);
  if (start !== null && end !== null) {
    const scheduledMinutes = end - start;
    return scheduledMinutes >= 420 && end >= 16 * 60;
  }

  return shift.standardMinutes >= 420;
}
