import { describe, expect, it } from "vitest";

import {
  compareAttendanceIdentity,
  formatAttendanceCode,
} from "./timesheetAttendanceCode";

describe("timesheet attendance-code presentation", () => {
  it("preserves the raw MCB and never falls back to the internal HC code", () => {
    expect(formatAttendanceCode("001")).toBe("001");
    expect(formatAttendanceCode(null)).toBe("—");
  });

  it("sorts raw attendance codes naturally and leaves unmapped employees last", () => {
    const rows = [
      { attendanceCode: null, employeeCode: "HC000003" },
      { attendanceCode: "239", employeeCode: "HC000239" },
      { attendanceCode: "004", employeeCode: "HC000004" },
      { attendanceCode: "001", employeeCode: "HC000001" },
    ];

    expect(rows.sort(compareAttendanceIdentity).map(formatRowCode)).toEqual([
      "001",
      "004",
      "239",
      "—",
    ]);
  });
});

function formatRowCode(row: { attendanceCode: string | null }): string {
  return formatAttendanceCode(row.attendanceCode);
}

describe("compareAttendanceIdentity — thứ tự HR sắp tay", () => {
  const row = (
    attendanceCode: string | null,
    rowOrder: number | null = null,
  ) => ({ attendanceCode, employeeCode: `HC${attendanceCode ?? "x"}`, rowOrder });

  it("thứ tự sắp tay thắng mã chấm công", () => {
    // Mã 239 lẽ ra đứng sau 31, nhưng HR đã kéo lên trước.
    expect(
      compareAttendanceIdentity(row("239", 1000), row("31", 2000)),
    ).toBeLessThan(0);
  });

  it("người chưa sắp luôn xuống sau người đã sắp", () => {
    expect(
      compareAttendanceIdentity(row("999", 1000), row("1", null)),
    ).toBeLessThan(0);
    expect(
      compareAttendanceIdentity(row("1", null), row("999", 1000)),
    ).toBeGreaterThan(0);
  });

  it("cả hai chưa sắp thì giữ nguyên quy ước mã chấm công", () => {
    expect(compareAttendanceIdentity(row("31"), row("239"))).toBeLessThan(0);
  });

  it("cùng thứ tự sắp tay thì so tiếp bằng mã chấm công", () => {
    expect(
      compareAttendanceIdentity(row("239", 1000), row("31", 1000)),
    ).toBeGreaterThan(0);
  });
});
