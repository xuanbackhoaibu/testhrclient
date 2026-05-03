import axios, { type AxiosRequestConfig } from 'axios';
import { clearSession, getAccessToken } from '../features/auth/authClient';
import { unwrapApiEnvelope } from '../shared/api/httpClient';
import { handleAxiosResponseError } from '../shared/api/errorHandler';

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
  (error) =>
    handleAxiosResponseError(error, () => {
      clearSession();
      window.location.assign('/login');
    }),
);

export const authAdminApi = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminAxiosInstance.get(url, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminAxiosInstance.post(url, data, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminAxiosInstance.patch(url, data, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminAxiosInstance.put(url, data, config);
    return unwrapApiEnvelope<T>(response.data);
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await authAdminAxiosInstance.delete(url, config);
    return unwrapApiEnvelope<T>(response.data);
  },
};
