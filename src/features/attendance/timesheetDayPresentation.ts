import type { TimesheetGridDay } from "./timesheetTypes";

/** Ký hiệu nghỉ theo ca tuần do backend ghi xuống; chỉ ẩn khi HIỂN THỊ. */
const WEEKLY_OFF_SYMBOL = "OFF";
import { isWeeklyTemplateAssignmentSource } from "./shiftAssignmentWeekdays";

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
    day?.firstPunch ||
      day?.lastPunch ||
      typeof day?.totalMinutes === "number",
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
 * thuộc ca gì. Ô làm việc bình thường vì thế hiện thẳng mã ca đã tính; nửa
 * công giữ hậu tố `-` để không mất thông tin `+`/`-` vốn có.
 *
 * Chỉ thay phần hiển thị: `displaySymbol` lưu trong DB, số liệu BCC và file
 * Excel vẫn dùng nguyên `+`/`-` qua `timesheetDayDisplayValue`.
 */
export function timesheetDayShiftDisplayValue(
  day:
    | (AttendanceEventDay & Pick<TimesheetGridDay, "shiftCode">)
    | undefined,
): string {
  /*
   * Ngày liền sau ca đêm chỉ còn giờ RA của ca hôm trước. Công đã tính trọn
   * vào ngày bắt đầu ca nên ô này 0 công — nhưng để trống thì HR đọc thành
   * "chưa phân ca". Hiện `→` cho thấy ca hôm trước kéo sang tới đây.
   */
  if (day?.source === "OVERNIGHT_TAIL") return "→";
  const label = timesheetDayDisplayValue(day);
  // Ngày nghỉ theo ca tuần lặp lại hàng tuần: in chữ `OFF` kín cột chủ nhật
  // làm rối mắt, che mất các ô cần chú ý. Để trống — nền xám của ô đã đủ
  // cho biết là ngày nghỉ, tooltip vẫn ghi "Nghỉ theo ca tuần".
  if (label === WEEKLY_OFF_SYMBOL) return "";
  const shiftCode = day?.shiftCode?.trim();
  if (!shiftCode) return label;
  // Chỉ ô công đi làm mới quy về mã ca. Nghỉ phép, ốm, lễ... giữ nguyên ký
  // hiệu nghiệp vụ vì mã ca không nói được lý do vắng.
  if (label === "+") return shiftCode;
  if (label === "-") return `${shiftCode}-`;
  return label;
}
