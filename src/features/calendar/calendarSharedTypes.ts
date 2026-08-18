/**
 * Local copy of the HRM calendar types.
 *
 * TEMPORARY: hr-web-client used to import these from `@hacom/chat-shared-types`
 * (file:../chat-shared-types). That cross-repo dependency breaks CI because the
 * `chat-shared-types` GitHub repository is not available to check out. Until the
 * shared package is published/available, these types are defined locally here.
 * Keep them in sync with `chat-shared-types/src/dtos/calendar.dto.ts`.
 */

// ── Enums ──────────────────────────────────────────────────────────────────
export enum CalendarEventType {
  PERSONAL = 'PERSONAL',
  MEETING = 'MEETING',
  TASK = 'TASK',
  LEAVE = 'LEAVE',
  DEADLINE = 'DEADLINE',
  REMINDER = 'REMINDER',
  OTHER = 'OTHER',
}

export enum CalendarVisibility {
  PRIVATE = 'PRIVATE',
  BUSY_ONLY = 'BUSY_ONLY',
  TEAM = 'TEAM',
  UNIT = 'UNIT',
  PUBLIC = 'PUBLIC',
}

export enum ParticipantResponse {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  MAYBE = 'MAYBE',
}

// ── Interfaces ───────────────────────────────────────────────────────────────
export interface CalendarEmployee {
  id: string;
  fullName: string;
  employeeCode: string;
  avatarUrl?: string;
  department?: string;
  position?: string;
}

export interface CalendarParticipant {
  id: string;
  employeeId: string;
  authUserId?: string | null;
  employeeCode?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  departmentName?: string | null;
  employee: CalendarEmployee | null;
  response: ParticipantResponse;
  respondedAt?: string | null;
  createdAt: string;
}

/**
 * File đính kèm đã lưu THẬT trên server (chat-api-service), gắn với sự kiện
 * lịch qua `attachmentFileIds` lúc tạo/sửa. Khớp `CalendarAttachmentDto` của
 * hr-api-service (`src/modules/calendar/dto/calendar.dto.ts`).
 */
export interface CalendarAttachmentDto {
  fileId: string;
  filename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  relationshipStatus: 'ACTIVE' | 'REMOVED';
  metadataStatus: 'PENDING' | 'READY' | 'RESOLVE_FAILED' | 'DELETED';
  downloadStatus: 'READY' | 'NOT_READY' | 'TEMPORARILY_UNAVAILABLE' | 'FORBIDDEN' | 'DELETED';
  /** URL tải/xem (presigned, có TTL ngắn) — gọi lại endpoint download-url nếu hết hạn. */
  url: string | null;
  thumbnailUrl?: string | null;
}

export type CalendarAttachmentResolveStatus =
  | 'OK'
  | 'PENDING'
  | 'PARTIAL_FAILED'
  | 'FAILED'
  | 'NONE'
  | null;

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  ownerAuthUserId?: string | null;
  ownerEmployeeCode?: string | null;
  ownerName?: string | null;
  owner: CalendarEmployee | null;
  startAt: string;
  endAt: string;
  timezone: string;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrenceRule: string | null;
  visibility: CalendarVisibility;
  eventType: CalendarEventType;
  location: string | null;
  /** null khi bị mask (sự kiện BUSY_ONLY của người khác) hoặc khi backend cũ chưa trả field này. */
  attachments?: CalendarAttachmentDto[] | null;
  attachmentResolveStatus?: CalendarAttachmentResolveStatus;
  participants: CalendarParticipant[];
  canEdit: boolean;
  canDelete: boolean;
  canViewFullDetails: boolean;
  isParticipant: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarPermission {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewFullDetails: boolean;
  reason?: string;
}

export interface CalendarPaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
