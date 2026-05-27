import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';

import { calendarApi } from './calendarApi';

export type CalendarViewMode = 'month' | 'week' | 'day';

export interface SelectedOwner {
  id: string;
  fullName: string;
  employeeCode: string;
  avatarUrl?: string;
}

export function useCalendarView() {
  const [currentDate, setCurrentDate] = useState(() => dayjs());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      switch (viewMode) {
        case 'month':
          return prev.add(1, 'month');
        case 'week':
          return prev.add(1, 'week');
        case 'day':
          return prev.add(1, 'day');
        default:
          return prev.add(1, 'month');
      }
    });
  }, [viewMode]);

  const goToPrev = useCallback(() => {
    setCurrentDate((prev) => {
      switch (viewMode) {
        case 'month':
          return prev.subtract(1, 'month');
        case 'week':
          return prev.subtract(1, 'week');
        case 'day':
          return prev.subtract(1, 'day');
        default:
          return prev.subtract(1, 'month');
      }
    });
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(dayjs());
  }, []);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(dayjs(date));
  }, []);

  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'month':
        return {
          from: currentDate.startOf('month').toISOString(),
          to: currentDate.endOf('month').toISOString(),
        };
      case 'week':
        return {
          from: currentDate.startOf('week').toISOString(),
          to: currentDate.endOf('week').toISOString(),
        };
      case 'day':
        return {
          from: currentDate.startOf('day').toISOString(),
          to: currentDate.endOf('day').toISOString(),
        };
      default:
        return {
          from: currentDate.startOf('month').toISOString(),
          to: currentDate.endOf('month').toISOString(),
        };
    }
  }, [currentDate, viewMode]);

  return {
    currentDate,
    viewMode,
    setCurrentDate,
    setViewMode,
    goToNext,
    goToPrev,
    goToToday,
    goToDate,
    dateRange,
    year: currentDate.year(),
    month: currentDate.month(),
  };
}

export function useSelectedOwner() {
  const [selectedOwner, setSelectedOwner] = useState<SelectedOwner | null>(null);

  const isViewingOthers = selectedOwner !== null;

  const selectOwner = useCallback((owner: SelectedOwner | null) => {
    setSelectedOwner(owner);
  }, []);

  const clearOwner = useCallback(() => {
    setSelectedOwner(null);
  }, []);

  return {
    selectedOwner,
    isViewingOthers,
    selectOwner,
    clearOwner,
  };
}

export function useCalendarMutations() {
  const createEvent = useCallback(
    async (data: Parameters<typeof calendarApi.createEvent>[0]) => {
      return calendarApi.createEvent(data);
    },
    [],
  );

  const updateEvent = useCallback(
    async (id: string, data: Parameters<typeof calendarApi.updateEvent>[1]) => {
      return calendarApi.updateEvent(id, data);
    },
    [],
  );

  const deleteEvent = useCallback(async (id: string) => {
    return calendarApi.deleteEvent(id);
  }, []);

  const addParticipant = useCallback(
    async (eventId: string, employeeId: string) => {
      return calendarApi.addParticipant(eventId, employeeId);
    },
    [],
  );

  const removeParticipant = useCallback(
    async (eventId: string, employeeId: string) => {
      return calendarApi.removeParticipant(eventId, employeeId);
    },
    [],
  );

  const updateMyResponse = useCallback(
    async (
      eventId: string,
      response: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE',
    ) => {
      return calendarApi.updateMyResponse(eventId, response);
    },
    [],
  );

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    addParticipant,
    removeParticipant,
    updateMyResponse,
  };
}
