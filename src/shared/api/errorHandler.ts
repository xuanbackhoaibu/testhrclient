import { message } from 'antd';
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
  403: 'Ban khong co quyen thuc hien thao tac nay.',
  404: 'Khong tim thay du lieu yeu cau.',
  409: 'Du lieu da ton tai hoac xung dot. Vui long kiem tra lai.',
  429: 'Qua nhieu yeu cau. Vui long thu lai sau.',
  500: 'Loi he thong. Vui long thu lai hoac lien he quan tri vien.',
  502: 'May chu khong phan hoi. Vui long thu lai sau.',
  503: 'Dich vu dang bao tri. Vui long thu lai sau.',
};

function appendRequestId(messageText: string, requestId?: string): string {
  return requestId ? `${messageText} (requestId: ${requestId})` : messageText;
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
        message: error.message || 'Khong the ket noi den may chu.',
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
    window.location.assign('/change-password');
    return Promise.reject(apiError);
  }

  if (apiError.statusCode === 403) {
    const requiredPermissions =
      apiError.requiredPermissions?.length
        ? ` Required permission: ${apiError.requiredPermissions.join(', ')}.`
        : '';
    message.error(
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

    message.error(
      appendRequestId(apiError.message || STATUS_MESSAGES[404], apiError.requestId),
    );
    return Promise.reject(apiError);
  }

  if (apiError.statusCode === 422) {
    const first = apiError.errors[0];
    const messageText = first
      ? `${first.field ? `[${first.field}] ` : ''}${first.message}`
      : apiError.message;
    message.error(appendRequestId(messageText, apiError.requestId));
    return Promise.reject(apiError);
  }

  if (apiError.statusCode === 409) {
    message.error(
      appendRequestId(apiError.message || STATUS_MESSAGES[409], apiError.requestId),
    );
    return Promise.reject(apiError);
  }

  const mapped = STATUS_MESSAGES[apiError.statusCode];
  if (mapped) {
    message.error(appendRequestId(mapped, apiError.requestId));
    return Promise.reject(apiError);
  }

  return Promise.reject(apiError);
}
