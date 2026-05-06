export const PASSWORD_LENGTH = 12;

export interface PasswordPolicyCheck {
  label: string;
  pass: boolean;
}

export function getPasswordPolicyChecks(
  password: string,
): PasswordPolicyCheck[] {
  return [
    { label: `Dung ${PASSWORD_LENGTH} ky tu`, pass: password.length === PASSWORD_LENGTH },
    { label: "Co chu thuong (a-z)", pass: /[a-z]/.test(password) },
    { label: "Co chu hoa (A-Z)", pass: /[A-Z]/.test(password) },
    { label: "Co chu so (0-9)", pass: /\d/.test(password) },
    { label: "Co ky tu dac biet (!@#$%...)", pass: /[^a-zA-Z0-9]/.test(password) },
  ];
}

export function validatePasswordPolicy(password: string): string | null {
  if (!password) {
    return "Nhap mat khau.";
  }

  const checks = getPasswordPolicyChecks(password);
  if (checks.some((check) => !check.pass)) {
    return `Mat khau phai dung ${PASSWORD_LENGTH} ky tu, co chu hoa, chu thuong, chu so va ky tu dac biet.`;
  }

  return null;
}
