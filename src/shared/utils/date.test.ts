import { describe, expect, it } from 'vitest';

import { isoMonthEnd, isoMonthStart } from './date';

describe('isoMonthStart', () => {
  it('đệm 0 cho tháng một chữ số', () => {
    expect(isoMonthStart(2026, 3)).toBe('2026-03-01');
    expect(isoMonthStart(2026, 12)).toBe('2026-12-01');
  });
});

describe('isoMonthEnd', () => {
  it('đúng cho tháng 30 và 31 ngày', () => {
    expect(isoMonthEnd(2026, 1)).toBe('2026-01-31');
    expect(isoMonthEnd(2026, 4)).toBe('2026-04-30');
  });

  it('đúng cho tháng 2 năm thường và năm nhuận', () => {
    expect(isoMonthEnd(2026, 2)).toBe('2026-02-28');
    expect(isoMonthEnd(2028, 2)).toBe('2028-02-29');
  });

  it('tháng 12 không tràn sang năm sau', () => {
    expect(isoMonthEnd(2026, 12)).toBe('2026-12-31');
  });
});
