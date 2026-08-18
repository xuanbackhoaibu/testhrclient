import type {
  CalendarAttachmentDto,
  CalendarEvent,
  CalendarPaginationMeta,
  CalendarPermission,
  CalendarParticipant,
} from './calendarSharedTypes';
import {
  CalendarEventType,
  CalendarVisibility,
} from './calendarSharedTypes';
import { api } from '../../shared/api/httpClient';
import { useAuthStore } from '../auth/authStore';
import { mockCalendarEvents } from '../../shared/mocks/mockCalendar';
import { mockDelay, generateId } from '../../shared/mocks/mockHelpers';
import { getMockCalendarAttachment, getMockCalendarAttachments } from '../../shared/mocks/mockCalendarAttachments';
import { ParticipantResponse } from './calendarSharedTypes';

export { CalendarVisibility, CalendarEventType };

// Cả module này trước đây gọi thẳng api.* (axios) bất kể VITE_USE_MOCKS,
// khác với các module khác (vd. employeesApi) luôn có nhánh mock riêng.
// Vì VITE_API_BASE_URL trong môi trường demo là placeholder chưa điền
// ("https://<server-host-or-domain>/api/v1"), request thật ném lỗi
// "Failed to construct 'URL': Invalid URL" và làm vỡ toàn bộ trang lịch.
const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export type { CalendarEvent, CalendarPaginationMeta, CalendarPermission, CalendarParticipant };

export type CalendarMode = 'HR_LINKED' | 'NO_HR_PROFILE';

/** Extended response: base shared-types contract + optional mode flags from hr-api-service */
export interface CalendarEventsResponse {
  data: CalendarEvent[];
  pagination: CalendarPaginationMeta;
  mode?: CalendarMode;
  capabilities?: {
    canCreatePersonalEvent: boolean;
    canViewHrEvents: boolean;
    canViewDepartmentEvents: boolean;
    canRetryHrLink: boolean;
  };
  warnings?: Array<{ code: string; message: string }>;
}

/** Raw shape from the gateway — may use `items` or `data`, `pagination` or `meta`. */
interface RawCalendarEventsResponse {
  items?: CalendarEvent[];
  data?: CalendarEvent[];
  pagination?: CalendarPaginationMeta;
  meta?: CalendarPaginationMeta;
  mode?: CalendarMode;
  capabilities?: CalendarEventsResponse['capabilities'];
  warnings?: CalendarEventsResponse['warnings'];
}

