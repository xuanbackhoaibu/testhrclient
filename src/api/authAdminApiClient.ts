import axios, { type AxiosRequestConfig } from 'axios';
import {
  clearSession,
  getAccessToken,
  refreshCurrentAuthority,
  refreshSessionAuthority,
  setSessionUser,
} from '../features/auth/authClient';
import { useAuthStore } from '../features/auth/authStore';
import { unwrapApiEnvelope } from '../shared/api/httpClient';
import { handleAxiosResponseError } from '../shared/api/errorHandler';
import { isDefinitiveAuthRefreshFailure } from '../shared/api/authRefreshFailure';

function resolveAuthApiBaseUrl(): string {
  if (import.meta.env.VITE_AUTH_API_BASE_URL) {
    return import.meta.env.VITE_AUTH_API_BASE_URL;
  }
  const authBase =
    import.meta.env.VITE_AUTH_SERVICE_BASE_URL ??
    import.meta.env.VITE_CHAT_AUTH_BASE_URL;
  if (authBase) {
    return authBase.replace(/\/auth\/?$/, '');
  }
  if (import.meta.env.DEV) {
    console.warn(
      '[authAdminApi] VITE_AUTH_API_BASE_URL is not set and could not be derived from VITE_AUTH_SERVICE_BASE_URL. Auth-admin calls may fail.',
    );
  }
  return '';
}

export const authAdminApiClient = axios.create({
  baseURL: resolveAuthApiBaseUrl(),
  timeout: 15000,
  headers: {
    'x-api-contract': '2',
  },
});

// ─── Refresh token lock (same pattern as http-client) ─────────────────────────
let authRefreshPromise: Promise<void> | null = null;

async function handleAuthService401AndRetry(
  originalRequest: AxiosRequestConfig,
): Promise<unknown> {
  if (!authRefreshPromise) {
    authRefreshPromise = doAuthRefresh();
  }

  try {
    await authRefreshPromise;
    const newToken = getAccessToken();
    if (!newToken) {
      clearSession();
      window.location.assign('/login');
      return Promise.reject(new Error('No token after auth refresh'));
    }

    return await authAdminApiClient({
      ...originalRequest,
      headers: {
        ...originalRequest.headers,
        Authorization: `Bearer ${newToken}`,
      },
    });
  } catch (error) {
    authRefreshPromise = null;
    if ((error as { authorityRefreshFailed?: boolean })?.authorityRefreshFailed) {
      setSessionUser(null);
      return Promise.reject(error);
    }
    if (isDefinitiveAuthRefreshFailure(error)) {
      clearSession();
      window.location.assign('/login');
      return Promise.reject(new Error('Auth service refresh rejected'));
    }
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      useAuthStore.getState().setError('Tài khoản đã xác thực nhưng không còn quyền truy cập HRM.');
      return Promise.reject(error);
    }
    useAuthStore.getState().setError('Session refresh is temporarily unavailable. Please try again.');
    return Promise.reject(error);
  } finally {
    authRefreshPromise = null;
  }
}

async function doAuthRefresh(): Promise<void> {
  await refreshSessionAuthority();
}

authAdminApiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authAdminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
      _skipUnauthenticatedRedirect?: boolean;
    };

    if (originalRequest._retry) {
      return handleAxiosResponseError(error, () => {
        if (!originalRequest._skipUnauthenticatedRedirect) {
          clearSession();
          window.location.assign('/login');
        }
      });
    }

    if (
      error.response?.status === 401 &&
      originalRequest.headers?.Authorization &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      return handleAuthService401AndRetry(originalRequest);
    }

    if (error.response?.status === 403) {
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

export const authAdminApi = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminApiClient.get(url, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminApiClient.post(url, data, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminApiClient.patch(url, data, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminApiClient.put(url, data, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminApiClient.delete(url, config);
    return unwrapApiEnvelope<T>(response.data);
  },
};
