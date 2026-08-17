/**
 * Giá trị công của từng mã ca, theo bảng danh mục 'Ca làm việc' HR đang dùng.
 *
 * Bảng chấm công Excel tính 6 cột tổng bằng các công thức:
 *
 *   (1) Công làm việc thực tế
 *       =SUMPRODUCT(SUMIF('Ca làm việc'!B:B, dải_ngày, 'Ca làm việc'!N:N))
 *       -> tổng cột "Công làm việc" của mọi mã xuất hiện trong dải ngày.
 *
 *   (2)..(5) =COUNTIF(dải, "MÃ") * VLOOKUP("MÃ", 'Ca làm việc'!B:O, 14, 0)
 *       -> số lần xuất hiện mã  x  giá trị nghỉ tương ứng của mã đó.
 *
 *   (6) =SUM của (1)..(5)
 *
 * Điểm quan trọng: cột "Công làm việc" và các cột nghỉ là HAI cột khác nhau.
 * Mã nghỉ (P, L1, VR, NB…) có "Công làm việc" = 0 nên không lọt vào (1); ngược
 * lại mã làm việc không có giá trị nghỉ. Nhờ vậy (6) không cộng trùng.
 *
 * Ca nửa ngày ghép sẵn phần nghỉ vào chính mã ca: S1 "Làm sáng 7h30, Chiều nghỉ
 * P" vừa cho 0.5 công làm việc vừa cho 0.5 công nghỉ phép. Đó là lý do một mã có
 * thể xuất hiện ở cả (1) và một trong (2)..(5).
 *
 * Toàn bộ số dưới đây lấy đúng từ bảng danh mục và đã đối chiếu khớp với các
 * dòng trong bảng chấm công mẫu tháng 8/2025 (xem shiftPayrollCatalog.test.ts).
 */
export interface ShiftPayrollValue {
  /** Cột "Công làm việc" — vào cột tổng (1). */
  workDays: number;
  /** Cột "Trừ phép" — vào cột tổng (3) Nghỉ phép. */
  annualLeaveDays?: number;
  /** Vào cột tổng (2) Nghỉ lễ. */
  publicHolidayDays?: number;
  /** Vào cột tổng (4) Nghỉ việc riêng. */
  personalLeaveDays?: number;
  /** Vào cột tổng (5) Nghỉ bù. */
  compensatoryLeaveDays?: number;
}

export const SHIFT_PAYROLL_CATALOG: Readonly<
  Record<string, ShiftPayrollValue>
> = Object.freeze({
  // Ca hành chính cả ngày.
  HC1: { workDays: 1 },
  HC2: { workDays: 1 },
  HC3: { workDays: 1 },
  HC4: { workDays: 1 },

  // Nửa ngày làm việc + nửa ngày nghỉ. Phần nghỉ nằm ngay trong mã ca.
  S1: { workDays: 0.5, annualLeaveDays: 0.5 },
  S2: { workDays: 0.5, personalLeaveDays: 0.5 },
  S3: { workDays: 0.5 }, // chiều nghỉ không lương: không vào cột nào
  S4: { workDays: 0.5, annualLeaveDays: 0.5 },
  S5: { workDays: 0.5, personalLeaveDays: 0.5 },
  S6: { workDays: 0.5 },
  C1: { workDays: 0.5, annualLeaveDays: 0.5 },
  C2: { workDays: 0.5, personalLeaveDays: 0.5 },
  C3: { workDays: 0.5 },

  // Vận hành nhà máy: ca 12 giờ = 1.5 công, ca 24 giờ = 3 công.
  VH1: { workDays: 1.5 },
  VH2: { workDays: 1.5 },
  VH3: { workDays: 3 },

  // Bảo vệ: ca 12 giờ = 1 công, ca 24 giờ = 2 công.
  BV1: { workDays: 1 },
  BV2: { workDays: 1 },
  BV3: { workDays: 2 },
  BV4: { workDays: 1 },
  BV5: { workDays: 1 },
  BV6: { workDays: 2 },

  // Vẫn tính đủ công làm việc.
  CT: { workDays: 1 },
  BP: { workDays: 1 },

  // Làm việc ngày nghỉ: danh mục ghi "Tính riêng thêm giờ", không vào công ngày.
  TR: { workDays: 0 },

  // Nghỉ hưởng lương.
  P: { workDays: 0, annualLeaveDays: 1 },
  L1: { workDays: 0, publicHolidayDays: 1 },
  L2: { workDays: 0, publicHolidayDays: 0.5 },
  VR: { workDays: 0, personalLeaveDays: 1 },
  NB: { workDays: 0, compensatoryLeaveDays: 1 },

  // Nghỉ BHXH và nghỉ không hưởng lương: không vào 6 cột tổng của mẫu.
  OM: { workDays: 0 },
  CO: { workDays: 0 },
  TS: { workDays: 0 },
  NT: { workDays: 0 },
  OFF: { workDays: 0 },
  KL: { workDays: 0 },
});

export interface ShiftPayrollTotals {
  /** (1) Công làm việc thực tế. */
  workDays: number;
  /** (2) Nghỉ lễ. */
  publicHolidayDays: number;
  /** (3) Nghỉ phép. */
  annualLeaveDays: number;
  /** (4) Nghỉ việc riêng. */
  personalLeaveDays: number;
  /** (5) Nghỉ bù. */
  compensatoryLeaveDays: number;
  /** (6) = (1)+(2)+(3)+(4)+(5). */
  totalDays: number;
}

/** Cộng dồn dạng số nguyên phần nửa công để tránh sai số dấu phẩy động. */
function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function lookupShiftPayrollValue(
  code: string | null | undefined,
): ShiftPayrollValue | null {
  if (!code) return null;
  return SHIFT_PAYROLL_CATALOG[code.trim().toUpperCase()] ?? null;
}

/**
 * Tính 6 cột tổng của bảng chấm công từ danh sách mã ca theo ngày.
 *
 * Mã không có trong danh mục bị bỏ qua — thà thiếu còn hơn cộng sai một mã lạ
 * vào công thực tế.
 */
export function summarizeShiftPayroll(
  codes: readonly (string | null | undefined)[],
): ShiftPayrollTotals {
  let workDays = 0;
  let publicHolidayDays = 0;
  let annualLeaveDays = 0;
  let personalLeaveDays = 0;
  let compensatoryLeaveDays = 0;

  for (const code of codes) {
    const value = lookupShiftPayrollValue(code);
    if (!value) continue;
    workDays += value.workDays;
    publicHolidayDays += value.publicHolidayDays ?? 0;
    annualLeaveDays += value.annualLeaveDays ?? 0;
    personalLeaveDays += value.personalLeaveDays ?? 0;
    compensatoryLeaveDays += value.compensatoryLeaveDays ?? 0;
  }

  workDays = roundHalf(workDays);
  publicHolidayDays = roundHalf(publicHolidayDays);
  annualLeaveDays = roundHalf(annualLeaveDays);
  personalLeaveDays = roundHalf(personalLeaveDays);
  compensatoryLeaveDays = roundHalf(compensatoryLeaveDays);

  return {
    workDays,
    publicHolidayDays,
    annualLeaveDays,
    personalLeaveDays,
    compensatoryLeaveDays,
    totalDays: roundHalf(
      workDays +
        publicHolidayDays +
        annualLeaveDays +
        personalLeaveDays +
        compensatoryLeaveDays,
    ),
  };
}
