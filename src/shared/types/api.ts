export type {
  ApiEnvelope,
  ApiErrorDetail,
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginatedData,
  PaginationMeta,
} from '../api/api.types';
export { ApiError } from '../api/api.types';

import type { PaginatedData, PaginationMeta } from '../api/api.types';

export interface PaginatedResponse<T> extends PaginatedData<T> {
  /** @deprecated Use items. Kept during API envelope rollout. */
  data: T[];
  /** @deprecated Use pagination. Kept during API envelope rollout. */
  meta: PaginationMeta;
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
