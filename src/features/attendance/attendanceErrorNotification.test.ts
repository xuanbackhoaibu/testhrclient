import { beforeEach, describe, expect, it, vi } from "vitest";

const notificationsShow = vi.fn();
vi.mock("@mantine/notifications", () => ({
  notifications: { show: (...args: unknown[]) => notificationsShow(...args) },
}));

import { ApiError } from "../../shared/api/api.types";
import { showAttendanceError } from "./attendanceErrorNotification";

describe("showAttendanceError", () => {
  beforeEach(() => notificationsShow.mockClear());

  it("does not duplicate an API error already shown by the HTTP interceptor", () => {
    const error = new ApiError({
      message: "Kỳ công đã chốt",
      statusCode: 409,
      errorCode: "TIMESHEET_PERIOD_CLOSED",
    });
    error.userNotified = true;

    showAttendanceError(error, "Không lưu được", "Vui lòng thử lại.");

    expect(notificationsShow).not.toHaveBeenCalled();
  });

  it("preserves a specific error when no notification has been shown", () => {
    showAttendanceError(
      new Error("Ngày kết thúc phải sau ngày bắt đầu"),
      "Không lưu được",
      "Vui lòng thử lại.",
    );

    expect(notificationsShow).toHaveBeenCalledWith({
      color: "red",
      title: "Không lưu được",
      message: "Ngày kết thúc phải sau ngày bắt đầu",
    });
  });

  it("uses the actionable fallback for an unknown failure", () => {
    showAttendanceError(
      null,
      "Không tải được",
      "Kiểm tra kết nối rồi thử lại.",
    );

    expect(notificationsShow).toHaveBeenCalledWith({
      color: "red",
      title: "Không tải được",
      message: "Kiểm tra kết nối rồi thử lại.",
    });
  });

  it("does not expose a technical transport message to HR", () => {
    const error = new ApiError({
      message: "Network Error",
      statusCode: 0,
      errorCode: "NETWORK_ERROR",
    });

    showAttendanceError(
      error,
      "Không tải được",
      "Kiểm tra kết nối rồi thử lại.",
    );

    expect(notificationsShow).toHaveBeenCalledWith({
      color: "red",
      title: "Không tải được",
      message: "Kiểm tra kết nối rồi thử lại.",
    });
  });
});
