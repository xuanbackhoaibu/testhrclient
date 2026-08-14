export const ATTENDANCE_TIME_ZONE = "Asia/Ho_Chi_Minh";

/**
 * Creates the date-only value accepted by the assignment API in the
 * attendance business timezone. `formatToParts` avoids relying on a
 * browser's locale-specific output order.
 */
export function formatVietnamBusinessDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const readPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = readPart("year");
  const month = readPart("month");
  const day = readPart("day");

  if (!year || !month || !day) {
    throw new Error("Không thể định dạng ngày hiệu lực phân ca.");
  }

  return `${year}-${month}-${day}`;
}
