import axios, { type AxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { clearSession, getAccessToken } from '../features/auth/authClient';
import { ApiError, type ApiEnvelope, type ApiErrorResponse } from '../shared/api/api.types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isApiEnvelope<T>(body: unknown): body is ApiEnvelope<T> {
  return (
    isObject(body) &&
    typeof body.success === 'boolean' &&
    typeof body.statusCode === 'number'
  );
}

function isApiErrorResponse(body: unknown): body is ApiErrorResponse {
  return (
    isObject(body) &&
    body.success === false &&
    typeof body.statusCode === 'number' &&
    typeof body.message === 'string'
  );
}

async function parseJsonBlob(value: unknown, contentType?: string): Promise<unknown> {
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

function unwrapEnvelope<T>(body: unknown): T {
  if (!isApiEnvelope<T>(body)) {
    const errorMessage =
      isObject(body) && typeof body.message === 'string'
        ? body.message
        : 'Phản hồi API không đúng định dạng';
    throw new ApiError({
      message: errorMessage,
      statusCode: 0,
      errorCode: 'INVALID_API_RESPONSE',
    });
  }

  if (body.success === false) {
    throw new ApiError({
      message: body.message || 'Yêu cầu thất bại',
      statusCode: body.statusCode,
      errorCode: body.errorCode,
      requestId: body.requestId,
      errors: body.errors,
    });
  }

  return body.data;
}

export const authAdminAxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'x-api-contract': '2',
  },
});

authAdminAxiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authAdminAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status as number | undefined;
    const payload = await parseJsonBlob(
      error.response?.data,
      error.response?.headers?.['content-type'],
    );
    const apiError = isApiErrorResponse(payload)
      ? new ApiError(payload)
      : new ApiError({
          statusCode: status ?? 0,
          message: error.message || 'Không thể kết nối đến Auth API',
          errorCode: status ? `HTTP_${status}` : 'NETWORK_ERROR',
          requestId: error.response?.headers?.['x-request-id'],
        });

    if (apiError.statusCode === 401) {
      clearSession();
      window.location.assign('/login');
    }

    if (apiError.statusCode === 403) {
      message.error('Bạn không có quyền thực hiện thao tác này.');
    }

    return Promise.reject(apiError);
  },
);

export const authAdminApi = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminAxiosInstance.get(url, config);
    return unwrapEnvelope<T>(response.data);
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminAxiosInstance.post(url, data, config);
    return unwrapEnvelope<T>(response.data);
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminAxiosInstance.patch(url, data, config);
    return unwrapEnvelope<T>(response.data);
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminAxiosInstance.put(url, data, config);
    return unwrapEnvelope<T>(response.data);
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminAxiosInstance.delete(url, config);
    return unwrapEnvelope<T>(response.data);
  },
};
