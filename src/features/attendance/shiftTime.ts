/**
 * Adds minutes to an HH:mm clock time, wrapping past midnight.
 *
 * Used to show the moment a shift starts counting a punch as late, so the rule
 * is legible on screen instead of only living in the backend classifier.
 * Returns the input unchanged when it is not a valid HH:mm value.
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;

  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return time;

  const total = ((hours * 60 + mins + minutes) % 1440 + 1440) % 1440;
  const outHours = Math.floor(total / 60);
  const outMinutes = total % 60;

  return `${String(outHours).padStart(2, '0')}:${String(outMinutes).padStart(2, '0')}`;
}

/**
 * Ca có kéo sang ngày hôm sau không — giờ ra <= giờ vào (18:30–06:30), hoặc
 * bằng nhau với ca 24 giờ (07:30–07:30).
 *
 * Cùng quy tắc với `scheduleIsOvernight` bên hr-api-service: căn cứ là CẤU
 * HÌNH CA, không suy từ dữ liệu chấm công.
 */
export function isOvernightShiftTime(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): boolean {
  const start = startTime?.trim();
  const end = endTime?.trim();
  if (!start || !end) return false;
  return end <= start;
}

/**
 * Số ngày ca trải qua, suy từ số phút chuẩn của ca. Ca 12h qua đêm trải 1
 * ngày; ca 24h (1440') trải 1 ngày; ca dài hơn nữa thì nhiều hơn.
 */
export function shiftSpanDays(
  standardMinutes: number | null | undefined,
): number {
  if (!standardMinutes || standardMinutes <= 0) return 1;
  return Math.max(1, Math.ceil(standardMinutes / 1440));
}
