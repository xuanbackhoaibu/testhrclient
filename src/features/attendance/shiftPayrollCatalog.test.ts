import { describe, expect, it } from 'vitest';

import {
  SHIFT_PAYROLL_CATALOG,
  lookupShiftPayrollValue,
  summarizeShiftPayroll,
} from './shiftPayrollCatalog';

/**
 * Fixture lấy nguyên từ BẢNG CHẤM CÔNG THÁNG 8/2025 mà HR đang dùng. Mỗi case là
 * một dòng thật kèm 6 số tổng in trên bảng đó, nên nếu bảng giá trị công lệch
 * khỏi danh mục 'Ca làm việc' thì test này fail.
 */
const SAMPLE_ROWS: {
  row: number;
  name: string;
  codes: string[];
  expected: {
    workDays: number;
    publicHolidayDays: number;
    annualLeaveDays: number;
    personalLeaveDays: number;
    compensatoryLeaveDays: number;
    totalDays: number;
  };
}[] = [
  {
    row: 1,
    name: 'Nguyễn Quốc Trung — dòng dùng đủ mọi mã nghỉ',
    codes: [
      'HC1', 'HC2', 'HC3', 'HC4',
      'S1', 'S2', 'S3', 'S4', 'S5', 'S6',
      'C1', 'C2', 'C3',
      'P', 'L1', 'L2', 'VR', 'NB', 'TR',
    ],
    expected: {
      workDays: 8.5,
      publicHolidayDays: 1.5,
      annualLeaveDays: 2.5,
      personalLeaveDays: 2.5,
      compensatoryLeaveDays: 1,
      totalDays: 16,
    },
  },
  {
    row: 3,
    name: 'Trần Đại Nghĩa — ca vận hành + 1 ca S1',
    codes: [
      'VH1', 'HC1', 'VH1', 'VH2', 'VH1', 'VH2', 'VH1', 'VH2', 'VH1', 'VH2',
      'S1', 'VH1', 'VH2', 'VH1', 'HC1', 'VH1', 'VH2',
    ],
    expected: {
      workDays: 23.5,
      publicHolidayDays: 0,
      annualLeaveDays: 0.5,
      personalLeaveDays: 0,
      compensatoryLeaveDays: 0,
      totalDays: 24,
    },
  },
  {
    row: 4,
    name: 'Bùi Văn Quyết — 1 P nguyên ngày + 1 S1 nửa ngày',
    codes: [
      'VH1', 'VH2', 'P', 'VH1', 'VH2', 'VH1', 'S1', 'VH2', 'VH2', 'VH1',
      'VH2', 'VH1', 'HC1', 'VH1', 'VH1', 'VH2', 'VH1',
    ],
    expected: {
      workDays: 22.5,
      publicHolidayDays: 0,
      annualLeaveDays: 1.5,
      personalLeaveDays: 0,
      compensatoryLeaveDays: 0,
      totalDays: 24,
    },
  },
  {
    row: 5,
    name: 'Bùi Quốc Đại — có ca VH3 24 giờ, không nghỉ',
    codes: [
      'VH2', 'VH1', 'VH2', 'VH1', 'VH1', 'VH1', 'VH2', 'VH3', 'VH1', 'VH2',
      'VH2', 'HC1', 'VH1', 'VH2', 'VH2',
    ],
    expected: {
      workDays: 23.5,
      publicHolidayDays: 0,
      annualLeaveDays: 0,
      personalLeaveDays: 0,
      compensatoryLeaveDays: 0,
      totalDays: 23.5,
    },
  },
  {
    row: 7,
    name: 'Kiều Thanh Đảo — 2 ngày P',
    codes: [
      'VH2', 'VH1', 'VH2', 'HC1', 'HC1', 'HC1', 'VH2', 'VH1', 'HC1', 'HC1',
      'VH1', 'VH2', 'P', 'P', 'VH1', 'VH2', 'VH2', 'VH1',
    ],
    expected: {
      workDays: 21.5,
      publicHolidayDays: 0,
      annualLeaveDays: 2,
      personalLeaveDays: 0,
      compensatoryLeaveDays: 0,
      totalDays: 23.5,
    },
  },
  {
    row: 9,
    name: 'Huỳnh Thái Trường — 2 P + 1 S1',
    codes: [
      'VH1', 'VH2', 'VH1', 'S1', 'VH1', 'VH2', 'VH1', 'VH2', 'VH1', 'VH2',
      'VH1', 'VH2', 'P', 'P', 'VH2', 'VH1', 'VH2',
    ],
    expected: {
      workDays: 21.5,
      publicHolidayDays: 0,
      annualLeaveDays: 2.5,
      personalLeaveDays: 0,
      compensatoryLeaveDays: 0,
      totalDays: 24,
    },
  },
  {
    row: 12,
    name: 'Phú Ngọc Thành — hành chính, 2 ngày P',
    codes: [...Array.from({ length: 24 }, () => 'HC1'), 'P', 'P'],
    expected: {
      workDays: 24,
      publicHolidayDays: 0,
      annualLeaveDays: 2,
      personalLeaveDays: 0,
      compensatoryLeaveDays: 0,
      totalDays: 26,
    },
  },
  {
    row: 13,
    name: 'Nguyễn Văn Bách — đủ 26 công, không nghỉ',
    codes: Array.from({ length: 26 }, () => 'HC1'),
    expected: {
      workDays: 26,
      publicHolidayDays: 0,
      annualLeaveDays: 0,
      personalLeaveDays: 0,
      compensatoryLeaveDays: 0,
      totalDays: 26,
    },
  },
  {
    row: 14,
    name: 'Hoàng Xuân Quốc — 1 ngày P',
    codes: [...Array.from({ length: 25 }, () => 'HC1'), 'P'],
    expected: {
      workDays: 25,
      publicHolidayDays: 0,
      annualLeaveDays: 1,
      personalLeaveDays: 0,
      compensatoryLeaveDays: 0,
      totalDays: 26,
    },
  },
];

