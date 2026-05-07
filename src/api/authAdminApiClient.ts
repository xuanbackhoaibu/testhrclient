import axios, { type AxiosRequestConfig } from 'axios';
import { clearSession, getAccessToken } from '../features/auth/authClient';
import { unwrapApiEnvelope } from '../shared/api/httpClient';
import { handleAxiosResponseError } from '../shared/api/errorHandler';

function resolveAuthApiBaseUrl(): string {
  // Explicit auth API base — points directly to chat-auth-service root (/api/v1)
  if (import.meta.env.VITE_AUTH_API_BASE_URL) {
    return import.meta.env.VITE_AUTH_API_BASE_URL;
  }
  // Derive from auth service base URL by stripping the trailing /auth segment
  const authBase =
    import.meta.env.VITE_AUTH_SERVICE_BASE_URL ??
    import.meta.env.VITE_CHAT_AUTH_BASE_URL;
  if (authBase) {
    return authBase.replace(/\/auth\/?$/, '');
  }
  // Should never reach here in a correctly configured environment
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

authAdminApiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authAdminApiClient.interceptors.response.use(
  (response) => response,
  (error) =>
    handleAxiosResponseError(error, () => {
      clearSession();
      window.location.assign('/login');
    }),
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
