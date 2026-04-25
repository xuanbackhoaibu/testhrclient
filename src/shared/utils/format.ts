export function formatNumber(value?: number | null): string {
  return new Intl.NumberFormat('vi-VN').format(value ?? 0);
}

export function formatList(values?: string[] | null): string {
  if (!values?.length) {
    return '-';
  }

  return values.join(', ');
}

export function maskSensitiveValue(value?: string | null, visibleDigits = 4): string {
  if (!value) {
    return '';
  }

  const visible = value.slice(-visibleDigits);
  return `${'*'.repeat(Math.max(0, value.length - visibleDigits))}${visible}`;
}

