import { QueryClient } from '@tanstack/react-query';

type QueryErrorLike = { statusCode?: unknown };

function statusCodeOf(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const value = (error as QueryErrorLike).statusCode;
  return typeof value === 'number' ? value : null;
}

/**
 * Authorization reads must never amplify a client or rate-limit failure.
 * The API client turns HTTP responses into ApiError with a statusCode, so
 * retry only one transient 5xx/network failure and never retry 4xx responses.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const statusCode = statusCodeOf(error);
  if (statusCode !== null && statusCode >= 400 && statusCode < 500) {
    return false;
  }

  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
    },
  },
});
