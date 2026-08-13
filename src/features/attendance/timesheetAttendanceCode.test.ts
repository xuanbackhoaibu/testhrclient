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
