import axios, { type AxiosRequestConfig } from 'axios';
import { message } from 'antd';

import { clearSession, getAccessToken } from '../../features/auth/authClient';
import { ApiError, type ApiEnvelope, type ApiErrorResponse } from './api.types';

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

export function unwrapApiEnvelope<T>(body: unknown): T {
  if (!isApiEnvelope<T>(body)) {
    throw new ApiError({
      message: 'Phản hồi API không đúng định dạng',
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

export function getFilenameFromContentDisposition(value?: string): string | null {
  if (!value) {
    return null;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replaceAll('"', '').trim());
  }

  const asciiMatch = /filename="?([^";]+)"?/i.exec(value);
  return asciiMatch?.[1]?.trim() || null;
}

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
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
          message: error.message || 'Không thể kết nối đến API',
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

export const api = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.get(url, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.post(url, data, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.patch(url, data, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.delete(url, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async upload<T>(url: string, file: File, data?: Record<string, string | Blob>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(data ?? {}).forEach(([key, value]) => formData.append(key, value));
    const response = await axiosInstance.post(url, formData);
    return unwrapApiEnvelope<T>(response.data);
  },

  async download(
    url: string,
    filenameFallback: string,
    params?: Record<string, unknown>,
  ): Promise<void> {
    const response = await axiosInstance.get(url, {
      params,
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] ?? '');

    if (contentType.includes('application/json')) {
      const text = await (response.data as Blob).text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new ApiError({
          message: 'Tải file thất bại',
          statusCode: response.status,
          errorCode: 'DOWNLOAD_FAILED',
        });
      }
      unwrapApiEnvelope<never>(json);
      return;
    }

    const filename =
      getFilenameFromContentDisposition(response.headers['content-disposition']) ??
      filenameFallback;
    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },
};
