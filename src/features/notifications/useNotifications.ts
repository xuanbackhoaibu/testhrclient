import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationApi, type ListNotificationsParams } from './notificationApi';

/**
 * Poll interval for in-app notifications. The HRM backend has no websocket
 * channel, so "realtime" is approximated with short polling. 30s keeps the
 * unread badge fresh without hammering the API.
 */
const POLL_INTERVAL_MS = 30_000;
const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
const notificationStreamUrl =
  import.meta.env.VITE_NOTIFICATION_STREAM_URL ??
  (import.meta.env.VITE_HR_API_BASE_URL || import.meta.env.VITE_API_BASE_URL
    ? `${String(import.meta.env.VITE_HR_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')}/notifications/stream`
    : '/notifications/stream');

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: ListNotificationsParams) =>
    ['notifications', 'list', params ?? {}] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => notificationApi.unreadCount(),
    refetchInterval: isMockMode ? false : POLL_INTERVAL_MS,
    refetchOnWindowFocus: !isMockMode,
    staleTime: 10_000,
  });
}

export function useNotifications(params?: ListNotificationsParams) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationApi.list(params),
    refetchInterval: isMockMode ? false : POLL_INTERVAL_MS,
    staleTime: 10_000,
  });
}

export function useNotificationStream() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isMockMode || typeof EventSource === 'undefined') {
      return undefined;
    }

    const source = new EventSource(notificationStreamUrl, { withCredentials: true });

    source.onmessage = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    source.addEventListener('notification', () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    });

    source.onerror = () => {
      // Keep the connection lifecycle simple. React Query polling remains the
      // fallback when the backend has not enabled SSE yet.
    };

    return () => source.close();
  }, [queryClient]);
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: invalidate,
  });

  return { markRead, markAllRead };
}
