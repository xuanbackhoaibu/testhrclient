import { notifications } from '@mantine/notifications';
import type { AxiosError } from 'axios';

import { getLeaveDurationErrorMessage } from '../../features/leave/leaveDurationErrorMessage';
import { ApiError, type ApiErrorResponse } from './api.types';
import { isPlainRecord } from '../utils/isPlainRecord';

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    isPlainRecord(value) &&
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
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  409: 'Dữ liệu đã tồn tại hoặc xung đột. Vui lòng kiểm tra lại.',
  429: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
  500: 'Lỗi hệ thống. Vui lòng thử lại hoặc liên hệ quản trị viên.',
  502: 'Máy chủ không phản hồi. Vui lòng thử lại sau.',
  503: 'Dịch vụ đang bảo trì. Vui lòng thử lại sau.',
};

const AUTHORIZATION_MESSAGES: Record<string, string> = {
  PERMISSION_DENIED: 'Bạn thiếu quyền hành động bắt buộc.',
  SCOPE_DENIED: 'Bạn có quyền hành động nhưng resource nằm ngoài phạm vi được cấp.',
  RESOURCE_ACCESS_DENIED: 'Quan hệ sở hữu hoặc quan hệ nghiệp vụ không cho phép truy cập resource này.',
  SENSITIVE_ASSIGNMENT_DENIED: 'Bạn không được phép thay đổi quyền nhạy cảm.',
  SENSITIVE_REVOCATION_DENIED: 'Bạn không được phép thu hồi quyền nhạy cảm.',
  SENSITIVE_SELF_ROLE_CHANGE_DENIED: 'Không được tự thay đổi role nhạy cảm của chính mình.',
  SENSITIVE_SELF_PERMISSION_CHANGE_DENIED: 'Không được tự thay đổi permission nhạy cảm của chính mình.',
  SENSITIVE_SELF_GROUP_CHANGE_DENIED: 'Không được tự thay đổi nhóm quyền nhạy cảm của chính mình.',
  SENSITIVE_ROLE_CHANGE_REASON_REQUIRED: 'Phải nhập lý do khi thay đổi role nhạy cảm.',
  SENSITIVE_PERMISSION_CHANGE_REASON_REQUIRED: 'Phải nhập lý do khi thay đổi permission nhạy cảm.',
  SENSITIVE_GROUP_CHANGE_REASON_REQUIRED: 'Phải nhập lý do khi thay đổi nhóm quyền nhạy cảm.',
  DIRECT_DENY_REASON_REQUIRED: 'Direct deny bắt buộc phải có lý do.',
  REDUNDANT_DIRECT_ALLOW: 'Không thể thêm direct allow đã được kế thừa từ role hoặc nhóm quyền.',
  LAST_ADMIN_PROTECTED: 'Không thể thu hồi quản trị viên cuối cùng.',
  STALE_AUTHORITY_VERSION: 'Phân quyền đã thay đổi. Dữ liệu quyền sẽ được tải lại trước khi lưu tiếp.',
  AUTHORITY_SERVICE_UNAVAILABLE: 'Không xác minh được quyền lúc này. Hệ thống không dùng quyền cũ; vui lòng thử lại thủ công.',
  PROVISION_UNIQUE_CONFLICT_RETRY_REQUIRED: 'Tài khoản đang được một yêu cầu khác xử lý, vui lòng thử lại.',
  HR_PROJECTION_STALE_EMPLOYEE_CODE: 'Mã nhân viên không khớp với dữ liệu nhân sự hiện tại. Vui lòng tải lại và thử lại.',
  HR_PROJECTION_EMPLOYEE_CODE_INVALID: 'Mã nhân viên trong dữ liệu HR không hợp lệ.',
  EMPLOYEE_CODE_ALREADY_BOUND_TO_ANOTHER_HRM_IDENTITY: 'Mã nhân viên này đã được liên kết với một tài khoản khác.',
  AUTH_USER_IDENTITY_CONFLICT: 'Tài khoản đã được liên kết với một định danh nhân sự khác.',
  AUTH_USER_PROJECTION_CONFLICT: 'Tài khoản đã được liên kết với một hồ sơ nhân sự khác.',
  EMAIL_ALREADY_EXISTS: 'Email đã được sử dụng bởi tài khoản khác.',
};

