import { notifications } from '@mantine/notifications';
import type { AxiosError } from 'axios';

import { ApiError, type ApiErrorResponse } from './api.types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    isObject(value) &&
    value.success === false &&
    typeof value.statusCode === 'number' &&
    typeof value.message === 'string'
  );
}

async function parseJsonBlob(
  value: unknown,
  contentType?: string,
): Promise<unknown> {
  if (
    typeof Blob === 'undefined' ||
    !(value instanceof Blob) ||
    !String(contentType ?? '').includes('application/json')
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
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  409: 'Dữ liệu đã tồn tại hoặc xung đột. Vui lòng kiểm tra lại.',
  429: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
  500: 'Lỗi hệ thống. Vui lòng thử lại hoặc liên hệ quản trị viên.',
  502: 'Máy chủ không phản hồi. Vui lòng thử lại sau.',
  503: 'Dịch vụ đang bảo trì. Vui lòng thử lại sau.',
};

function appendRequestId(messageText: string, requestId?: string): string {
  return requestId ? `${messageText} (requestId: ${requestId})` : messageText;
}

function showError(msg: string): void {
  notifications.show({ color: 'red', message: msg });
}

export async function handleAxiosResponseError(
  error: AxiosError,
  onUnauthenticated: () => void,
): Promise<never> {
  const status = error.response?.status;
  const contentTypeHeader = error.response?.headers?.['content-type'];
  const contentType =
    typeof contentTypeHeader === 'string' ? contentTypeHeader : undefined;
  const payload = await parseJsonBlob(error.response?.data, contentType);

  const apiError = isApiErrorResponse(payload)
    ? new ApiError(payload)
    : new ApiError({
        statusCode: status ?? 0,
        message: error.message || 'Không thể kết nối đến máy chủ.',
        errorCode: status ? `HTTP_${status}` : 'NETWORK_ERROR',
        requestId: error.response?.headers?.['x-request-id'] as
          | string
          | undefined,
      });

  if (import.meta.env.DEV) {
    console.error('[HR API ERROR]', {
      method: error.config?.method?.toUpperCase() ?? 'UNKNOWN',
      url: error.config?.url ?? 'UNKNOWN',
      status: apiError.statusCode,
      message: apiError.message,
      errorCode: apiError.errorCode,
      requestId: apiError.requestId,
      response: payload,
    });
  }

  if (apiError.statusCode === 401) {
    onUnauthenticated();
    return Promise.reject(apiError);
  }

  if (
    apiError.statusCode === 403 &&
    apiError.errorCode === 'CHANGE_PASSWORD_REQUIRED'
  ) {
    if (window.location.pathname !== '/change-password') {
      window.location.assign('/change-password');
    }
    return Promise.reject(apiError);
  }

  if (apiError.statusCode === 403) {
    const requiredPermissions =
      apiError.requiredPermissions?.length
        ? ` Quyền yêu cầu: ${apiError.requiredPermissions.join(', ')}.`
        : '';
    showError(
      appendRequestId(
        `${apiError.message || STATUS_MESSAGES[403]}${requiredPermissions}`,
        apiError.requestId,
      ),
    );
    return Promise.reject(apiError);
  }

  if (apiError.statusCode === 404) {
    if (import.meta.env.DEV) {
      console.debug('[api-404]', {
        method: error.config?.method?.toUpperCase() ?? 'UNKNOWN',
        url: error.config?.url ?? 'UNKNOWN',
        requestId: apiError.requestId,
        response: payload,
      });
    }

    showError(appendRequestId(apiError.message || STATUS_MESSAGES[404], apiError.requestId));
    return Promise.reject(apiError);
  }

  if (apiError.statusCode === 422) {
    const first = apiError.errors[0];
    const messageText = first
      ? `${first.field ? `[${first.field}] ` : ''}${first.message}`
      : apiError.message;
    showError(appendRequestId(messageText, apiError.requestId));
    return Promise.reject(apiError);
  }

  if (apiError.statusCode === 409) {
    showError(appendRequestId(apiError.message || STATUS_MESSAGES[409], apiError.requestId));
    return Promise.reject(apiError);
  }

  const mapped = STATUS_MESSAGES[apiError.statusCode];
  if (mapped) {
    showError(appendRequestId(mapped, apiError.requestId));
    return Promise.reject(apiError);
  }

  return Promise.reject(apiError);
}
