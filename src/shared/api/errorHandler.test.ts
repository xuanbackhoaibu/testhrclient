import { describe, expect, it, vi } from "vitest";
import type { AxiosError } from "axios";

const notificationsShow = vi.fn();
vi.mock("@mantine/notifications", () => ({
  notifications: { show: (...args: unknown[]) => notificationsShow(...args) },
}));
vi.mock("../../features/leave/leaveDurationErrorMessage", () => ({
  getLeaveDurationErrorMessage: () => null,
}));

import { handleAxiosResponseError } from "./errorHandler";
import { ApiError } from "./api.types";

function fakeAxiosError(status: number, data: unknown): AxiosError {
  return {
    isAxiosError: true,
    name: "AxiosError",
    message: "Request failed",
    config: { method: "post", url: "/users/x/permission-overrides" },
    response: { status, data, headers: {} },
    toJSON: () => ({}),
  } as unknown as AxiosError;
}

describe("handleAxiosResponseError — chat-auth x-api-contract:2 nested error.code", () => {
  it("extracts errorCode from the nested error.code field and shows the specific message", async () => {
    const error = fakeAxiosError(403, {
      success: false,
      statusCode: 403,
      message: "Quyền này thuộc nhóm nhạy cảm — bạn không đủ thẩm quyền để cấp/gỡ quyền này.",
      error: { code: "SENSITIVE_ASSIGNMENT_DENIED" },
      requestId: "req-1",
    });

    const rejected = await handleAxiosResponseError(error, () => undefined).catch(
      (e: ApiError) => e,
    );
    expect(rejected).toBeInstanceOf(ApiError);
    expect(rejected.errorCode).toBe("SENSITIVE_ASSIGNMENT_DENIED");
    expect(rejected.userNotified).toBe(true);

    const [call] = notificationsShow.mock.calls.at(-1)!;
    expect(call.message).toContain("Bạn không được phép thay đổi quyền nhạy cảm");
    expect(call.message).toContain("req-1");
    expect(call.message).not.toContain("[object Object]");
  });

  it("still supports hr-api-service's top-level errorCode (backward compatible)", async () => {
    const error = fakeAxiosError(409, {
      success: false,
      statusCode: 409,
      message: "Dữ liệu bị xung đột",
      errorCode: "LAST_ADMIN_PROTECTED",
      requestId: "req-2",
    });

    const rejected = await handleAxiosResponseError(error, () => undefined).catch(
      (e: ApiError) => e,
    );
    expect(rejected.errorCode).toBe("LAST_ADMIN_PROTECTED");
    const [call] = notificationsShow.mock.calls.at(-1)!;
    expect(call.message).toContain("quản trị viên cuối cùng");
  });

  it("falls back to a safe generic message when no known errorCode is present, never renders raw JSON", async () => {
    const error = fakeAxiosError(500, {
      success: false,
      statusCode: 500,
      message: "Đã xảy ra lỗi ngoài mong muốn",
      error: { code: "INTERNAL_ERROR" },
      requestId: "req-3",
    });

    await handleAxiosResponseError(error, () => undefined).catch(() => undefined);
    const [call] = notificationsShow.mock.calls.at(-1)!;
    expect(call.message).not.toMatch(/\{|\[object/);
    expect(call.message).toContain("req-3");
  });

  it("network errors without a response body never crash and reject with a safe ApiError", async () => {
    const error = {
      isAxiosError: true,
      name: "AxiosError",
      message: "Network Error",
      config: { method: "get", url: "/x" },
      toJSON: () => ({}),
    } as unknown as AxiosError;

    const rejected = await handleAxiosResponseError(error, () => undefined).catch(
      (e: ApiError) => e,
    );
    expect(rejected).toBeInstanceOf(ApiError);
    expect(rejected.errorCode).toBe("NETWORK_ERROR");
    expect(rejected.userNotified).toBe(false);
  });
});
