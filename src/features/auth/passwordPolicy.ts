export const PASSWORD_LENGTH = 12;

export interface PasswordPolicyCheck {
  label: string;
  pass: boolean;
}

export function getPasswordPolicyChecks(
  password: string,
): PasswordPolicyCheck[] {
  return [
    { label: `Đúng ${PASSWORD_LENGTH} ký tự`, pass: password.length === PASSWORD_LENGTH },
    { label: "Có chữ thường (a-z)", pass: /[a-z]/.test(password) },
    { label: "Có chữ hoa (A-Z)", pass: /[A-Z]/.test(password) },
    { label: "Có chữ số (0-9)", pass: /\d/.test(password) },
    { label: "Có ký tự đặc biệt (!@#$%...)", pass: /[^a-zA-Z0-9]/.test(password) },
  ];
}

export function validatePasswordPolicy(password: string): string | null {
  if (!password) {
    return "Nhập mật khẩu.";
  }

  const checks = getPasswordPolicyChecks(password);
  if (checks.some((check) => !check.pass)) {
    return `Mật khẩu phải đúng ${PASSWORD_LENGTH} ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.`;
  }

  return null;
}
