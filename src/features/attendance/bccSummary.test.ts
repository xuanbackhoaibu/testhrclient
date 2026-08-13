import { describe, expect, it } from "vitest";

import { summarizeBccFromDays } from "./bccSummary";

describe("summarizeBccFromDays", () => {
  it("matches the BCC rules for full-day and combined symbols", () => {
    const summary = summarizeBccFromDays(
      [
        "+",
        "-",
        "H",
        "O",
        "CT",
        "L",
        "P",
        "P;-",
        "NB;P",
        "CL",
        "DL",
        "Tr",
        "KL;-",
        "Ô;KL",
      ].map((displaySymbol) => ({ displaySymbol })),
    );

    expect(summary).toEqual({
      actualWorkDays: 5.5,
      publicHolidayDays: 1,
      annualLeaveDays: 2,
      compensatoryLeaveDays: 0.5,
      paidPersonalLeaveDays: 1,
      companyTripDays: 1,
      dutyDays: 1,
      unpaidLeaveDays: 1,
      socialInsuranceDays: 0.5,
      totalActualDays: 11,
    });
  });
});
