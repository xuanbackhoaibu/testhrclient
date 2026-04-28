import axios from 'axios';
import { message } from 'antd';

import { clearSession, getAccessToken } from '../../features/auth/authClient';
import { ApiError, type ApiErrorResponse, type ApiSuccessResponse } from '../types/api';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSuccessEnvelope<T>(payload: unknown): payload is ApiSuccessResponse<T> {
  return (
    isObject(payload) &&
    payload.success === true &&
    typeof payload.statusCode === 'number' &&
    'data' in payload &&
    typeof payload.requestId === 'string'
  );
}

function isErrorEnvelope(payload: unknown): payload is ApiErrorResponse {
  return (
    isObject(payload) &&
    payload.success === false &&
    typeof payload.statusCode === 'number' &&
    typeof payload.message === 'string' &&
    typeof payload.errorCode === 'string'
  );
}

function isLegacyResponse(payload: unknown): boolean {
  return isObject(payload) && ('data' in payload || 'pagination' in payload || 'meta' in payload);
}

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
  (response) => {
    if (response.config.responseType === 'blob') {
      return response;
    }

    if (isSuccessEnvelope(response.data)) {
      response.data = response.data.data;
      return response;
    }

    if (isErrorEnvelope(response.data)) {
      throw new ApiError(response.data);
    }

    if (isLegacyResponse(response.data)) {
      if (import.meta.env.DEV) {
        console.warn('[api] Deprecated non-envelope response received', {
          url: response.config.url,
        });
      }
      return response;
    }

    throw new ApiError({
      success: false,
      statusCode: response.status,
      message: 'Phản hồi API không đúng định dạng',
      errorCode: 'INVALID_API_RESPONSE',
      errors: [],
      requestId: response.headers['x-request-id'] as string | undefined,
    });
  },
  (error) => {
    const status = error.response?.status as number | undefined;
    const payload = error.response?.data;

    const apiError = isErrorEnvelope(payload)
      ? new ApiError(payload)
      : new ApiError({
          success: false,
          statusCode: status ?? 0,
          message: error.message || 'Không thể kết nối đến API',
          errorCode: status ? `HTTP_${status}` : 'NETWORK_ERROR',
          errors: [],
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
