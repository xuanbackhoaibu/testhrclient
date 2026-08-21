/** Nhãn thứ trong tuần, index theo `Date.getUTCDay()` (0 = Chủ nhật). */
export const weekdayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export interface DayMeta {
  day: number;
  label: string;
  isSunday: boolean;
}

/**
 * Mô tả một ngày trong tháng cho header của bảng công / bảng phân ca.
 *
 * Dùng UTC để nhãn thứ không lệch một ngày khi máy chạy ở múi giờ âm.
 */
export function makeDayMeta(year: number, month: number, day: number): DayMeta {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { day, label: weekdayLabels[weekday], isSunday: weekday === 0 };
}
