import { describe, expect, it } from "vitest";

import {
  ALL_ASSIGNMENT_WEEKDAYS,
  formatAssignmentWeekdays,
  getAssignmentWeekdayPreset,
  isFullDayAdministrativeOfficeShift,
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
    expect(weekdaysForAssignmentPreset("weekdays", [])).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(weekdaysForAssignmentPreset("saturday", [])).toEqual([6]);
  });

  it("only identifies full-day administrative office shifts for the T2–T6 default", () => {
    expect(
      isFullDayAdministrativeOfficeShift({
        code: "HC1",
        name: "Ca hành chính",
        groupName: "Hành chính",
        standardMinutes: 480,
        startTime: "08:00",
        endTime: "17:00",
      }),
    ).toBe(true);
    expect(
      isFullDayAdministrativeOfficeShift({
        code: "HC4",
        name: "Ca hành chính thứ 7",
        groupName: "Hành chính",
        standardMinutes: 480,
        startTime: "08:00",
        endTime: "12:00",
      }),
    ).toBe(false);
    expect(
      isFullDayAdministrativeOfficeShift({
        code: "VH1",
        name: "Vận hành",
        groupName: "Nhà máy",
        standardMinutes: 480,
        startTime: "07:30",
        endTime: "19:30",
      }),
    ).toBe(false);
    expect(
      isFullDayAdministrativeOfficeShift({
        code: "BV1",
        name: "Bảo vệ ca ngày (HC)",
        groupName: "Hành chính",
        standardMinutes: 720,
        startTime: "06:00",
        endTime: "18:00",
      }),
    ).toBe(false);
  });

  it("formats custom weekday scopes for rule auditing", () => {
    expect(getAssignmentWeekdayPreset([1, 3, 6])).toBe("custom");
    expect(formatAssignmentWeekdays([6, 1, 3])).toBe("T2, T4, T7");
    expect(optionalAssignmentWeekdays([1, 2, 3, 4, 5])).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });
});
