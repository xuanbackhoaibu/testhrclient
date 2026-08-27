import type {
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

export { CalendarVisibility, CalendarEventType };

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

export const calendarApi = {
  async listEvents(params: ListCalendarEventsParams = {}): Promise<CalendarEventsResponse> {
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
    return api.get<CalendarEvent>(`/calendar/events/${id}`);
  },

  async getEventPermissions(id: string): Promise<CalendarPermission> {
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
  }): Promise<CalendarEvent> {
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
  }): Promise<CalendarEvent> {
    return api.patch<CalendarEvent>(`/calendar/events/${id}`, params);
  },

  async deleteEvent(id: string): Promise<void> {
    return api.delete<void>(`/calendar/events/${id}`);
  },

  async addParticipant(eventId: string, employeeId: string): Promise<void> {
    return api.post<void>(`/calendar/events/${eventId}/participants`, { employeeId });
  },

  async removeParticipant(eventId: string, employeeId: string): Promise<void> {
    return api.delete<void>(`/calendar/events/${eventId}/participants/${employeeId}`);
  },

  async updateMyResponse(
    eventId: string,
    response: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE',
  ): Promise<void> {
    return api.patch<void>(`/calendar/events/${eventId}/participants/me`, { response });
  },
};
