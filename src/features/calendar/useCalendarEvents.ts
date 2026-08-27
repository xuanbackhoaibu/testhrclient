import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { calendarApi, type ListCalendarEventsParams, type CalendarEvent, type CalendarParticipant, type CalendarPermission } from './calendarApi';

export type { CalendarEvent, ListCalendarEventsParams, CalendarParticipant, CalendarPermission };

export { calendarApi };

export const calendarKeys = {
  all: ['calendar'] as const,
  /**
   * Events cache key. ownerKey must be stable & unique per owner:
   *  - 'me'          → current user's own calendar
   *  - employeeId    → target employee CUID
   *  - employeeCode  → fallback when only code is known
   * Different ownerKey values produce isolated cache entries so data never bleeds
   * between "my calendar" and someone else's calendar.
   */
  events: (scope: 'mine' | 'person' | 'unit', ownerKey: string, from?: string, to?: string) =>
    ['calendar-events', scope, ownerKey, from, to] as const,
  event: (id: string) => ['calendar-event', id] as const,
  permissions: (id: string) => ['calendar-permissions', id] as const,
};

export function useCalendarEvents(params?: ListCalendarEventsParams) {
  return useQuery({
    queryKey: calendarKeys.events(
      params?.scope ?? 'mine',
      params?.ownerId ?? params?.ownerAuthUserId ?? params?.employeeCode ?? 'me',
      params?.from,
      params?.to,
    ),
    queryFn: () => calendarApi.listEvents(params),
    staleTime: 30_000,
  });
}

export function useCalendarEvent(id: string | null) {
  return useQuery({
    queryKey: calendarKeys.event(id ?? ''),
    queryFn: () => (id ? calendarApi.getEvent(id) : null),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCalendarEventPermissions(id: string | null) {
  return useQuery({
    queryKey: calendarKeys.permissions(id ?? ''),
    queryFn: () => (id ? calendarApi.getEventPermissions(id) : null),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Fetch calendar events for a given owner + month range.
 * When ownerId/employeeCode is provided the query key differs from 'me' so
 * React Query never serves the current user's cached data for someone else.
 */
export function useCalendarOwnerEvents(
  ownerId: string | null,
  year: number,
  month: number,
  employeeCode?: string,
) {
  const from = useMemo(() => dayjs().year(year).month(month).startOf('month').toISOString(), [year, month]);
  const to = useMemo(() => dayjs().year(year).month(month).endOf('month').toISOString(), [year, month]);

  const isViewingOthers = ownerId !== null || !!employeeCode;
  const ownerKey = ownerId ?? employeeCode ?? 'me';

  return useQuery({
    queryKey: calendarKeys.events(isViewingOthers ? 'person' : 'mine', ownerKey, from, to),
    queryFn: () =>
      calendarApi.listEvents({
        scope: isViewingOthers ? 'person' : 'mine',
        ownerId: ownerId ?? undefined,
        employeeCode: employeeCode ?? undefined,
        from,
        to,
        includeParticipantEvents: isViewingOthers ? true : undefined,
      }),
    staleTime: 30_000,
  });
}
