export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
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
