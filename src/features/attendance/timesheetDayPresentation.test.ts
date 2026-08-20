import { describe, expect, it } from "vitest";

import {
  countTimesheetDataGaps,
  hasTimesheetAttendanceEvent,
  isWeeklyTemplateOffDay,
  timesheetDayDisplayValue,
  timesheetDayShiftDisplayValue,
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

describe("countTimesheetDataGaps", () => {
  const today = { year: 2026, month: 8, day: 18 };
  const period = { year: 2026, month: 8 };

  it("tách ba nguyên nhân ô chưa có công", () => {
    const rows = [
      {
        days: [
          { day: 1, source: "MISSING" },
          { day: 2, source: "DEVICE", needsExplanation: true, firstPunch: "08:00" },
          { day: 3, source: "UNASSIGNED" },
        ],
      },
    ];
    expect(countTimesheetDataGaps(rows, today, period)).toEqual({
      missingAttendance: 1,
      awaitingExplanation: 1,
      unassigned: 1,
    });
  });

  it("bỏ qua ngày trong tương lai của tháng hiện tại", () => {
    const rows = [
      {
        days: [
          { day: 18, source: "MISSING" },
          { day: 19, source: "MISSING" },
          { day: 31, source: "MISSING" },
        ],
      },
    ];
    // Chỉ ngày 18 được tính; 19 và 31 chưa tới nên chưa thể có chấm công.
    expect(countTimesheetDataGaps(rows, today, period).missingAttendance).toBe(1);
  });

  it("không báo gì cho kỳ công hoàn toàn ở tương lai", () => {
    const rows = [{ days: [{ day: 1, source: "MISSING" }] }];
    expect(
      countTimesheetDataGaps(rows, today, { year: 2026, month: 9 }),
    ).toEqual({ missingAttendance: 0, awaitingExplanation: 0, unassigned: 0 });
  });

  it("đếm trọn tháng đã qua, không cắt theo ngày hôm nay", () => {
    const rows = [
      { days: [{ day: 25, source: "MISSING" }, { day: 30, source: "MISSING" }] },
    ];
    expect(
      countTimesheetDataGaps(rows, today, { year: 2026, month: 7 })
        .missingAttendance,
    ).toBe(2);
  });

  it("ô MISSING nhưng có chấm công thì không tính là thiếu dữ liệu", () => {
    const rows = [
      { days: [{ day: 1, source: "MISSING", firstPunch: "08:00" }] },
    ];
    expect(countTimesheetDataGaps(rows, today, period).missingAttendance).toBe(0);
  });

  it("ô chờ giải trình mà không có chấm công thì không tính", () => {
    const rows = [
      { days: [{ day: 1, source: "MISSING", needsExplanation: true }] },
    ];
    const result = countTimesheetDataGaps(rows, today, period);
    expect(result.awaitingExplanation).toBe(0);
    expect(result.missingAttendance).toBe(1);
  });

  it("UNASSIGNED được ưu tiên, không đếm trùng sang nhóm khác", () => {
    const rows = [
      {
        days: [
          { day: 1, source: "UNASSIGNED", needsExplanation: true, firstPunch: "08:00" },
        ],
      },
    ];
    expect(countTimesheetDataGaps(rows, today, period)).toEqual({
      missingAttendance: 0,
      awaitingExplanation: 0,
      unassigned: 1,
    });
  });

  it("danh sách rỗng thì không có gì để báo", () => {
    expect(countTimesheetDataGaps([], today, period)).toEqual({
      missingAttendance: 0,
      awaitingExplanation: 0,
      unassigned: 0,
    });
  });
});

describe("timesheet cell shown with the shift-assignment notation", () => {
  const base = {
    firstPunch: null,
    lastPunch: null,
    needsExplanation: false,
  };

  it("shows the shift code instead of + for a full working day", () => {
    expect(
      timesheetDayShiftDisplayValue({
        ...base,
        displaySymbol: "+",
        shiftCode: "HC2",
      }),
    ).toBe("HC2");
  });

  it("marks a half day with the shift code plus the - suffix", () => {
    expect(
      timesheetDayShiftDisplayValue({
        ...base,
        displaySymbol: "-",
        shiftCode: "HC4",
      }),
    ).toBe("HC4-");
  });

  it("keeps leave and absence symbols, which a shift code cannot explain", () => {
    for (const displaySymbol of ["P", "KL", "OFF", "CT"]) {
      expect(
        timesheetDayShiftDisplayValue({
          ...base,
          displaySymbol,
          shiftCode: "HC2",
        }),
      ).toBe(displaySymbol);
    }
  });

  it("falls back to the plain symbol when the day carries no shift code", () => {
    expect(
      timesheetDayShiftDisplayValue({ ...base, displaySymbol: "+" }),
    ).toBe("+");
    expect(
      timesheetDayShiftDisplayValue({
        ...base,
        displaySymbol: "+",
        shiftCode: "   ",
      }),
    ).toBe("+");
  });

  it("still flags a day awaiting explanation rather than showing its shift", () => {
    expect(
      timesheetDayShiftDisplayValue({
        displaySymbol: "",
        firstPunch: "08:00",
        lastPunch: null,
        needsExplanation: true,
        shiftCode: "HC2",
      }),
    ).toBe("?");
  });

  it("shows the shift code for an implicit default-full day", () => {
    expect(
      timesheetDayShiftDisplayValue({
        ...base,
        displaySymbol: "",
        source: "DEFAULT_FULL_ATTENDANCE",
        shiftCode: "HC4",
      }),
    ).toBe("HC4");
  });
});
