import type {
  CalendarEvent,
  CalendarPaginationMeta,
  CalendarPermission,
  CalendarParticipant,
} from '@hacom/chat-shared-types';
import {
  CalendarEventType,
  CalendarVisibility,
} from '@hacom/chat-shared-types';
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

export interface ListCalendarEventsParams {
  /** Employee internal ID (HR cuid). Prefer ownerAuthUserId for auth-domain filtering. */
  ownerId?: string;
  /** Auth user ID (UUID from JWT / externalAuthUserId). Backend resolves to correct HR owner. */
  ownerAuthUserId?: string;
  /** Employee code (mã nhân viên). Fallback resolution path. */
  employeeCode?: string;
  from?: string;
  to?: string;
  type?: string;
  visibility?: string;
  includeParticipantEvents?: boolean;
  page?: number;
  pageSize?: number;
}

export const calendarApi = {
  async listEvents(params: ListCalendarEventsParams = {}): Promise<CalendarEventsResponse> {
    const searchParams = new URLSearchParams();
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

    return api.get<CalendarEventsResponse>(`/calendar/events?${searchParams}`);
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
    eventType?: string;
    visibility?: string;
    isAllDay?: boolean;
    location?: string;
  }): Promise<CalendarEvent> {
    return api.post<CalendarEvent>('/calendar/events', params);
  },

  async updateEvent(id: string, params: {
    title?: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    eventType?: string;
    visibility?: string;
    isAllDay?: boolean;
    location?: string;
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
