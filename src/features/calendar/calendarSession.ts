import type { SelectedOwner } from './useCalendarView';

const SESSION_KEY = 'hacom.calendar.viewSession.v1';

interface CalendarViewSession {
  mode: 'me' | 'user';
  owner?: SelectedOwner;
  lastViewedAt: string;
}

export function readCalendarViewSession(): CalendarViewSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const s = parsed as Record<string, unknown>;
    if (s['mode'] !== 'me' && s['mode'] !== 'user') return null;
    if (s['mode'] === 'user') {
      const o = s['owner'];
      if (!o || typeof o !== 'object') return null;
      const owner = o as Record<string, unknown>;
      if (typeof owner['id'] !== 'string' || !owner['id']) return null;
      if (typeof owner['fullName'] !== 'string') return null;
    }
    return parsed as CalendarViewSession;
  } catch {
    return null;
  }
}

export function saveCalendarViewSession(mode: 'me' | 'user', owner?: SelectedOwner): void {
  try {
    const session: CalendarViewSession = {
      mode,
      owner,
      lastViewedAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}
