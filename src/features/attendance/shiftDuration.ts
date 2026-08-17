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

/**
 * Working minutes of a shift, so HR does not have to multiply hours by 60.
 *
 * Returns null when the times are incomplete or the shift runs past midnight —
 * the payroll engine only handles single-day shifts, so guessing a figure there
 * would produce a number nobody can act on.
 *
 * Only the part of the break that actually overlaps the shift is deducted: a
 * break declared outside the working window must not shorten the total.
 */
export function computeShiftWorkingMinutes(
  input: ShiftDurationInput,
): number | null {
  const start = toMinutes(input.startTime);
  const end = toMinutes(input.endTime);
  if (start === null || end === null) return null;

  // Overnight shifts are out of scope for the current payroll engine.
  if (end <= start) return null;

  let total = end - start;

  if (input.breakDeducted !== false && input.breakStart && input.breakEnd) {
    const breakStart = toMinutes(input.breakStart);
    const breakEnd = toMinutes(input.breakEnd);

    if (breakStart !== null && breakEnd !== null && breakEnd > breakStart) {
      const overlap =
        Math.min(end, breakEnd) - Math.max(start, breakStart);
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
