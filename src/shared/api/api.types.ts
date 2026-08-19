export type ApiSuccessResponse<T> = {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  requestId: string;
};

export type ApiErrorDetail = {
  field?: string;
  message: string;
  code?: string;
};

export type ApiErrorResponse = {
  success: false;
  statusCode: number;
  message: string;
  errorCode?: string;
  /**
   * chat-auth-service's `x-api-contract: 2` shape nests the stable machine
   * code here instead of at the top-level `errorCode` (used by hr-api-service).
   */
  error?: { code?: string; details?: unknown };
  errors?: ApiErrorDetail[];
  requestId?: string;
  requiredPermissions?: string[];
};

export type ApiEnvelope<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedData<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export interface ApiErrorPayload {
  message: string;
  statusCode: number;
  errorCode?: string;
  errors?: ApiErrorDetail[];
  requestId?: string;
  requiredPermissions?: string[];
}

export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  errors: ApiErrorDetail[];
  requestId?: string;
  requiredPermissions?: string[];

  constructor(payload: ApiErrorPayload | ApiErrorResponse) {
    super(payload.message);
    this.name = 'ApiError';
    this.statusCode = payload.statusCode;
    this.errorCode =
      payload.errorCode ??
      ('error' in payload ? payload.error?.code : undefined) ??
      'API_ERROR';
    this.errors = payload.errors ?? [];
    this.requestId = payload.requestId;
    this.requiredPermissions = payload.requiredPermissions;
  }
}
