import { describe, expect, it } from "vitest";

import {
  ALL_ASSIGNMENT_WEEKDAYS,
  canOpenShiftAssignmentGridPicker,
  canSelectShiftAssignmentGridDay,
  formatAssignmentWeekdays,
  getAssignmentWeekdayPreset,
  isFullDayAdministrativeOfficeShift,
  isWeeklyTemplateAssignmentSource,
  optionalAssignmentWeekdays,
  singleDayShiftAssignmentScope,
  requiresOneDayShiftOverride,
  SUNDAY_ONLY,
  weekdayForShiftAssignmentDate,
  weekdaysForAssignmentPreset,
} from "./shiftAssignmentWeekdays";

describe("shift-assignment weekdays", () => {
  it("keeps the legacy T2–T7 behavior when weekdays are absent", () => {
    expect(getAssignmentWeekdayPreset(undefined)).toBe("all");
    expect(formatAssignmentWeekdays(undefined)).toBe("T2–T7");
    expect(optionalAssignmentWeekdays(ALL_ASSIGNMENT_WEEKDAYS)).toBeUndefined();
  });

  it("keeps selected grid dates on their UTC weekdays", () => {
    expect(weekdayForShiftAssignmentDate("2026-08-01")).toBe(6);
    expect(weekdayForShiftAssignmentDate("2026-08-02")).toBe(0);
  });

  it("keeps a direct grid selection to its clicked date and weekday", () => {
    expect(singleDayShiftAssignmentScope("2026-08-02")).toEqual({
      effectiveFrom: "2026-08-02",
      effectiveTo: "2026-08-02",
      weekdays: [0],
    });
  });

  it("keeps a later unassigned weekday selectable after a one-day assignment", () => {
    const laterUnassignedWeekday = {
      date: "2026-08-03",
      inAttendanceWindow: true,
      calendarIsWorkingDay: true,
      // The API intentionally returns false before the first ca is assigned.
      isWorkingDay: false,
      holidayName: null,
      source: "UNASSIGNED",
    };

    expect(
      canSelectShiftAssignmentGridDay(
        {
          ...laterUnassignedWeekday,
          date: "2026-08-01",
          source: "ASSIGNMENT_EMPLOYEE",
        },
        true,
        false,
        true,
      ),
    ).toBe(false);
    expect(
      canSelectShiftAssignmentGridDay(
        laterUnassignedWeekday,
        true,
        false,
        true,
      ),
    ).toBe(true);
  });

  it("only exposes an eligible unassigned plan cell as selectable", () => {
    const availableDay = {
      date: "2026-08-03",
      inAttendanceWindow: true,
      calendarIsWorkingDay: true,
      // The API intentionally returns false before the first ca is assigned.
      isWorkingDay: false,
      holidayName: null,
      source: "UNASSIGNED",
    };

    expect(
      canSelectShiftAssignmentGridDay(availableDay, true, false, false),
    ).toBe(true);
    expect(
      canSelectShiftAssignmentGridDay(
        { ...availableDay, holidayName: "Quốc khánh" },
        true,
        false,
        true,
      ),
    ).toBe(false);
    expect(
      canSelectShiftAssignmentGridDay(
        { ...availableDay, source: "ASSIGNMENT_EMPLOYEE" },
        true,
        false,
        true,
      ),
    ).toBe(false);
    expect(
      canSelectShiftAssignmentGridDay(
        { ...availableDay, inAttendanceWindow: false },
        true,
        false,
        true,
      ),
    ).toBe(false);
    expect(
      canSelectShiftAssignmentGridDay(
        { ...availableDay, date: "2026-08-02" },
        true,
        false,
        false,
      ),
    ).toBe(false);
    expect(
      canSelectShiftAssignmentGridDay(
        { ...availableDay, date: "2026-08-02" },
        true,
        false,
        true,
      ),
    ).toBe(true);
    expect(
      canSelectShiftAssignmentGridDay(
        {
          ...availableDay,
          date: "2026-08-02",
          holidayName: "Quốc khánh",
        },
        true,
        false,
        true,
      ),
    ).toBe(false);
    expect(
      canSelectShiftAssignmentGridDay(
        { ...availableDay, calendarIsWorkingDay: false },
        true,
        false,
        true,
      ),
    ).toBe(false);
    expect(
      canSelectShiftAssignmentGridDay(availableDay, false, false, true),
    ).toBe(false);
    expect(
      canSelectShiftAssignmentGridDay(availableDay, true, true, true),
    ).toBe(false);
  });

  it("opens an existing assigned cell for correction without opening protected days", () => {
    const assignedDay = {
      date: "2026-08-02",
      inAttendanceWindow: true,
      calendarIsWorkingDay: false,
      isWorkingDay: true,
      holidayName: null,
      source: "ASSIGNMENT_DEPARTMENT",
    };

    // An explicit Sunday assignment may be corrected even though Sunday is not
    // a default calendar workday.
    expect(
      canOpenShiftAssignmentGridPicker(assignedDay, true, false, false),
    ).toBe(true);
    expect(
      canOpenShiftAssignmentGridPicker(
        { ...assignedDay, source: "ASSIGNMENT_EMPLOYEE" },
        true,
        false,
        false,
      ),
    ).toBe(true);
    expect(
      canOpenShiftAssignmentGridPicker(
        { ...assignedDay, source: "CALENDAR" },
        true,
        false,
        false,
      ),
    ).toBe(true);
    expect(
      canOpenShiftAssignmentGridPicker(
        { ...assignedDay, holidayName: "Quốc khánh" },
        true,
        false,
        true,
      ),
    ).toBe(false);
    expect(
      canOpenShiftAssignmentGridPicker(assignedDay, true, true, true),
    ).toBe(false);
    expect(
      canOpenShiftAssignmentGridPicker(assignedDay, false, false, true),
    ).toBe(false);
  });
  it("opens weekly work and explicit-off days for intentional one-day exceptions", () => {
    const weeklyDay = {
      date: "2026-08-02",
      inAttendanceWindow: true,
      calendarIsWorkingDay: false,
      isWorkingDay: false,
      holidayName: null,
      source: "WEEKLY_TEMPLATE_EMPLOYEE",
    };

    expect(isWeeklyTemplateAssignmentSource(weeklyDay.source)).toBe(true);
    expect(isWeeklyTemplateAssignmentSource("WEEKLY_TEMPLATE")).toBe(true);
    expect(isWeeklyTemplateAssignmentSource("UNASSIGNED")).toBe(false);
    expect(requiresOneDayShiftOverride(weeklyDay.source)).toBe(true);
    expect(requiresOneDayShiftOverride("WEEKLY_TEMPLATE")).toBe(true);
    expect(requiresOneDayShiftOverride("UNASSIGNED")).toBe(false);
    expect(
      canOpenShiftAssignmentGridPicker(
        { ...weeklyDay, shift: { id: "hc1" } },
        true,
        false,
        false,
      ),
    ).toBe(true);
    // Explicit OFF blocks inherited schedules, but HR may still add exactly one
    // deliberate exception such as Sunday work. The exact one-day replacement
    // path preserves BCC and allows cancellation to reveal the template OFF.
    expect(
      canOpenShiftAssignmentGridPicker(
        { ...weeklyDay, shift: null },
        true,
        false,
        false,
      ),
    ).toBe(true);
    expect(
      canOpenShiftAssignmentGridPicker(
        { ...weeklyDay, shift: null, holidayName: "Quốc khánh" },
        true,
        false,
        false,
      ),
    ).toBe(false);
  });

  it("maps the compact presets to their intended weekdays", () => {
    expect(weekdaysForAssignmentPreset("weekdays", [])).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(weekdaysForAssignmentPreset("saturday", [])).toEqual([6]);
    expect(weekdaysForAssignmentPreset("sunday", [])).toEqual([0]);
    expect(getAssignmentWeekdayPreset(SUNDAY_ONLY)).toBe("sunday");
    expect(formatAssignmentWeekdays(SUNDAY_ONLY)).toBe("Chủ nhật");
    expect(optionalAssignmentWeekdays(SUNDAY_ONLY)).toEqual([0]);
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
