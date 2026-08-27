// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearTimesheetMonthStale,
  isTimesheetMonthStale,
  markCurrentTimesheetMonthStale,
  markTimesheetMonthStale,
} from "./timesheetStaleMonths";

describe("đánh dấu kỳ công cần tính lại", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("kỳ chưa đụng tới thì không bị đánh dấu", () => {
    expect(isTimesheetMonthStale({ year: 2026, month: 8 })).toBe(false);
  });

  it("đánh dấu rồi thì đọc lại thấy", () => {
    markTimesheetMonthStale({ year: 2026, month: 8 });
    expect(isTimesheetMonthStale({ year: 2026, month: 8 })).toBe(true);
  });

  it("chỉ đánh dấu đúng kỳ, không lan sang kỳ khác", () => {
    markTimesheetMonthStale({ year: 2026, month: 8 });
    expect(isTimesheetMonthStale({ year: 2026, month: 9 })).toBe(false);
    expect(isTimesheetMonthStale({ year: 2025, month: 8 })).toBe(false);
  });

  it("phân biệt tháng 8 với tháng 8 của năm khác", () => {
    markTimesheetMonthStale({ year: 2025, month: 8 });
    markTimesheetMonthStale({ year: 2026, month: 8 });
    clearTimesheetMonthStale({ year: 2025, month: 8 });
    expect(isTimesheetMonthStale({ year: 2025, month: 8 })).toBe(false);
    expect(isTimesheetMonthStale({ year: 2026, month: 8 })).toBe(true);
  });

  it("xoá dấu sau khi đã tính lại", () => {
    markTimesheetMonthStale({ year: 2026, month: 8 });
    clearTimesheetMonthStale({ year: 2026, month: 8 });
    expect(isTimesheetMonthStale({ year: 2026, month: 8 })).toBe(false);
  });

  it("đánh dấu nhiều lần cùng một kỳ không tạo bản ghi trùng", () => {
    markTimesheetMonthStale({ year: 2026, month: 8 });
    markTimesheetMonthStale({ year: 2026, month: 8 });
    clearTimesheetMonthStale({ year: 2026, month: 8 });
    // Nếu bị lưu trùng thì một lần xoá sẽ không gỡ hết dấu.
    expect(isTimesheetMonthStale({ year: 2026, month: 8 })).toBe(false);
  });

  it("dữ liệu localStorage hỏng thì coi như chưa đánh dấu, không ném lỗi", () => {
    window.localStorage.setItem(
      "hr-web-client.timesheetStaleMonths",
      "{khong-phai-json",
    );
    expect(isTimesheetMonthStale({ year: 2026, month: 8 })).toBe(false);
  });

  it("giữ được nhiều kỳ cùng lúc", () => {
    markTimesheetMonthStale({ year: 2026, month: 7 });
    markTimesheetMonthStale({ year: 2026, month: 8 });
    expect(isTimesheetMonthStale({ year: 2026, month: 7 })).toBe(true);
    expect(isTimesheetMonthStale({ year: 2026, month: 8 })).toBe(true);
  });
});

/*
 * Sửa danh mục Ca làm việc (đổi giờ ca hoặc số công) làm đổi kết quả của MỌI
 * ngày đã phân ca đó. Không gắn với một kỳ cụ thể như phân ca, nên đánh dấu kỳ
 * HR đang làm việc — nơi họ sẽ nhìn thấy số lệch đầu tiên.
 */
describe("đánh dấu sau khi sửa danh mục ca", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("đánh dấu đúng kỳ của tháng hiện tại", () => {
    const now = new Date();
    markCurrentTimesheetMonthStale();
    expect(
      isTimesheetMonthStale({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      }),
    ).toBe(true);
  });
});
