import dayjs from 'dayjs';

export function formatDate(value?: string | null, format = 'DD/MM/YYYY'): string {
  if (!value) {
    return '-';
  }

  return dayjs(value).format(format);
}

export function formatDateTime(value?: string | null, format = 'DD/MM/YYYY HH:mm'): string {
  if (!value) {
    return '-';
  }

  return dayjs(value).format(format);
}


/**
 * Ngày đầu tháng dạng ISO `YYYY-MM-01`.
 *
 * Ghép chuỗi trực tiếp thay vì qua `Date` để không bị lệch tháng khi máy
 * chạy ở múi giờ âm. `month` tính từ 1.
 */
export function isoMonthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/**
 * Ngày cuối tháng dạng ISO `YYYY-MM-DD`.
 *
 * `Date.UTC(year, month, 0)` cho ngày 0 của tháng kế tiếp — tức ngày cuối của
 * tháng đang xét — nên tự đúng cho cả tháng 28/29/30/31 ngày.
 */
export function isoMonthEnd(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
