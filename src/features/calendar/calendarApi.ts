import type {
  CalendarEvent,
  CalendarPaginationMeta,
  CalendarPermission,
  CalendarParticipant,
} from './calendarSharedTypes';
import {
  CalendarEventType,
  ParticipantResponse,
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

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
const MOCK_CALENDAR_STORAGE_KEY = 'hr-web-client.mock-calendar-events';

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

function createMockEvent(
  id: string,
  dayOffset: number,
  title: string,
  eventType: CalendarEventType,
  visibility: CalendarVisibility,
  startHour: number,
  durationHours: number,
): CalendarEvent {
  const now = new Date();
  const startAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, startHour, 0, 0);
  const endAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);
  return {
    id,
    title,
    description: `Dữ liệu lịch demo cho ${title}.`,
    ownerId: 'mock-current-employee',
    ownerAuthUserId: 'mock-current-user',
    ownerEmployeeCode: 'NV001',
    ownerName: 'Nguyễn Văn A',
    owner: {
      id: 'mock-current-employee',
      fullName: 'Nguyễn Văn A',
      employeeCode: 'NV001',
      department: 'Khối Nhân sự',
      position: 'HR Executive',
    },
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    timezone: 'Asia/Ho_Chi_Minh',
    isAllDay: false,
    isRecurring: false,
    recurrenceRule: null,
    visibility,
    eventType,
    location: eventType === CalendarEventType.MEETING ? 'Phòng họp 3A' : null,
    participants: [
      {
        id: `${id}-participant`,
        employeeId: 'mock-current-employee',
        authUserId: 'mock-current-user',
        employeeCode: 'NV001',
        fullName: 'Nguyễn Văn A',
        avatarUrl: null,
        departmentName: 'Khối Nhân sự',
        employee: {
          id: 'mock-current-employee',
          fullName: 'Nguyễn Văn A',
          employeeCode: 'NV001',
          department: 'Khối Nhân sự',
          position: 'HR Executive',
        },
        response: ParticipantResponse.ACCEPTED,
        respondedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ],
    canEdit: true,
    canDelete: true,
    canViewFullDetails: true,
    isParticipant: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function defaultMockCalendarEvents(): CalendarEvent[] {
  return [
    createMockEvent('mock-calendar-1', 1, 'Họp kế hoạch nhân sự tuần', CalendarEventType.MEETING, CalendarVisibility.TEAM, 9, 1.5),
    createMockEvent('mock-calendar-2', 3, 'Nhắc gia hạn hợp đồng thử việc', CalendarEventType.REMINDER, CalendarVisibility.PRIVATE, 14, 1),
    createMockEvent('mock-calendar-3', 6, 'Deadline tổng hợp bảng công', CalendarEventType.DEADLINE, CalendarVisibility.UNIT, 16, 1),
  ];
}

function readMockCalendarEvents(): CalendarEvent[] {
  if (typeof window === 'undefined') return defaultMockCalendarEvents();
  try {
    const raw = window.localStorage.getItem(MOCK_CALENDAR_STORAGE_KEY);
    if (!raw) return defaultMockCalendarEvents();
    const parsed = JSON.parse(raw) as CalendarEvent[];
    return Array.isArray(parsed) ? parsed : defaultMockCalendarEvents();
  } catch {
    return defaultMockCalendarEvents();
  }
}

function writeMockCalendarEvents(events: CalendarEvent[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MOCK_CALENDAR_STORAGE_KEY, JSON.stringify(events));
}

function eventInRange(event: CalendarEvent, from?: string, to?: string) {
  const start = new Date(event.startAt).getTime();
  const fromTime = from ? new Date(from).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = to ? new Date(to).getTime() : Number.POSITIVE_INFINITY;
  return start >= fromTime && start <= toTime;
}

function toCalendarEventsResponse(
  data: CalendarEvent[],
  params: ListCalendarEventsParams,
  extra?: Pick<CalendarEventsResponse, 'mode' | 'capabilities' | 'warnings'>,
): CalendarEventsResponse {
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
    ...extra,
  };
}

export const calendarApi = {
  async listEvents(params: ListCalendarEventsParams = {}): Promise<CalendarEventsResponse> {
    if (isMockMode) {
      const events = readMockCalendarEvents()
        .filter((event) => eventInRange(event, params.from, params.to));
      return toCalendarEventsResponse(events, params, {
        mode: 'HR_LINKED',
        capabilities: {
          canCreatePersonalEvent: true,
          canViewHrEvents: true,
          canViewDepartmentEvents: true,
          canRetryHrLink: false,
        },
      });
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
    const data = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
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
      const event = readMockCalendarEvents().find((item) => item.id === id);
      if (event) return event;
    }
    return api.get<CalendarEvent>(`/calendar/events/${id}`);
  },

  async getEventPermissions(id: string): Promise<CalendarPermission> {
    if (isMockMode) {
      void id;
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canViewFullDetails: true,
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
  }): Promise<CalendarEvent> {
    if (isMockMode) {
      const event = createMockEvent(
        `mock-calendar-${Date.now()}`,
        0,
        params.title,
        params.eventType ?? CalendarEventType.PERSONAL,
        params.visibility ?? CalendarVisibility.PRIVATE,
        new Date(params.startAt).getHours(),
        Math.max(1, (new Date(params.endAt).getTime() - new Date(params.startAt).getTime()) / 3_600_000),
      );
      const next = {
        ...event,
        description: params.description ?? null,
        startAt: params.startAt,
        endAt: params.endAt,
        isAllDay: params.isAllDay ?? false,
        location: params.location ?? null,
        timezone: params.timezone ?? 'Asia/Ho_Chi_Minh',
      };
      writeMockCalendarEvents([...readMockCalendarEvents(), next]);
      return next;
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
  }): Promise<CalendarEvent> {
    if (isMockMode) {
      const events = readMockCalendarEvents();
      const current = events.find((event) => event.id === id);
      if (!current) throw new Error('Không tìm thấy sự kiện demo.');
      const updated: CalendarEvent = {
        ...current,
        title: params.title ?? current.title,
        description: params.description ?? current.description,
        startAt: params.startAt ?? current.startAt,
        endAt: params.endAt ?? current.endAt,
        eventType: params.eventType ?? current.eventType,
        visibility: params.visibility ?? current.visibility,
        isAllDay: params.isAllDay ?? current.isAllDay,
        location: params.location ?? current.location,
        timezone: params.timezone ?? current.timezone,
        updatedAt: new Date().toISOString(),
      };
      writeMockCalendarEvents(events.map((event) => event.id === id ? updated : event));
      return updated;
    }

    return api.patch<CalendarEvent>(`/calendar/events/${id}`, params);
  },

  async deleteEvent(id: string): Promise<void> {
    if (isMockMode) {
      writeMockCalendarEvents(readMockCalendarEvents().filter((event) => event.id !== id));
      return;
    }
    return api.delete<void>(`/calendar/events/${id}`);
  },

  async addParticipant(eventId: string, employeeId: string): Promise<void> {
    if (isMockMode) {
      void eventId;
      void employeeId;
      return;
    }
    return api.post<void>(`/calendar/events/${eventId}/participants`, { employeeId });
  },

  async removeParticipant(eventId: string, employeeId: string): Promise<void> {
    if (isMockMode) {
      void eventId;
      void employeeId;
      return;
    }
    return api.delete<void>(`/calendar/events/${eventId}/participants/${employeeId}`);
  },

  async updateMyResponse(
    eventId: string,
    response: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE',
  ): Promise<void> {
    if (isMockMode) {
      void eventId;
      void response;
      return;
    }
    return api.patch<void>(`/calendar/events/${eventId}/participants/me`, { response });
  },
};
