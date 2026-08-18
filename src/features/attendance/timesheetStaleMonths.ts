import { getStoredString, setStoredString } from "../../shared/utils/storage";

/**
 * Đánh dấu những kỳ công có lịch ca vừa đổi nhưng bảng công chưa tính lại.
 *
 * Phân ca ghi vào ShiftAssignment, còn bảng công đọc TimesheetDay đã tính sẵn;
 * backend trả cờ `recomputeRequired` nhưng trước đây không ai đọc, nên sau khi
 * phân ca xong bảng công vẫn giữ số cũ mà không có dấu hiệu gì. HR chỉ được
 * nhắc bằng một dòng trong toast, biến mất sau vài giây.
 *
 * Lưu ở localStorage chứ không ở server: đây là nhắc việc cho người vừa thao
 * tác trên máy này, không phải trạng thái nghiệp vụ. Nếu HR khác đã bấm cập
 * nhật thì dấu ở máy này thừa chứ không sai — bấm lại chỉ tốn một lần tính.
 */
const STALE_KEY = "hr-web-client.timesheetStaleMonths";

/** Số kỳ giữ lại; đủ cho vài tháng thao tác gần nhất mà không phình localStorage. */
const MAX_ENTRIES = 24;

export interface TimesheetPeriodKey {
  year: number;
  month: number;
}

function entryKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function readEntries(): string[] {
  const raw = getStoredString(STALE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function writeEntries(entries: readonly string[]): void {
  try {
    setStoredString(STALE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // Hết quota hoặc localStorage bị chặn — mất nhắc việc thì HR vẫn bấm cập
    // nhật thủ công được, không chặn thao tác.
  }
}

/** Ghi nhận một kỳ công vừa có thay đổi lịch ca. */
export function markTimesheetMonthStale(period: TimesheetPeriodKey): void {
  const key = entryKey(period.year, period.month);
  const entries = readEntries().filter((item) => item !== key);
  entries.push(key);
  writeEntries(entries);
  notifySubscribers();
}

/** Xoá dấu sau khi bảng công của kỳ đó đã được tính lại. */
export function clearTimesheetMonthStale(period: TimesheetPeriodKey): void {
  const key = entryKey(period.year, period.month);
  writeEntries(readEntries().filter((item) => item !== key));
  notifySubscribers();
}

export function isTimesheetMonthStale(period: TimesheetPeriodKey): boolean {
  return readEntries().includes(entryKey(period.year, period.month));
}

/*
 * localStorage không phát sự kiện trong cùng một tab, nên hai màn mở song song
 * trong cùng tab sẽ không thấy thay đổi của nhau nếu chỉ dựa vào `storage`.
 * Giữ danh sách subscriber ở đây để useSyncExternalStore cập nhật ngay.
 */
type Subscriber = () => void;
const subscribers = new Set<Subscriber>();

function notifySubscribers(): void {
  subscribers.forEach((subscriber) => subscriber());
}

export function subscribeTimesheetStaleMonths(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);
  // Tab khác đổi localStorage thì `storage` bắn ở tab này.
  window.addEventListener("storage", subscriber);
  return () => {
    subscribers.delete(subscriber);
    window.removeEventListener("storage", subscriber);
  };
}