function appendRequestId(messageText: string, requestId?: string): string {
  return requestId ? `${messageText} (requestId: ${requestId})` : messageText;
}

function showError(msg: string): void {
  notifications.show({ color: 'red', message: msg });
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
        message: error.message || 'Không thể kết nối đến máy chủ.',
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

  if (apiError.statusCode === 403) {
    const errorCode = apiError.errorCode;

    if (errorCode === 'CHANGE_PASSWORD_REQUIRED') {
      if (window.location.pathname !== '/change-password') {
        window.location.assign('/change-password');
      }
      return Promise.reject(apiError);
    }

    if (errorCode === 'NO_HRM_ACCESS' || errorCode === 'AUTHENTICATED_BUT_NO_HRM_ACCESS') {
      showError(
        appendRequestId(
          'Tài khoản đã đăng nhập nhưng chưa được cấp quyền truy cập HRM. Vui lòng liên hệ quản trị viên.',
          apiError.requestId,
        ),
      );
      return Promise.reject(apiError);
    }

    const requiredPermissions =
      apiError.requiredPermissions?.length
        ? ` Quyền yêu cầu: ${apiError.requiredPermissions.join(', ')}.`
        : '';
    const authorizationMessage = AUTHORIZATION_MESSAGES[errorCode];
    showError(
      appendRequestId(
        `${authorizationMessage || apiError.message || STATUS_MESSAGES[403]}${requiredPermissions}`,
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

    showError(appendRequestId(apiError.message || STATUS_MESSAGES[404], apiError.requestId));
    return Promise.reject(apiError);
  }

  if (apiError.statusCode === 422) {
    const first = apiError.errors[0];
    const messageText = first
      ? `${first.field ? `[${first.field}] ` : ''}${first.message}`
      : apiError.message;
    showError(appendRequestId(messageText, apiError.requestId));
    return Promise.reject(apiError);
  }

  if (
    apiError.statusCode === 409 &&
    apiError.errorCode === 'EMPLOYEE_LINK_REQUIRED'
  ) {
    showError(
      appendRequestId(
        'Tài khoản của bạn chưa được liên kết với hồ sơ nhân sự. Vui lòng liên hệ quản trị viên để được cấp hồ sơ nhân sự trước khi sử dụng lịch.',
        apiError.requestId,
      ),
    );
    return Promise.reject(apiError);
  }

  if (apiError.statusCode === 409) {
    const leaveDurationMessage = getLeaveDurationErrorMessage(apiError);
    if (leaveDurationMessage) {
      showError(appendRequestId(leaveDurationMessage, apiError.requestId));
      return Promise.reject(apiError);
    }
    if (apiError.errorCode === 'HR_PROJECTION_NOT_READY') {
      showError(appendRequestId(
        'Dữ liệu nhân sự đang được đồng bộ sang hệ thống tài khoản. Vui lòng thử lại sau ít phút.',
        apiError.requestId,
      ));
      return Promise.reject(apiError);
    }
    if (apiError.errorCode === 'IDENTITY_CONFLICT') {
      showError(appendRequestId(
        'Dữ liệu định danh nhân sự đang bị trùng. Vui lòng liên hệ quản trị viên xử lý.',
        apiError.requestId,
      ));
      return Promise.reject(apiError);
    }
    showError(appendRequestId(
      AUTHORIZATION_MESSAGES[apiError.errorCode]
        || `${apiError.message || STATUS_MESSAGES[409]} Vui lòng tải lại dữ liệu trước khi thử lại.`,
      apiError.requestId,
    ));
    return Promise.reject(apiError);
  }

  if (apiError.statusCode === 503 && apiError.errorCode.includes('AUTH')) {
    showError(appendRequestId(
      AUTHORIZATION_MESSAGES.AUTHORITY_SERVICE_UNAVAILABLE,
      apiError.requestId,
    ));
    return Promise.reject(apiError);
  }

  const mapped = STATUS_MESSAGES[apiError.statusCode];
  if (mapped) {
    showError(appendRequestId(mapped, apiError.requestId));
    return Promise.reject(apiError);
  }

  return Promise.reject(apiError);
}
