/* eslint-disable react-refresh/only-export-components */
// Context files intentionally export both a Provider component and a consumer hook.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { SelectedOwner } from './useCalendarView';
import { readCalendarViewSession, saveCalendarViewSession } from './calendarSession';

interface CalendarOwnerContextValue {
  selectedOwner: SelectedOwner | null;
  isViewingOthers: boolean;
  /** 'mine' = lịch của tôi | 'person' = đang xem lịch người khác | 'unit' = lịch đơn vị (scope='unit', không cần chọn ai). */
  viewMode: 'mine' | 'person' | 'unit';
  selectOwner: (owner: SelectedOwner | null) => void;
  selectUnit: () => void;
  /** Chuyển sang chế độ "Xem lịch người khác" mà chưa chọn ai cụ thể — chỉ
      đổi viewMode để sidebar hiện danh sách chọn, KHÔNG đổi selectedOwner
      (nên nếu trước đó đã có người đang xem thì vẫn giữ nguyên lịch đang hiện). */
  browsePeople: () => void;
  clearOwner: () => void;
}

const CalendarOwnerContext = createContext<CalendarOwnerContextValue | null>(null);

function restoreOwnerFromSession(): SelectedOwner | null {
  const session = readCalendarViewSession();
  if (session?.mode === 'user' && session.owner) {
    return session.owner;
  }
  return null;
}

export function CalendarOwnerProvider({ children }: { children: ReactNode }) {
  // Lazy initializer restores last-viewed owner from localStorage on first mount.
  const [selectedOwner, setSelectedOwner] = useState<SelectedOwner | null>(restoreOwnerFromSession);
  const [viewMode, setViewMode] = useState<'mine' | 'person' | 'unit'>(
    restoreOwnerFromSession() ? 'person' : 'mine',
  );

  const selectOwner = useCallback((owner: SelectedOwner | null) => {
    setSelectedOwner(owner);
    if (owner) {
      setViewMode('person');
      saveCalendarViewSession('user', owner);
    } else {
      setViewMode('mine');
      saveCalendarViewSession('me');
    }
  }, []);

  const selectUnit = useCallback(() => {
    setSelectedOwner(null);
    setViewMode('unit');
    saveCalendarViewSession('me');
  }, []);

  const browsePeople = useCallback(() => {
    setViewMode('person');
  }, []);

  const clearOwner = useCallback(() => {
    setSelectedOwner(null);
    setViewMode('mine');
    saveCalendarViewSession('me');
  }, []);

  return (
    <CalendarOwnerContext.Provider
      value={{
        selectedOwner,
        isViewingOthers: selectedOwner !== null,
        viewMode,
        selectOwner,
        selectUnit,
        browsePeople,
        clearOwner,
      }}
    >
      {children}
    </CalendarOwnerContext.Provider>
  );
}

export function useCalendarOwner(): CalendarOwnerContextValue {
  const ctx = useContext(CalendarOwnerContext);
  if (!ctx) {
    throw new Error('useCalendarOwner must be used within CalendarOwnerProvider');
  }
  return ctx;
}
