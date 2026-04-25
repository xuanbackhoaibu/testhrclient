import axios from 'axios';
import { message } from 'antd';

import { clearSession, getAccessToken } from '../../features/auth/authClient';

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status as number | undefined;

    if (status === 401) {
      clearSession();
      window.location.assign('/login');
    }

    if (status === 403) {
      message.error('Bạn không có quyền thực hiện thao tác này.');
    }

    return Promise.reject(error);
  },
);