export interface ListCalendarEventsParams {
  scope?: 'mine' | 'person' | 'unit';
  /** Employee internal ID (HR cuid). Prefer ownerAuthUserId for auth-domain filtering. */
  ownerId?: string;
  /** Auth user ID (UUID from JWT / externalAuthUserId). Backend resolves to correct HR owner. */
  ownerAuthUserId?: string;
  /** Employee code (mã nhân viên). Fallback resolution path. */
  employeeCode?: string;
  from?: string;
  to?: string;
  type?: string;
  visibility?: CalendarVisibility;
  includeParticipantEvents?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Dựng `CalendarAttachmentDto[]` mock từ danh sách fileId — tra trong kho
 * `mockCalendarAttachments` (nơi `uploadCalendarAttachment` lưu File khi
 * chạy mock). fileId không tìm thấy (vd. thuộc phiên trình duyệt khác) bị bỏ
 * qua thay vì làm vỡ toàn bộ mảng.
 */
function buildMockAttachments(fileIds: string[] | undefined): CalendarAttachmentDto[] {
  if (!fileIds || fileIds.length === 0) return [];
  return getMockCalendarAttachments(fileIds).map((record) => ({
    fileId: record.fileId,
    filename: record.filename,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    relationshipStatus: 'ACTIVE',
    metadataStatus: 'READY',
    downloadStatus: 'READY',
    url: record.url,
    thumbnailUrl: null,
  }));
}

function matchesMockParams(event: CalendarEvent, params: ListCalendarEventsParams): boolean {
  const currentUser = useAuthStore.getState().user;
  if (params.scope === 'mine' || (!params.scope && !params.ownerId && !params.ownerAuthUserId)) {
    const isOwner = event.ownerAuthUserId === currentUser?.externalAuthUserId;
    const isParticipant = event.participants.some(
      (p) => p.authUserId === currentUser?.externalAuthUserId,
    );
    if (!isOwner && !isParticipant) return false;
  }
  if (params.ownerAuthUserId && event.ownerAuthUserId !== params.ownerAuthUserId) return false;
  if (params.ownerId && event.ownerId !== params.ownerId) return false;
  if (params.employeeCode && event.ownerEmployeeCode !== params.employeeCode) return false;
  if (params.type && event.eventType !== params.type) return false;
  if (params.visibility && event.visibility !== params.visibility) return false;
  if (params.from && event.endAt < params.from) return false;
  if (params.to && event.startAt > params.to) return false;
  return true;
}

export const calendarApi = {
  async listEvents(params: ListCalendarEventsParams = {}): Promise<CalendarEventsResponse> {
    if (isMockMode) {
      await mockDelay();
      const data = mockCalendarEvents.filter((event) => matchesMockParams(event, params));
      return {
        data,
        pagination: {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? data.length,
          totalItems: data.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
        mode: 'HR_LINKED',
        capabilities: {
          canCreatePersonalEvent: true,
          canViewHrEvents: true,
          canViewDepartmentEvents: true,
          canRetryHrLink: false,
        },
      };
    }

    const searchParams = new URLSearchParams();
    if (params.scope) searchParams.append('scope', params.scope);
    if (params.ownerAuthUserId) {
      searchParams.append('ownerAuthUserId', params.ownerAuthUserId);
    } else if (params.ownerId) {
      searchParams.append('ownerId', params.ownerId);
    }
    if (params.employeeCode) searchParams.append('employeeCode', params.employeeCode);
    if (params.from) searchParams.append('from', params.from);
    if (params.to) searchParams.append('to', params.to);
    if (params.type) searchParams.append('type', params.type);
    if (params.visibility) searchParams.append('visibility', params.visibility);
    if (params.includeParticipantEvents) {
      searchParams.append('includeParticipantEvents', String(params.includeParticipantEvents));
    }
    if (params.page) searchParams.append('page', String(params.page));
    if (params.pageSize) searchParams.append('pageSize', String(params.pageSize));

    // The API gateway normalizes list payloads to `{ items, pagination }`, while
    // legacy callers expect `{ data, pagination }`. Accept both so events (and
    // invited meetings) always render regardless of the envelope shape.
    const raw = await api.get<RawCalendarEventsResponse>(
      `/calendar/events?${searchParams}`,
    );
    const data = Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.data)
        ? raw.data
        : [];
    const pagination =
      raw?.pagination ??
      raw?.meta ?? {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? data.length,
        totalItems: data.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    return {
      data,
      pagination,
      mode: raw?.mode,
      capabilities: raw?.capabilities,
      warnings: raw?.warnings,
    };
  },

  async getEvent(id: string): Promise<CalendarEvent> {
    if (isMockMode) {
      await mockDelay();
      const event = mockCalendarEvents.find((item) => item.id === id);
      if (!event) throw new Error('Event not found');
      return event;
    }
    return api.get<CalendarEvent>(`/calendar/events/${id}`);
  },

  async getEventPermissions(id: string): Promise<CalendarPermission> {
    if (isMockMode) {
      await mockDelay();
      const event = mockCalendarEvents.find((item) => item.id === id);
      if (!event) throw new Error('Event not found');
      return {
        canView: true,
        canEdit: event.canEdit,
        canDelete: event.canDelete,
        canViewFullDetails: event.canViewFullDetails,
      };
    }
    return api.get<CalendarPermission>(`/calendar/events/${id}/permissions`);
  },

  async createEvent(params: {
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    eventType?: CalendarEventType;
    visibility?: CalendarVisibility;
    isAllDay?: boolean;
    location?: string;
    timezone?: string;
    /** Employee IDs (cuid) to invite as participants. */
    participantIds?: string[];
    /** fileId trả về từ chat-api sau khi upload xong (xem calendarAttachmentUpload.ts). */
    attachmentFileIds?: string[];
  }): Promise<CalendarEvent> {
    if (isMockMode) {
      await mockDelay();
      const currentUser = useAuthStore.getState().user;
      const now = new Date().toISOString();
      const newEvent: CalendarEvent = {
        id: generateId('cal-evt'),
        title: params.title,
        description: params.description ?? null,
        ownerId: currentUser?.employeeId ?? 'emp-01',
        ownerAuthUserId: currentUser?.externalAuthUserId ?? null,
        ownerEmployeeCode: currentUser?.employee?.employeeCode ?? null,
        ownerName: currentUser?.fullName ?? null,
        owner: currentUser?.employee
          ? {
              id: currentUser.employee.id,
              fullName: currentUser.employee.fullName,
              employeeCode: currentUser.employee.employeeCode,
            }
          : null,
        startAt: params.startAt,
        endAt: params.endAt,
        timezone: params.timezone ?? 'Asia/Ho_Chi_Minh',
        isAllDay: params.isAllDay ?? false,
        isRecurring: false,
        recurrenceRule: null,
        visibility: params.visibility ?? CalendarVisibility.PRIVATE,
        eventType: params.eventType ?? CalendarEventType.PERSONAL,
        location: params.location ?? null,
        attachments: buildMockAttachments(params.attachmentFileIds),
        attachmentResolveStatus: params.attachmentFileIds?.length ? 'OK' : 'NONE',
        participants: [],
        canEdit: true,
        canDelete: true,
        canViewFullDetails: true,
        isParticipant: false,
        createdAt: now,
        updatedAt: now,
      };
      mockCalendarEvents.push(newEvent);
      return newEvent;
    }
    return api.post<CalendarEvent>('/calendar/events', params);
  },

  async updateEvent(id: string, params: {
    title?: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    eventType?: CalendarEventType;
    visibility?: CalendarVisibility;
    isAllDay?: boolean;
    location?: string;
    timezone?: string;
    /** Full desired participant set (employee cuids); server reconciles. */
    participantIds?: string[];
    /**
     * Full desired set of chat-api fileIds. Server reconciles: giữ file còn
     * trong mảng, thêm file mới, gỡ file không còn trong mảng. Mảng rỗng =
     * xoá hết đính kèm. Bỏ qua field này = giữ nguyên đính kèm hiện có.
     */
    attachmentFileIds?: string[];
  }): Promise<CalendarEvent> {
    if (isMockMode) {
      await mockDelay();
      const index = mockCalendarEvents.findIndex((item) => item.id === id);
      if (index === -1) throw new Error('Event not found');
      const { attachmentFileIds, ...rest } = params;
      const updated: CalendarEvent = {
        ...mockCalendarEvents[index],
        ...rest,
        description: params.description ?? mockCalendarEvents[index].description,
        location: params.location ?? mockCalendarEvents[index].location,
        // `attachmentFileIds` bỏ qua = giữ nguyên đính kèm hiện có (khớp hành
        // vi backend thật); có truyền (kể cả mảng rỗng) = thay thế toàn bộ.
        attachments:
          attachmentFileIds !== undefined
            ? buildMockAttachments(attachmentFileIds)
            : mockCalendarEvents[index].attachments,
        attachmentResolveStatus:
          attachmentFileIds !== undefined
            ? attachmentFileIds.length
              ? 'OK'
              : 'NONE'
            : mockCalendarEvents[index].attachmentResolveStatus,
        updatedAt: new Date().toISOString(),
      };
      mockCalendarEvents[index] = updated;
      return updated;
    }
    return api.patch<CalendarEvent>(`/calendar/events/${id}`, params);
  },

  /**
   * Xin lại URL tải file đính kèm mới nhất (URL trong `event.attachments`
   * là presigned, có TTL ngắn — có thể đã hết hạn nếu người dùng mở lại sự
   * kiện sau một lúc). Gọi trước khi tải/mở file để tránh lỗi link hết hạn.
   */
  async getAttachmentDownloadUrl(
    eventId: string,
    fileId: string,
  ): Promise<{ fileId: string; url: string | null; downloadStatus: string }> {
    if (isMockMode) {
      await mockDelay();
      const record = getMockCalendarAttachment(fileId);
      return {
        fileId,
        url: record?.url ?? null,
        downloadStatus: record ? 'READY' : 'NOT_READY',
      };
    }
    return api.get(`/calendar/events/${eventId}/attachments/${fileId}/download-url`);
  },

  async deleteEvent(id: string): Promise<void> {
    if (isMockMode) {
      await mockDelay();
      const index = mockCalendarEvents.findIndex((item) => item.id === id);
      if (index !== -1) mockCalendarEvents.splice(index, 1);
      return;
    }
    return api.delete<void>(`/calendar/events/${id}`);
  },

  async addParticipant(eventId: string, employeeId: string): Promise<void> {
    if (isMockMode) {
      await mockDelay();
      const event = mockCalendarEvents.find((item) => item.id === eventId);
      if (event && !event.participants.some((p) => p.employeeId === employeeId)) {
        event.participants.push({
          id: generateId('cal-part'),
          employeeId,
          authUserId: null,
          employeeCode: null,
          fullName: null,
          avatarUrl: null,
          departmentName: null,
          employee: null,
          response: ParticipantResponse.PENDING,
          respondedAt: null,
          createdAt: new Date().toISOString(),
        });
      }
      return;
    }
    return api.post<void>(`/calendar/events/${eventId}/participants`, { employeeId });
  },

  async removeParticipant(eventId: string, employeeId: string): Promise<void> {
    if (isMockMode) {
      await mockDelay();
      const event = mockCalendarEvents.find((item) => item.id === eventId);
      if (event) {
        event.participants = event.participants.filter((p) => p.employeeId !== employeeId);
      }
      return;
    }
    return api.delete<void>(`/calendar/events/${eventId}/participants/${employeeId}`);
  },

  async updateMyResponse(
    eventId: string,
    response: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE',
  ): Promise<void> {
    if (isMockMode) {
      await mockDelay();
      const currentUser = useAuthStore.getState().user;
      const event = mockCalendarEvents.find((item) => item.id === eventId);
      const participant = event?.participants.find(
        (p) => p.authUserId === currentUser?.externalAuthUserId,
      );
      if (participant) {
        participant.response = response as ParticipantResponse;
        participant.respondedAt = new Date().toISOString();
      }
      return;
    }
    return api.patch<void>(`/calendar/events/${eventId}/participants/me`, { response });
  },
};
