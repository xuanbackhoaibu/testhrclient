import type { BccSummary, TimesheetGridDay } from "./timesheetTypes";

type SymbolDay = Pick<TimesheetGridDay, "displaySymbol">;

function normalizeBccSymbol(symbol: string): string {
  return symbol.trim();
}

function sumSymbols(
  days: readonly SymbolDay[],
  fullSymbols: readonly string[],
  halfSymbols: readonly string[] = [],
): number {
  const full = new Set(fullSymbols.map(normalizeBccSymbol));
  const half = new Set(halfSymbols.map(normalizeBccSymbol));
  const total = days.reduce((sum, day) => {
    const symbol = normalizeBccSymbol(day.displaySymbol);
    if (full.has(symbol)) return sum + 1;
    if (half.has(symbol)) return sum + 0.5;
    return sum;
  }, 0);
  return Math.round(total * 2) / 2;
}


/**
 * Compatibility calculation for an API version which has not yet returned
 * `summary.bcc`. Its rules intentionally mirror TimesheetQueryService so that
 * the grid stays available during a rolling backend/frontend deployment.
 */
export function summarizeBccFromDays(days: readonly SymbolDay[]): BccSummary {
  const actualWorkDays = sumSymbols(
    days,
    ["+", "CT", "BP"],
    ["-", "P;-", "KL;-", "VR;-", "OM;-", "CO;-", "NB;-"],
  );
  // L1 nghỉ lễ cả ngày = 1 công; L2 nghỉ lễ nửa ngày = 0.5 công.
  const publicHolidayDays =
    sumSymbols(days, ["L1"]) + sumSymbols(days, [], ["L2"]);
  const annualLeaveDays = sumSymbols(
    days,
    ["P"],
    ["P;-", "P;KL", "OM;P", "CO;P", "NB;P"],
  );
  const compensatoryLeaveDays = sumSymbols(
    days,
    ["NB"],
    ["NB;-", "NB;P", "NB;KL"],
  );
  const paidPersonalLeaveDays = sumSymbols(days, ["VR"]);
  // HR bỏ mã du lịch (DL) và trực VP (Tr) ở bảng 20/08/2026. Giữ cột để BCC
  // và file Excel không đổi hình dạng, giá trị luôn 0 tới khi HR chốt lại.
  const companyTripDays = 0;
  const dutyDays = 0;
  const unpaidLeaveDays = sumSymbols(
    days,
    ["KL"],
    ["KL;-", "P;KL", "OM;KL", "CO;KL", "NB;KL"],
  );
  const socialInsuranceDays = sumSymbols(
    days,
    ["TS", "OM", "CO"],
    ["OM;-", "OM;P", "OM;KL", "CO;-", "CO;P", "CO;KL"],
  );

  return {
    actualWorkDays,
    publicHolidayDays,
    annualLeaveDays,
    compensatoryLeaveDays,
    paidPersonalLeaveDays,
    companyTripDays,
    dutyDays,
    unpaidLeaveDays,
    socialInsuranceDays,
    totalActualDays:
      actualWorkDays +
      publicHolidayDays +
      annualLeaveDays +
      compensatoryLeaveDays +
      paidPersonalLeaveDays +
      companyTripDays,
  };
}
