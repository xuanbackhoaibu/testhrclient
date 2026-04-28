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
  errors?: ApiErrorDetail[];
  requestId?: string;
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
}

export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  errors: ApiErrorDetail[];
  requestId?: string;

  constructor(payload: ApiErrorPayload | ApiErrorResponse) {
    super(payload.message);
    this.name = 'ApiError';
    this.statusCode = payload.statusCode;
    this.errorCode = payload.errorCode ?? 'API_ERROR';
    this.errors = payload.errors ?? [];
    this.requestId = payload.requestId;
  }
}
