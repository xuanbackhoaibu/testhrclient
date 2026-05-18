import axios, { type AxiosRequestConfig } from 'axios';

import { clearSession, getAccessToken } from '../../features/auth/authClient';
import { ApiError, type ApiEnvelope } from './api.types';
import { handleAxiosResponseError } from './errorHandler';

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
  } catch {
    // Refresh failed — clear session and redirect
    refreshPromise = null;
    clearSession();
    window.location.assign('/login');
    return Promise.reject(new Error('Session refresh failed'));
  } finally {
    refreshPromise = null;
  }
}

async function doRefreshSession(): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No token to refresh');
  }

  try {
    const baseURL = import.meta.env.VITE_HR_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL;
    await axios.get(`${baseURL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    // If /auth/me succeeds, the token is still valid.
    // The caller will retry the original request with the same token.
    // The 401 was likely a temporary token expiry on the auth-service side.
  } catch (error) {
    // If /auth/me also returns 401/403, the token is definitely invalid.
    throw error;
  }
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
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If this request already went through a 401 retry, don't loop
    if (originalRequest._retry) {
      return handleAxiosResponseError(error, () => {
        clearSession();
        window.location.assign('/login');
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
