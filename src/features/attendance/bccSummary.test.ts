import { describe, expect, it } from "vitest";

import { summarizeBccFromDays } from "./bccSummary";

describe("summarizeBccFromDays", () => {
  it("matches the BCC rules for full-day and combined symbols", () => {
    const summary = summarizeBccFromDays(
      [
        "+",
        "-",
        "CT",
        "BP",
        "L1",
        "L2",
        "P",
        "P;-",
        "NB;P",
        "VR",
        "KL;-",
        "OM;KL",
        "TS",
      ].map((displaySymbol) => ({ displaySymbol })),
    );

    expect(summary).toEqual({
      // + , CT , BP = 3 công; `-` và `KL;-` mỗi cái nửa công.
      actualWorkDays: 4.5,
      // L1 cả ngày = 1; L2 nửa ngày = 0.5.
      publicHolidayDays: 1.5,
      annualLeaveDays: 2,
      compensatoryLeaveDays: 0.5,
      paidPersonalLeaveDays: 1,
      // HR bỏ mã du lịch và trực VP ở bảng 20/08/2026 — hai cột luôn 0.
      companyTripDays: 0,
      dutyDays: 0,
      unpaidLeaveDays: 1,
      // TS cả ngày + nửa ngày của `OM;KL`.
      socialInsuranceDays: 1.5,
      totalActualDays: 9.5,
    });
  });

  it("không còn cộng theo mã cũ đã đổi tên", () => {
    // Dữ liệu đã được migration đổi sang mã mới; nếu vẫn cộng theo `Ô`/`CL`
    // thì một bản ghi sót sẽ lặng lẽ được tính hai lần.
    const summary = summarizeBccFromDays(
      ["Ô", "Cô", "CL", "L", "Lđ", "DL", "Tr"].map((displaySymbol) => ({
        displaySymbol,
      })),
    );

    expect(summary.socialInsuranceDays).toBe(0);
    expect(summary.paidPersonalLeaveDays).toBe(0);
    expect(summary.publicHolidayDays).toBe(0);
  });
});
