const AUTHORIZATION_ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_GRANT_AUTHORITY: 'Bạn không có thẩm quyền cấp một hoặc nhiều quyền đã chọn.',
  ROLE_NOT_ASSIGNABLE: 'Bạn không được phép cấp vai trò này cho tài khoản đã chọn.',
  ROLE_SCOPE_EXCEEDED: 'Phạm vi của vai trò vượt quá thẩm quyền bạn được cấp.',
  AUTHORIZATION_SCOPE_EXCEEDED: 'Phạm vi dữ liệu đã chọn vượt quá phạm vi bạn được phép quản lý.',
  SENSITIVE_GRANT_REASON_REQUIRED: 'Hãy nhập lý do cho thay đổi quyền nhạy cảm.',
  SENSITIVE_ROLE_CHANGE_REASON_REQUIRED: 'Hãy nhập lý do cho thay đổi vai trò nhạy cảm.',
  SELF_ESCALATION_FORBIDDEN: 'Bạn không thể tự nâng quyền cho chính mình.',
  WORK_REPORT_PERMISSION_MANAGED_BY_HRM: 'Quyền Báo cáo công việc phải được cấu hình trong trình quản lý chuyên biệt.',
  LAST_ADMIN_PROTECTED: 'Không thể thay đổi hoặc gỡ quản trị viên cuối cùng của hệ thống.',
  FINAL_SUPER_ADMIN_PROTECTED: 'Không thể thay đổi hoặc gỡ quản trị viên tối cao cuối cùng.',
  GRANT_AUTHORITY_CHANGED: 'Thẩm quyền phân quyền đã thay đổi. Hãy kiểm tra lại trước khi lưu.',
  ROLE_VERSION_CONFLICT: 'Vai trò đã được người khác cập nhật. Hãy tải lại phiên bản mới trước khi tiếp tục.',
};

export function getAuthorizationErrorMessage(errorCode?: string | null): string | null {
  if (!errorCode) return null;
  return AUTHORIZATION_ERROR_MESSAGES[errorCode] ?? null;
}
