import axios, { type AxiosRequestConfig } from 'axios';

import {
  clearSession,
  getAccessToken,
  refreshCurrentAuthority,
  refreshSessionAuthority,
  setSessionUser,
} from '../../features/auth/authClient';
import { useAuthStore } from '../../features/auth/authStore';
import { ApiError, type ApiEnvelope } from './api.types';
import { handleAxiosResponseError } from './errorHandler';
import { isDefinitiveAuthRefreshFailure } from './authRefreshFailure';

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

type SaveFileHandle = {
  name: string;
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type SaveFilePicker = (options: {
  suggestedName: string;
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<SaveFileHandle>;

export type SaveLocationDownloadResult =
  | { status: 'saved'; filename: string }
  | { status: 'cancelled' }
  | { status: 'unsupported' };

function getSaveFilePicker(): SaveFilePicker | undefined {
  return (
    window as typeof window & { showSaveFilePicker?: SaveFilePicker }
  ).showSaveFilePicker;
}

async function requestDownloadFile(
  url: string,
  filenameFallback: string,
  params?: Record<string, unknown>,
): Promise<{ blob: Blob; filename: string }> {
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
    throw new ApiError({
      message: 'Tải file thất bại',
      statusCode: response.status,
      errorCode: 'DOWNLOAD_FAILED',
    });
  }

  return {
    blob: response.data as Blob,
    filename:
      getFilenameFromContentDisposition(response.headers['content-disposition']) ??
      filenameFallback,
  };
}

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_HR_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});

// ─── Refresh token lock ──────────────────────────────────────────────────────
// Prevents multiple simultaneous 401 refresh attempts (request queuing).
let refreshPromise: Promise<void> | null = null;

/**
 * Called when any API call returns 401.
 * Refreshes the session by re-fetching the current user.
 * If successful, the original request is retried.
 * If failed, the session is cleared and the user is redirected to login.
 */
async function handle401AndRetry(
  originalRequest: AxiosRequestConfig,
): Promise<unknown> {
  if (!refreshPromise) {
    refreshPromise = doRefreshSession();
  }

  try {
    await refreshPromise;
    // Refresh succeeded — retry original request with fresh token
    const newToken = getAccessToken();
    if (!newToken) {
      clearSession();
      window.location.assign('/login');
      return Promise.reject(new Error('No access token after refresh'));
    }

    const response = await axiosInstance({
      ...originalRequest,
      headers: {
        ...originalRequest.headers,
        Authorization: `Bearer ${newToken}`,
      },
    });
    return response;
  } catch (error) {
    // Refresh failed — clear session and redirect
    refreshPromise = null;
    if ((error as { authorityRefreshFailed?: boolean })?.authorityRefreshFailed) {
      setSessionUser(null);
      return Promise.reject(error);
    }
    if (isDefinitiveAuthRefreshFailure(error)) {
      clearSession();
      window.location.assign('/login');
      return Promise.reject(new Error('Session refresh rejected'));
    }
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      useAuthStore.getState().setError('Tài khoản đã xác thực nhưng không còn quyền truy cập HRM.');
      return Promise.reject(error);
    }
    useAuthStore.getState().setError('Session refresh is temporarily unavailable. Please try again.');
    return Promise.reject(error);
  } finally {
    refreshPromise = null;
  }
}

async function doRefreshSession(): Promise<void> {
  await refreshSessionAuthority();
}

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
      _skipUnauthenticatedRedirect?: boolean;
    };

    // If this request already went through a 401 retry, don't loop
    if (originalRequest._retry) {
      return handleAxiosResponseError(error, () => {
        if (!originalRequest._skipUnauthenticatedRedirect) {
          clearSession();
          window.location.assign('/login');
        }
      });
    }

    // Only intercept 401 for authenticated endpoints (has Authorization header)
    if (
      error.response?.status === 401 &&
      originalRequest.headers?.Authorization &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      return handle401AndRetry(originalRequest);
    }

    if (error.response?.status === 403) {
      // A denied request can indicate that authority changed after this page
      // rendered. Refresh once for subsequent UI decisions; never retry the
      // denied mutation automatically.
      void refreshCurrentAuthority().catch(() => undefined);
    }

    const responseCode = error.response?.data?.errorCode ?? error.response?.data?.code;
    if (
      error.response?.status === 503 &&
      typeof responseCode === 'string' &&
      responseCode.includes('AUTH')
    ) {
      setSessionUser(null);
      useAuthStore.getState().setError('Dịch vụ authority tạm thời không khả dụng.');
    }

    return handleAxiosResponseError(error, () => {
      clearSession();
      window.location.assign('/login');
    });
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

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.put(url, data, config);
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
    const { blob, filename } = await requestDownloadFile(
      url,
      filenameFallback,
      params,
    );
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },

  /**
   * Hộp thoại hệ điều hành để người dùng tự chọn thư mục và tên file.
   * Không fallback sang tự tải nhằm tránh lưu file khi HR chưa chọn vị trí.
   */
  async downloadToSelectedLocation(
    url: string,
    filenameFallback: string,
    params?: Record<string, unknown>,
  ): Promise<SaveLocationDownloadResult> {
    const saveFilePicker = getSaveFilePicker();
    if (!saveFilePicker) {
      return { status: 'unsupported' };
    }

    let fileHandle: SaveFileHandle;
    try {
      fileHandle = await saveFilePicker({
        suggestedName: filenameFallback,
        types: [
          {
            description: 'Tệp Excel',
            accept: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
                '.xlsx',
              ],
            },
          },
        ],
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { status: 'cancelled' };
      }
      throw error;
    }

    const { blob } = await requestDownloadFile(url, filenameFallback, params);
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { status: 'saved', filename: fileHandle.name };
  },
};
