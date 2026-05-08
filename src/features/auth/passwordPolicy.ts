export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_LENGTH_MESSAGE =
  `Mật khẩu phải có tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`;

export interface PasswordPolicyCheck {
  label: string;
  pass: boolean;
}

export function getPasswordPolicyChecks(
  password: string,
): PasswordPolicyCheck[] {
  return [
    {
      label: PASSWORD_MIN_LENGTH_MESSAGE,
      pass: password.length >= PASSWORD_MIN_LENGTH,
    },
  ];
}

export function validatePasswordPolicy(password: string): string | null {
  if (!password) {
    return 'Nhập mật khẩu.';
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return PASSWORD_MIN_LENGTH_MESSAGE;
  }

  return null;
}
