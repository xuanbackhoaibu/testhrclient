import { describe, expect, it } from "vitest";

import {
  ALL_ASSIGNMENT_WEEKDAYS,
  formatAssignmentWeekdays,
  getAssignmentWeekdayPreset,
  optionalAssignmentWeekdays,
  weekdaysForAssignmentPreset,
} from "./shiftAssignmentWeekdays";

describe("shift-assignment weekdays", () => {
  it("keeps the existing all-days behavior when weekdays are absent", () => {
    expect(getAssignmentWeekdayPreset(undefined)).toBe("all");
    expect(formatAssignmentWeekdays(undefined)).toBe("Tất cả ngày");
    expect(optionalAssignmentWeekdays(ALL_ASSIGNMENT_WEEKDAYS)).toBeUndefined();
  });

  it("maps the compact presets to their intended weekdays", () => {
    expect(weekdaysForAssignmentPreset("weekdays", [])).toEqual([1, 2, 3, 4, 5]);
    expect(weekdaysForAssignmentPreset("saturday", [])).toEqual([6]);
  });

  it("formats custom weekday scopes for rule auditing", () => {
    expect(getAssignmentWeekdayPreset([1, 3, 6])).toBe("custom");
    expect(formatAssignmentWeekdays([6, 1, 3])).toBe("T2, T4, T7");
    expect(optionalAssignmentWeekdays([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });
});
