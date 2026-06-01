// Display-only mirror of the backend's DEFAULT_EMPLOYEE_PASSWORD.
//
// The backend (chat-auth-service `config.hrProvisioning.defaultEmployeePassword`)
// is the source of truth and never returns the plaintext password in any API
// response. This constant exists solely so the HRM UI can show admins the fixed
// default that newly provisioned accounts receive. Override per environment via
// the Vite env var if the backend default ever changes.
export const DEFAULT_EMPLOYEE_PASSWORD =
  (import.meta.env.VITE_DEFAULT_EMPLOYEE_PASSWORD as string | undefined) ||
  'Hacomholdings@88';

// Standard notice shown wherever a default-password account is created.
export const FORCE_CHANGE_PASSWORD_NOTICE =
  'Người dùng bắt buộc đổi mật khẩu khi đăng nhập lần đầu.';

export const DEFAULT_EMPLOYEE_PASSWORD_LABEL = `Mật khẩu mặc định: ${DEFAULT_EMPLOYEE_PASSWORD}`;
