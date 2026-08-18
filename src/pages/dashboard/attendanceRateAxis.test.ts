import { describe, expect, it } from 'vitest';

/**
 * Cùng công thức trục với AttendanceRateList trong DashboardPage.
 * Giữ ở đây để khoá hành vi "trục cắt đáy" khỏi bị đưa về 0-100%.
 */
const ATTENDANCE_TARGET = 95;

function axisFor(rates: number[]) {
  const lowest = Math.min(...rates, ATTENDANCE_TARGET);
  const axisMin = Math.max(0, Math.floor((lowest - 2) / 5) * 5);
  const axisSpan = Math.max(1, 100 - axisMin);
  const toPercent = (value: number) =>
    Math.min(Math.max(((value - axisMin) / axisSpan) * 100, 0), 100);
  return { axisMin, toPercent };
}

describe('trục biểu đồ chuyên cần', () => {
  it('tách rõ các phòng ban dồn ở vùng 90-100%', () => {
    const rates = [97.6, 92.1, 96.7, 93.3];
    const { toPercent } = axisFor(rates);

    const widths = rates.map(toPercent);
    const spread = Math.max(...widths) - Math.min(...widths);

    // Vẽ từ 0% thì 92.1 và 97.6 chỉ cách nhau 5.5 điểm bề rộng.
    expect(spread).toBeGreaterThan(20);
  });

  it('neo đáy trục theo bội số 5 và không bao giờ âm', () => {
    expect(axisFor([97.6, 92.1]).axisMin).toBe(90);
    expect(axisFor([100, 100]).axisMin).toBe(90); // mục tiêu 95 vẫn nằm trong trục
    expect(axisFor([1]).axisMin).toBe(0);
  });

  it('luôn giữ được vạch mục tiêu bên trong trục', () => {
    for (const rates of [[100], [92.1, 97.6], [40, 99]]) {
      const { toPercent } = axisFor(rates);
      const mark = toPercent(ATTENDANCE_TARGET);
      expect(mark).toBeGreaterThanOrEqual(0);
      expect(mark).toBeLessThanOrEqual(100);
    }
  });

  it('kẹp giá trị ngoài biên về 0-100%', () => {
    const { toPercent } = axisFor([92.1]);
    expect(toPercent(0)).toBe(0);
    expect(toPercent(120)).toBe(100);
  });
});
