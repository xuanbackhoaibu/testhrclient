import { message } from "antd";
import type { AxiosError } from "axios";
import { ApiError, type ApiErrorResponse } from "./api.types";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isApiErrorResponse(v: unknown): v is ApiErrorResponse {
  return (
    isObject(v) &&
    v.success === false &&
    typeof v.statusCode === "number" &&
    typeof v.message === "string"
  );
}

async function parseJsonBlob(
  value: unknown,
  contentType?: string,
): Promise<unknown> {
  if (
    typeof Blob === "undefined" ||
    !(value instanceof Blob) ||
    !String(contentType ?? "").includes("application/json")
  ) {
    return value;
  }
  try {
    return JSON.parse(await value.text()) as unknown;
  } catch {
    return value;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu yêu cầu.",
  409: "Dữ liệu đã tồn tại hoặc xung đột. Vui lòng kiểm tra lại.",
  429: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
  500: "Lỗi hệ thống. Vui lòng thử lại hoặc liên hệ quản trị viên.",
  502: "Máy chủ không phản hồi. Vui lòng thử lại sau.",
  503: "Dịch vụ đang bảo trì. Vui lòng thử lại sau.",
};

export async function handleAxiosResponseError(
  error: AxiosError,
  onUnauthenticated: () => void,
): Promise<never> {
  const status = error.response?.status;
  const contentTypeHeader = error.response?.headers?.["content-type"];
  const contentType =
    typeof contentTypeHeader === "string" ? contentTypeHeader : undefined;
  const payload = await parseJsonBlob(error.response?.data, contentType);

  const apiError = isApiErrorResponse(payload)
    ? new ApiError(payload)
    : new ApiError({
        statusCode: status ?? 0,
        message: error.message || "Không thể kết nối đến máy chủ.",
        errorCode: status ? `HTTP_${status}` : "NETWORK_ERROR",
        requestId: error.response?.headers?.["x-request-id"] as
          | string
          | undefined,
      });

  if (apiError.statusCode === 401) {
    onUnauthenticated();
    return Promise.reject(apiError);
  }

  // 422: validation errors — show first field error, let component handle the rest
  if (apiError.statusCode === 422) {
    const first = apiError.errors[0];
    const msg = first
      ? `${first.field ? `[${first.field}] ` : ""}${first.message}`
      : apiError.message;
    message.error(msg);
    return Promise.reject(apiError);
  }

  // 409: conflict — show backend message if available, else fallback
  if (apiError.statusCode === 409) {
    message.error(apiError.message || STATUS_MESSAGES[409]);
    return Promise.reject(apiError);
  }

  // Other mapped statuses
  const mapped = STATUS_MESSAGES[apiError.statusCode];
  if (mapped) {
    message.error(mapped);
    return Promise.reject(apiError);
  }

  return Promise.reject(apiError);
}