describe('summarizeShiftPayroll — đối chiếu bảng chấm công mẫu tháng 8/2025', () => {
  it.each(SAMPLE_ROWS)('dòng $row: $name', ({ codes, expected }) => {
    expect(summarizeShiftPayroll(codes)).toEqual(expected);
  });

  it('cột (6) luôn bằng tổng (1)..(5) trên mọi dòng mẫu', () => {
    for (const { codes } of SAMPLE_ROWS) {
      const t = summarizeShiftPayroll(codes);
      expect(t.totalDays).toBe(
        t.workDays +
          t.publicHolidayDays +
          t.annualLeaveDays +
          t.personalLeaveDays +
          t.compensatoryLeaveDays,
      );
    }
  });
});

describe('giá trị công theo danh mục Ca làm việc', () => {
  it('ca 12 giờ vận hành là 1.5 công, ca 24 giờ là 3 công', () => {
    expect(SHIFT_PAYROLL_CATALOG.VH1.workDays).toBe(1.5);
    expect(SHIFT_PAYROLL_CATALOG.VH2.workDays).toBe(1.5);
    expect(SHIFT_PAYROLL_CATALOG.VH3.workDays).toBe(3);
  });

  it('bảo vệ ca 12 giờ là 1 công, ca 24 giờ là 2 công', () => {
    expect(SHIFT_PAYROLL_CATALOG.BV1.workDays).toBe(1);
    expect(SHIFT_PAYROLL_CATALOG.BV3.workDays).toBe(2);
    expect(SHIFT_PAYROLL_CATALOG.BV6.workDays).toBe(2);
  });

  it('mã nghỉ không cộng vào công làm việc nên cột (6) không tính trùng', () => {
    for (const code of ['P', 'L1', 'L2', 'VR', 'NB']) {
      expect(SHIFT_PAYROLL_CATALOG[code].workDays).toBe(0);
    }
  });

  it('ca nửa ngày cho nửa công làm việc và nửa công nghỉ tương ứng', () => {
    expect(summarizeShiftPayroll(['S1'])).toMatchObject({
      workDays: 0.5,
      annualLeaveDays: 0.5,
      totalDays: 1,
    });
    expect(summarizeShiftPayroll(['S2'])).toMatchObject({
      workDays: 0.5,
      personalLeaveDays: 0.5,
      totalDays: 1,
    });
  });

  it('chiều nghỉ không lương chỉ tính nửa công, không vào cột nghỉ nào', () => {
    expect(summarizeShiftPayroll(['S3'])).toMatchObject({
      workDays: 0.5,
      annualLeaveDays: 0,
      personalLeaveDays: 0,
      totalDays: 0.5,
    });
  });

  it('TR làm ngày nghỉ tính riêng thêm giờ, không vào công ngày', () => {
    expect(summarizeShiftPayroll(['TR'])).toMatchObject({
      workDays: 0,
      totalDays: 0,
    });
  });

  it('nghỉ BHXH và nghỉ không lương không vào 6 cột tổng', () => {
    expect(summarizeShiftPayroll(['OM', 'CO', 'TS', 'KL', 'NT', 'OFF'])).toEqual(
      {
        workDays: 0,
        publicHolidayDays: 0,
        annualLeaveDays: 0,
        personalLeaveDays: 0,
        compensatoryLeaveDays: 0,
        totalDays: 0,
      },
    );
  });

  it('nghỉ lễ nửa ngày L2 là 0.5, cả ngày L1 là 1', () => {
    expect(summarizeShiftPayroll(['L1', 'L2'])).toMatchObject({
      publicHolidayDays: 1.5,
    });
  });
});

describe('lookupShiftPayrollValue', () => {
  it('không phân biệt hoa thường và bỏ khoảng trắng', () => {
    expect(lookupShiftPayrollValue(' hc1 ')).toEqual({ workDays: 1 });
    expect(lookupShiftPayrollValue('vh3')).toEqual({ workDays: 3 });
  });

  it('trả null cho mã rỗng hoặc ngoài danh mục', () => {
    expect(lookupShiftPayrollValue(null)).toBeNull();
    expect(lookupShiftPayrollValue('')).toBeNull();
    expect(lookupShiftPayrollValue('KHONG-CO')).toBeNull();
  });

  it('bỏ qua mã lạ thay vì cộng sai vào công thực tế', () => {
    expect(summarizeShiftPayroll(['HC1', 'MA-LA', null, undefined])).toMatchObject(
      { workDays: 1, totalDays: 1 },
    );
  });

  it('cộng nhiều nửa công không bị sai số dấu phẩy động', () => {
    expect(summarizeShiftPayroll(Array.from({ length: 7 }, () => 'S1'))).toEqual(
      {
        workDays: 3.5,
        publicHolidayDays: 0,
        annualLeaveDays: 3.5,
        personalLeaveDays: 0,
        compensatoryLeaveDays: 0,
        totalDays: 7,
      },
    );
  });
});
