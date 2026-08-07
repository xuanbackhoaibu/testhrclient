import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationApi, type ListNotificationsParams } from './notificationApi';

/**
 * Poll interval for in-app notifications. The HRM backend has no websocket
 * channel, so "realtime" is approximated with short polling. 30s keeps the
 * unread badge fresh without hammering the API.
 */
const POLL_INTERVAL_MS = 30_000;
const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

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
