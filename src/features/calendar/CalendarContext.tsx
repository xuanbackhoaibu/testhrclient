/* eslint-disable react-refresh/only-export-components */
// Context files intentionally export both a Provider component and a consumer hook.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { SelectedOwner } from './useCalendarView';

interface CalendarOwnerContextValue {
  selectedOwner: SelectedOwner | null;
  isViewingOthers: boolean;
  selectOwner: (owner: SelectedOwner | null) => void;
  clearOwner: () => void;
}

const CalendarOwnerContext = createContext<CalendarOwnerContextValue | null>(null);

export function CalendarOwnerProvider({ children }: { children: ReactNode }) {
  const [selectedOwner, setSelectedOwner] = useState<SelectedOwner | null>(null);

  const selectOwner = useCallback((owner: SelectedOwner | null) => {
    setSelectedOwner(owner);
  }, []);

  const clearOwner = useCallback(() => {
    setSelectedOwner(null);
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
