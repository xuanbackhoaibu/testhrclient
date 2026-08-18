import { useCallback, useSyncExternalStore } from "react";

import {
  isTimesheetMonthStale,
  subscribeTimesheetStaleMonths,
} from "./timesheetStaleMonths";

/**
 * Cho biết kỳ công đang xem có lịch ca đổi mà bảng công chưa tính lại hay không.
 *
 * Dùng useSyncExternalStore để màn Bảng công cập nhật ngay khi màn Phân ca ghi
 * dấu, kể cả khi hai màn nằm trong cùng một tab — localStorage không tự phát
 * sự kiện `storage` cho tab đã ghi.
 *
 * Nhận year/month rời thay vì một object kỳ công: object tạo mới mỗi render sẽ
 * làm snapshot đổi tham chiếu liên tục và useSyncExternalStore render vô hạn.
 */
export function useTimesheetMonthStale(year: number, month: number): boolean {
  const getSnapshot = useCallback(
    () => isTimesheetMonthStale({ year, month }),
    [month, year],
  );
  return useSyncExternalStore(
    subscribeTimesheetStaleMonths,
    getSnapshot,
    () => false,
  );
}
