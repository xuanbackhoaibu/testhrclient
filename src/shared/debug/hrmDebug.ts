type PermissionCheckPayload = {
  action: string;
  required: string;
  permissions?: string[];
  roles?: string[];
  allowed: boolean;
};

type ApiRequestPayload = {
  action: string;
  method: string;
  url: string;
  payload?: unknown;
  status?: number;
  requestId?: string;
  responseBody?: unknown;
};

export function debugPermissionCheck(payload: PermissionCheckPayload): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.debug('[permission-check]', payload);
}

export function debugApiRequest(payload: ApiRequestPayload): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.debug('[api-request]', payload);
}

export function debugApiResponse(payload: ApiRequestPayload): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.debug('[api-response]', payload);
}

export function debugApiError(payload: ApiRequestPayload): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.debug('[api-error]', payload);
}
