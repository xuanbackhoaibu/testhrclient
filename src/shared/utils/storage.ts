export const STORAGE_KEYS = {
  accessToken: 'hr-web-client.accessToken',
  currentUser: 'hr-web-client.currentUser',
} as const;

export function getStoredString(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key);
}

export function setStoredString(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, value);
}

export function removeStoredString(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(key);
}

