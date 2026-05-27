import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { calendarApi, type ListCalendarEventsParams, type CalendarEvent } from './calendarApi';

export type { CalendarEvent, ListCalendarEventsParams };

export { calendarApi };

export const calendarKeys = {
  all: ['calendar'] as const,
  events: (filters?: ListCalendarEventsParams) => ['calendar-events', filters] as const,
  event: (id: string) => ['calendar-event', id] as const,
  permissions: (id: string) => ['calendar-permissions', id] as const,
};

export function useCalendarEvents(params?: ListCalendarEventsParams) {
  const queryFn = useCallback(async () => {
    return await calendarApi.listEvents(params);
  }, [params?.ownerId, params?.from, params?.to, params?.type]);

  return useQuery({
    queryKey: calendarKeys.events(params),
    queryFn: queryFn,
    staleTime: 30_000,
  });
}

export function useCalendarEventsForMonth(year: number, month: number, ownerId?: string) {
  const from = useMemo(() => dayjs().year(year).month(month).startOf('month').toISOString(), [year, month]);
  const to = useMemo(() => dayjs().year(year).month(month).endOf('month').toISOString(), [year, month]);

  return useCalendarEvents({
    ownerId,
    from,
    to,
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

export function useCalendarOwnerEvents(ownerId: string | null, year: number, month: number) {
  const from = useMemo(() => dayjs().year(year).month(month).startOf('month').toISOString(), [year, month]);
  const to = useMemo(() => dayjs().year(year).month(month).endOf('month').toISOString(), [year, month]);

  return useCalendarEvents({
    ownerId: ownerId ?? undefined,
    from,
    to,
  });
}

export function useMyCalendarEvents(year: number, month: number) {
  return useCalendarOwnerEvents(null, year, month);
}
