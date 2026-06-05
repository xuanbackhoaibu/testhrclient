import { api } from '../../shared/api/httpClient';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  actorName: string | null;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

interface RawNotificationList {
  items?: AppNotification[];
  data?: AppNotification[];
}

export interface ListNotificationsParams {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export const notificationApi = {
  async list(params: ListNotificationsParams = {}): Promise<AppNotification[]> {
    const search = new URLSearchParams();
    search.append('page', String(params.page ?? 1));
    search.append('pageSize', String(params.pageSize ?? 20));
    if (params.unreadOnly) search.append('unreadOnly', 'true');

    // Gateway normalizes list payloads to `{ items }`; tolerate `{ data }` too.
    const raw = await api.get<RawNotificationList>(`/notifications?${search}`);
    return Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.data)
        ? raw.data
        : [];
  },

  async unreadCount(): Promise<number> {
    const res = await api.get<{ count: number }>('/notifications/unread-count');
    return res?.count ?? 0;
  },

  async markRead(id: string): Promise<void> {
    await api.patch<{ success: boolean }>(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.patch<{ updated: number }>('/notifications/read-all');
  },
};
