export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginatedResponse<T> extends PaginatedData<T> {
  /** @deprecated Use items. Kept during API envelope rollout. */
  data: T[];
  /** @deprecated Use pagination. Kept during API envelope rollout. */
  meta: PaginationMeta;
}

export type ApiSuccessResponse<T> = {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  requestId: string;
};

export type ApiErrorResponse = {
  success: false;
  statusCode: number;
  message: string;
  errorCode: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
  requestId?: string;
};

export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  errors: NonNullable<ApiErrorResponse['errors']>;
  requestId?: string;

  constructor(payload: ApiErrorResponse) {
    super(payload.message);
    this.name = 'ApiError';
    this.statusCode = payload.statusCode;
    this.errorCode = payload.errorCode;
    this.errors = payload.errors ?? [];
    this.requestId = payload.requestId;
  }
}

export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  employmentStatus?: string;
  employeeId?: string;
  unitId?: string;
  departmentId?: string;
  movementType?: string;
  leaveType?: string;
  source?: string;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
}
