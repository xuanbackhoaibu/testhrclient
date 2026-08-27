export const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
  { value: 'UNKNOWN', label: 'Chưa xác định' },
] as const;

const GENDER_LABELS: Record<string, string> = Object.fromEntries(
  GENDER_OPTIONS.map((option) => [option.value, option.label]),
);

export function getGenderLabel(gender?: string | null): string {
  if (!gender) {
    return '-';
  }
  return GENDER_LABELS[gender] ?? `Khác: ${gender}`;
}
