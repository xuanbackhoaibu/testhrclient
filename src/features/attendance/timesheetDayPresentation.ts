import type { TimesheetGridDay } from "./timesheetTypes";

/** Ký hiệu nghỉ theo ca tuần do backend ghi xuống; chỉ ẩn khi HIỂN THỊ. */
const WEEKLY_OFF_SYMBOL = "OFF";
import { isWeeklyTemplateAssignmentSource } from "./shiftAssignmentWeekdays";
import { overnightTailShiftCode } from "./shiftTime";

type AttendanceEventDay = Pick<
  TimesheetGridDay,
  | "displaySymbol"
  | "firstPunch"
  | "lastPunch"
  | "isWorkingDay"
  | "needsExplanation"
  | "source"
  | "totalMinutes"
>;

/** A template OFF is an explicit rest day, never an unassigned schedule. */
export function isWeeklyTemplateOffDay(
  day: Pick<TimesheetGridDay, "isWorkingDay" | "source"> | undefined,
): boolean {
  return Boolean(
    day &&
    isWeeklyTemplateAssignmentSource(day.source ?? "") &&
    !day.isWorkingDay,
  );
}

/** A question mark is meaningful only when there was a real attendance event. */
export function hasTimesheetAttendanceEvent(
  day: AttendanceEventDay | undefined,
): boolean {
  return Boolean(
    day?.firstPunch || day?.lastPunch || typeof day?.totalMinutes === "number",
  );
}

/** Keep the BCC grid's cell text aligned with the Excel exporter. */
export function timesheetDayDisplayValue(
  day: AttendanceEventDay | undefined,
): string {
  const symbol = day?.displaySymbol || "";
  if (symbol) return symbol;
  // A default-full decision is an explicit HR outcome. Older responses may
  // omit its redundant displaySymbol, but must still render the same `+`
  // used by the BCC and Excel contract. Do not infer a symbol for UNASSIGNED.
  if (day?.source === "DEFAULT_FULL_ATTENDANCE") return "+";
  return day?.needsExplanation && hasTimesheetAttendanceEvent(day) ? "?" : "";
}

export interface TimesheetDataGapCounts {
  /** Ô chưa có dữ liệu từ máy chấm công. Ca vẫn đã phân. */
  missingAttendance: number;
  /** Ô có chấm công nhưng chưa đủ căn cứ tính đủ công. */
  awaitingExplanation: number;
  /** Ô thật sự chưa phân ca — nhóm duy nhất cần sửa ở màn Phân ca. */
  unassigned: number;
}

export interface TimesheetDataGapDay {
  day: number;
  source?: string;
  needsExplanation?: boolean;
  firstPunch?: string | null;
  lastPunch?: string | null;
  totalMinutes?: number | null;
}

/**
 * Đếm vì sao các ô trên bảng công chưa có công, tách theo nguyên nhân.
 *
 * HR nhìn ô trống rất dễ kết luận "phân ca sai", trong khi phần lớn là thiếu
 * dữ liệu chấm công hoặc đang chờ giải trình — hai việc không sửa được ở màn
 * Phân ca. Tách ba nhóm để chỉ đúng nhóm `unassigned` mới dẫn HR về Phân ca.
 *
 * Bỏ qua ngày trong tương lai: chưa tới thì chưa thể có chấm công, đếm vào sẽ
 * báo động giả suốt nửa tháng cuối.
 */
export function countTimesheetDataGaps(
  rows: readonly { days?: readonly TimesheetDayGapInput[] }[],
  today: { year: number; month: number; day: number },
  gridPeriod: { year: number; month: number },
): TimesheetDataGapCounts {
  const isCurrentMonth =
    gridPeriod.year === today.year && gridPeriod.month === today.month;
  const isFuturePeriod =
    gridPeriod.year > today.year ||
    (gridPeriod.year === today.year && gridPeriod.month > today.month);
  if (isFuturePeriod) {
    return { missingAttendance: 0, awaitingExplanation: 0, unassigned: 0 };
  }

  let missingAttendance = 0;
  let awaitingExplanation = 0;
  let unassigned = 0;
  for (const row of rows) {
    for (const day of row.days ?? []) {
      if (isCurrentMonth && day.day > today.day) continue;
      if (day.source === "UNASSIGNED") {
        unassigned += 1;
        continue;
      }
      const hasEvent = hasTimesheetAttendanceEvent(day);
      if (day.source === "MISSING" && !hasEvent) {
        missingAttendance += 1;
        continue;
      }
      if (day.needsExplanation && hasEvent) {
        awaitingExplanation += 1;
      }
    }
  }
  return { missingAttendance, awaitingExplanation, unassigned };
}

type TimesheetDayGapInput = TimesheetDataGapDay & AttendanceEventDay;

/**
 * Ký hiệu ô bảng công theo cách đọc của màn Phân ca.
 *
 * HR đối chiếu hai màn liên tục: Phân ca hiện mã ca (HC2, HC4, Nghỉ), còn bảng
 * công lại hiện `+`/`-`, nên phải nhớ ngày nào ca nào mới biết ô đủ công đó
 * thuộc ca gì. Ô đi làm vì thế luôn hiện thẳng mã ca đã tính; phần công vẫn
 * nằm trong số liệu tổng hợp và không chen thêm dấu vào mã ca.
 *
 * Stored payroll symbols and totals stay unchanged; only UI/export labels are normalized.
 */
export function timesheetDayShiftDisplayValue(
  day:
    | (AttendanceEventDay & Pick<TimesheetGridDay, "shiftCode" | "holidayName">)
    | undefined,
  previousDay?:
    | Pick<TimesheetGridDay, "shiftCode" | "shiftStartTime" | "shiftEndTime">
    | undefined,
): string {
  /*
   * Ô bị ca đêm hôm trước chiếm: hiện lại chính mã ca đó (VH2 nằm ở cả hai ô)
   * để đọc thẳng thành "ca này kéo qua hai ngày".
   *
   * Căn cứ là CẤU HÌNH CA của ngày liền trước, không phải nguồn
   * `OVERNIGHT_TAIL` — nguồn đó chỉ được backend gắn khi máy chấm công có
   * thật một lượt chấm sót sang hôm sau, nên ca đêm chưa ai chấm (phần lớn
   * lưới) sẽ không bao giờ khớp. Ca đã phân là đã chiếm ô, bất kể có dữ liệu
   * chấm công hay chưa.
   */
  const tailCode = overnightTailShiftCode({
    code: previousDay?.shiftCode,
    startTime: previousDay?.shiftStartTime,
    endTime: previousDay?.shiftEndTime,
  });
  if (tailCode && !day?.shiftCode?.trim() && !day?.holidayName) {
    return tailCode;
  }
  const label = timesheetDayDisplayValue(day);
  // Ngày nghỉ theo ca tuần lặp lại hàng tuần: in chữ `OFF` kín cột chủ nhật
  // làm rối mắt, che mất các ô cần chú ý. Để trống — nền xám của ô đã đủ
  // cho biết là ngày nghỉ, tooltip vẫn ghi "Nghỉ theo ca tuần".
  if (label === WEEKLY_OFF_SYMBOL) return "";
  const shiftCode = day?.shiftCode?.trim();
  // +/- are internal work-fraction tokens. Keep them in payroll data, but
  // never expose them as labels; a composite such as P;- is shown as P.
  const businessLabel = label
    .split(";")
    .map((token) => token.trim())
    .filter((token) => token && token !== "+" && token !== "-")
    .join(";");
  if (!shiftCode) return businessLabel;
  if (!businessLabel) return shiftCode;
  return businessLabel;
}
