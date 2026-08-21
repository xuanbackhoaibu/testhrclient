import { describe, expect, it } from 'vitest';

import { makeDayMeta } from './dayMeta';

describe('makeDayMeta', () => {
  it('gắn đúng nhãn thứ theo lịch', () => {
    // 01/08/2026 là thứ Bảy, 02/08/2026 là Chủ nhật.
    expect(makeDayMeta(2026, 8, 1)).toEqual({ day: 1, label: 'T7', isSunday: false });
    expect(makeDayMeta(2026, 8, 2)).toEqual({ day: 2, label: 'CN', isSunday: true });
  });

  it('không lệch ngày do múi giờ', () => {
    // Tính bằng UTC nên ngày 1 luôn là ngày 1, không bị lùi về tháng trước.
    expect(makeDayMeta(2026, 3, 1).day).toBe(1);
    expect(makeDayMeta(2026, 3, 1).label).toBe('CN');
  });
});
