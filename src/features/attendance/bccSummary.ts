import type { BccSummary, TimesheetGridDay } from "./timesheetTypes";

type SymbolDay = Pick<TimesheetGridDay, "displaySymbol">;

function normalizeBccSymbol(symbol: string): string {
  return symbol.trim().replace("Lđ", "LĐ");
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

function countSymbolPart(days: readonly SymbolDay[], code: string): number {
  const normalizedCode = normalizeBccSymbol(code);
  return days.filter((day) =>
    normalizeBccSymbol(day.displaySymbol).split(";").includes(normalizedCode),
  ).length;
}

/**
 * Compatibility calculation for an API version which has not yet returned
 * `summary.bcc`. Its rules intentionally mirror TimesheetQueryService so that
 * the grid stays available during a rolling backend/frontend deployment.
 */
export function summarizeBccFromDays(days: readonly SymbolDay[]): BccSummary {
  const actualWorkDays = sumSymbols(
    days,
    ["+", "H", "O", "CT", "BP"],
    ["-", "P;-", "KL;-", "CL;-", "Ô;-", "Cô;-", "NB;-"],
  );
  const publicHolidayDays = sumSymbols(days, ["L"]);
  const annualLeaveDays = sumSymbols(
    days,
    ["P"],
    ["P;-", "P;KL", "Ô;P", "Cô;P", "NB;P"],
  );
  const compensatoryLeaveDays = sumSymbols(
    days,
    ["NB"],
    ["NB;-", "NB;P", "NB;KL"],
  );
  const paidPersonalLeaveDays = sumSymbols(days, ["CL"]);
  const companyTripDays = sumSymbols(days, ["DL"]);
  const dutyDays = countSymbolPart(days, "Tr");
  const unpaidLeaveDays = sumSymbols(
    days,
    ["KL"],
    ["KL;-", "P;KL", "Ô;KL", "Cô;KL", "NB;KL"],
  );
  const socialInsuranceDays = sumSymbols(
    days,
    ["LĐ", "TS", "Ô", "Cô", "TN"],
    ["Ô;-", "Ô;P", "Ô;KL", "Cô;-", "Cô;P", "Cô;KL"],
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
