const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

function toMinutes(time: string): number | null {
  if (!TIME_PATTERN.test(time.trim())) return null;
  const [hours, minutes] = time.trim().split(':').map(Number);
  return hours * 60 + minutes;
}

export interface ShiftDurationInput {
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  /** When false the break is paid and stays inside the working total. */
  breakDeducted?: boolean;
}

const MINUTES_PER_DAY = 24 * 60;

/**
 * Working minutes of a shift, so HR does not have to multiply hours by 60.
 *
 * Overnight shifts (18:30–06:30) are supported: the end time and any break
 * that falls after midnight belong to the next day, so they are shifted by
 * 24h before subtracting. This mirrors the payroll engine, which resolves
 * post-midnight punches the same way.
 *
 * Only the part of the break that actually overlaps the shift is deducted: a
 * break declared outside the working window must not shorten the total.
 */
export function computeShiftWorkingMinutes(
  input: ShiftDurationInput,
): number | null {
  const start = toMinutes(input.startTime);
  const rawEnd = toMinutes(input.endTime);
  if (start === null || rawEnd === null) return null;

  // Giờ vào bằng giờ tan là ca 24 giờ (VH3 07:30–07:30, BV6 06:30–06:30 —
  // ca trực ngày đêm có thật trong danh mục), không phải ca rỗng.
  const overnight = rawEnd <= start;
  const end = overnight ? rawEnd + MINUTES_PER_DAY : rawEnd;

  let total = end - start;

  if (input.breakDeducted !== false && input.breakStart && input.breakEnd) {
    const rawBreakStart = toMinutes(input.breakStart);
    const rawBreakEnd = toMinutes(input.breakEnd);

    if (
      rawBreakStart !== null &&
      rawBreakEnd !== null &&
      rawBreakEnd > rawBreakStart
    ) {
      // Keep the break on the same timeline as the shift.
      const breakStart =
        overnight && rawBreakStart < start
          ? rawBreakStart + MINUTES_PER_DAY
          : rawBreakStart;
      const breakEnd = breakStart + (rawBreakEnd - rawBreakStart);
      const overlap = Math.min(end, breakEnd) - Math.max(start, breakStart);
      if (overlap > 0) {
        total -= overlap;
      }
    }
  }

  return total > 0 ? total : null;
}

/**
 * Renders a minute count the way HR reads it: "8 giờ", "7 giờ 30 phút".
 */
export function formatWorkingMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} phút`;
  if (rest === 0) return `${hours} giờ`;
  return `${hours} giờ ${rest} phút`;
}
