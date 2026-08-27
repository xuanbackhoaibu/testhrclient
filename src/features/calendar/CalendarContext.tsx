/* eslint-disable react-refresh/only-export-components */
// Context files intentionally export both a Provider component and a consumer hook.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { SelectedOwner } from './useCalendarView';
import { readCalendarViewSession, saveCalendarViewSession } from './calendarSession';

interface CalendarOwnerContextValue {
  selectedOwner: SelectedOwner | null;
  isViewingOthers: boolean;
  selectOwner: (owner: SelectedOwner | null) => void;
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

  const selectOwner = useCallback((owner: SelectedOwner | null) => {
    setSelectedOwner(owner);
    if (owner) {
      saveCalendarViewSession('user', owner);
    } else {
      saveCalendarViewSession('me');
    }
  }, []);

  const clearOwner = useCallback(() => {
    setSelectedOwner(null);
    saveCalendarViewSession('me');
  }, []);

  return (
    <CalendarOwnerContext.Provider
      value={{
        selectedOwner,
        isViewingOthers: selectedOwner !== null,
        selectOwner,
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
