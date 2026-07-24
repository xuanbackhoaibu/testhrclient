/**
 * Produces a stable Vietnamese-insensitive search token for display data only.
 * It must not be used as an authorization identifier or persisted value.
 */
export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN')
    .trim()
    .replace(/\s+/g, ' ');
}

export function includesNormalizedSearch(value: unknown, query: unknown): boolean {
  const normalizedQuery = normalizeSearchText(query);
  return !normalizedQuery || normalizeSearchText(value).includes(normalizedQuery);
}
