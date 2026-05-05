import { useMemo } from 'react';
import { ApiError } from './api.types';

export interface FieldError {
  field: string;
  message: string;
}

export function useApiError(error: unknown) {
  return useMemo(() => {
    if (!(error instanceof ApiError)) return { fieldErrors: {}, globalError: null };

    const fieldErrors: Record<string, string> = {};
    for (const e of error.errors ?? []) {
      if (e.field) fieldErrors[e.field] = e.message;
    }

    const globalError =
      Object.keys(fieldErrors).length === 0 ? error.message : null;

    return { fieldErrors, globalError };
  }, [error]);
}
