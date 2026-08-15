import { describe, expect, it } from "vitest";

import {
  hasTimesheetAttendanceEvent,
  isWeeklyTemplateOffDay,
  timesheetDayDisplayValue,
} from "./timesheetDayPresentation";

describe("timesheet day presentation", () => {
  it("keeps a no-event MISSING day blank", () => {
    const day = {
      displaySymbol: "",
      firstPunch: null,
      lastPunch: null,
      needsExplanation: true,
    };

    expect(hasTimesheetAttendanceEvent(day)).toBe(false);
    expect(timesheetDayDisplayValue(day)).toBe("");
  });

  it("shows a question mark only when the missing day has attendance data", () => {
    expect(
      timesheetDayDisplayValue({
        displaySymbol: "",
        firstPunch: "08:00",
        lastPunch: null,
        needsExplanation: true,
      }),
    ).toBe("?");
    expect(
      timesheetDayDisplayValue({
        displaySymbol: "",
        firstPunch: null,
        lastPunch: null,
        totalMinutes: 0,
        needsExplanation: true,
      }),
    ).toBe("?");
  });

  it("never hides a real timesheet symbol", () => {
    expect(
      timesheetDayDisplayValue({
        displaySymbol: "+",
        firstPunch: null,
        lastPunch: null,
        needsExplanation: false,
      }),
    ).toBe("+");
  });

  it("keeps the default-full marker visible without inferring a symbol for an unassigned day", () => {
    expect(
      timesheetDayDisplayValue({
        displaySymbol: "",
        firstPunch: null,
        lastPunch: null,
        needsExplanation: false,
        source: "DEFAULT_FULL_ATTENDANCE",
      }),
    ).toBe("+");
    expect(
      timesheetDayDisplayValue({
        displaySymbol: "",
        firstPunch: null,
        lastPunch: null,
        needsExplanation: false,
        source: "UNASSIGNED",
      }),
    ).toBe("");
  });

  it("treats a weekly template OFF as scheduled rest, not unassigned", () => {
    expect(
      isWeeklyTemplateOffDay({
        source: "WEEKLY_TEMPLATE_EMPLOYEE",
        isWorkingDay: false,
      }),
    ).toBe(true);
    expect(
      isWeeklyTemplateOffDay({
        source: "WEEKLY_TEMPLATE_EMPLOYEE",
        isWorkingDay: true,
      }),
    ).toBe(false);
    expect(
      isWeeklyTemplateOffDay({ source: "UNASSIGNED", isWorkingDay: false }),
    ).toBe(false);
  });
});
