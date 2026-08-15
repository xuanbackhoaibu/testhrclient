export const ALL_ASSIGNMENT_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const MONDAY_TO_FRIDAY = [1, 2, 3, 4, 5] as const;
export const SATURDAY_ONLY = [6] as const;

export type AssignmentWeekdayPreset = "all" | "weekdays" | "saturday" | "custom";

const SHORT_WEEKDAY_LABELS: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

function normalizedWeekdays(weekdays: readonly number[] | null | undefined): number[] {
  return [...new Set(weekdays ?? ALL_ASSIGNMENT_WEEKDAYS)]
    .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
    .sort((left, right) => left - right);
}

function sameWeekdays(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((weekday, index) => weekday === right[index]);
}

export function getAssignmentWeekdayPreset(
  weekdays: readonly number[] | null | undefined,
): AssignmentWeekdayPreset {
  const normalized = normalizedWeekdays(weekdays);
  if (sameWeekdays(normalized, ALL_ASSIGNMENT_WEEKDAYS)) return "all";
  if (sameWeekdays(normalized, MONDAY_TO_FRIDAY)) return "weekdays";
  if (sameWeekdays(normalized, SATURDAY_ONLY)) return "saturday";
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
    case "custom":
      return normalizedWeekdays(current);
  }
}

/** Omit all seven days to preserve the existing all-days backend default. */
export function optionalAssignmentWeekdays(weekdays: readonly number[]): number[] | undefined {
  const normalized = normalizedWeekdays(weekdays);
  return sameWeekdays(normalized, ALL_ASSIGNMENT_WEEKDAYS) ? undefined : normalized;
}

export function formatAssignmentWeekdays(
  weekdays: readonly number[] | null | undefined,
): string {
  const preset = getAssignmentWeekdayPreset(weekdays);
  if (preset === "all") return "Tất cả ngày";
  if (preset === "weekdays") return "T2–T6";
  if (preset === "saturday") return "Thứ 7";

  const normalized = normalizedWeekdays(weekdays);
  return normalized.length
    ? normalized.map((weekday) => SHORT_WEEKDAY_LABELS[weekday]).join(", ")
    : "Chưa chọn ngày";
}
