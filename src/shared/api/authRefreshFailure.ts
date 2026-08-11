import axios from 'axios';

const DEFINITIVE_REFRESH_REASON_CODES = new Set([
  'REFRESH_TOKEN_MISSING',
  'REFRESH_TOKEN_INVALID',
  'REFRESH_TOKEN_INVALID_SIGNATURE',
  'REFRESH_TOKEN_EXPIRED',
  'REFRESH_TOKEN_REVOKED',
  'REFRESH_TOKEN_ROTATED_REUSE',
  'REFRESH_SESSION_NOT_FOUND',
  'REFRESH_SESSION_EXPIRED',
  'REFRESH_ACCOUNT_INACTIVE',
  'REFRESH_TOKEN_VERSION_MISMATCH',
  'REFRESH_PERMISSION_VERSION_MISMATCH',
]);

export function isDefinitiveAuthRefreshFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) return false;

  const data = error.response.data as {
    reasonCode?: unknown;
    code?: unknown;
    errorCode?: unknown;
    details?: { reasonCode?: unknown };
    error?: { code?: unknown; details?: { reasonCode?: unknown } };
  } | undefined;
  const reasonCode = data?.reasonCode
    ?? data?.details?.reasonCode
    ?? data?.error?.details?.reasonCode
    ?? data?.code
    ?? data?.error?.code
    ?? data?.errorCode;

  return typeof reasonCode === 'string' && DEFINITIVE_REFRESH_REASON_CODES.has(reasonCode);
}
