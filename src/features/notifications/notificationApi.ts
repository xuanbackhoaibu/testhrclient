import { api } from '../../shared/api/httpClient';
import {
  isNotificationQuietTime,
  notificationEventFromType,
  readNotificationSettings,
} from './notificationSettings';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
const MOCK_NOTIFICATION_READ_KEY = 'hr-web-client.mock-notification-read-map';
const NOTIFICATION_RETENTION_DAYS = 30;

export interface AppNotification {
  id: string;
  type: string;
  category?: 'leave' | 'contract' | 'employee' | 'system';
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

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const mockNotifications: AppNotification[] = [
  {
    id: 'mock-leave-approval',
    type: 'LEAVE_REQUEST_CREATED',
    category: 'leave',
    title: 'Có đơn nghỉ phép mới cần duyệt',
    body: 'Nguyễn Văn A gửi đơn nghỉ phép 2 ngày, đang chờ HR xử lý.',
    actorName: 'Nguyễn Văn A',
    entityType: 'LEAVE_REQUEST',
    entityId: 'leave-1001',
    payload: { actionUrl: '/leave?status=PENDING' },
    readAt: null,
    createdAt: minutesAgo(8),
  },
  {
    id: 'mock-contract-expiring',
    type: 'CONTRACT_EXPIRING',
    category: 'contract',
    title: 'Hợp đồng sắp hết hạn',
    body: 'Hợp đồng của Trần Thị B còn 5 ngày hết hạn, cần đánh giá gia hạn.',
    actorName: 'Hệ thống',
    entityType: 'CONTRACT',
    entityId: 'contract-204',
    payload: { actionUrl: '/contracts' },
    readAt: null,
    createdAt: minutesAgo(65),
  },
  {
    id: 'mock-employee-created',
    type: 'EMPLOYEE_CREATED',
    category: 'employee',
    title: 'Nhân viên mới đã được tạo',
    body: 'Hồ sơ Lê Minh C đã được thêm vào hệ thống nhân sự.',
    actorName: 'HR Admin',
    entityType: 'EMPLOYEE',
    entityId: 'emp-102',
    payload: { actionUrl: '/employees' },
    readAt: null,
    createdAt: minutesAgo(190),
  },
  {
    id: 'mock-system-change',
    type: 'SYSTEM_CONFIGURATION_CHANGED',
    category: 'system',
    title: 'Cấu hình hệ thống vừa thay đổi',
    body: 'Chính sách mật khẩu hoặc phân quyền vừa được cập nhật.',
    actorName: 'System Admin',
    entityType: 'AUDIT_LOG',
    entityId: 'audit-66',
    payload: { actionUrl: '/audit-logs' },
    readAt: new Date(Date.now() - 95 * 60_000).toISOString(),
    createdAt: minutesAgo(420),
  },
];

function readMockReadMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(MOCK_NOTIFICATION_READ_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMockReadMap(readMap: Record<string, string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MOCK_NOTIFICATION_READ_KEY, JSON.stringify(readMap));
}

function isWithinRetention(notification: AppNotification) {
  const createdAt = new Date(notification.createdAt).getTime();
  if (Number.isNaN(createdAt)) return true;
  return Date.now() - createdAt <= NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
}

function applyNotificationPreferences(items: AppNotification[]) {
  const settings = readNotificationSettings();
  if (isNotificationQuietTime(settings)) {
    return [];
  }
  return items
    .filter(isWithinRetention)
    .filter((item) => settings.matrix[notificationEventFromType(item.category ?? item.type)]?.inApp !== false);
}

function getMockNotifications() {
  const readMap = readMockReadMap();
  return applyNotificationPreferences(
    mockNotifications.map((item) => ({
      ...item,
      readAt: readMap[item.id] ?? item.readAt,
    })),
  );
}

export interface ListNotificationsParams {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export const notificationApi = {
  async list(params: ListNotificationsParams = {}): Promise<AppNotification[]> {
    if (isMockMode) {
      const items = getMockNotifications();
      const filtered = params.unreadOnly ? items.filter((item) => !item.readAt) : items;
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 20;
      return filtered.slice((page - 1) * pageSize, page * pageSize);
    }

    const search = new URLSearchParams();
    search.append('page', String(params.page ?? 1));
    search.append('pageSize', String(params.pageSize ?? 20));
    if (params.unreadOnly) search.append('unreadOnly', 'true');

    // Gateway normalizes list payloads to `{ items }`; tolerate `{ data }` too.
    const raw = await api.get<RawNotificationList>(`/notifications?${search}`);
    const items = Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.data)
        ? raw.data
        : [];
    return applyNotificationPreferences(items);
  },

  async markRead(id: string): Promise<void> {
    if (isMockMode) {
      writeMockReadMap({ ...readMockReadMap(), [id]: new Date().toISOString() });
      return;
    }

    await api.patch<{ success: boolean }>(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    if (isMockMode) {
      const now = new Date().toISOString();
      const next = { ...readMockReadMap() };
      getMockNotifications().forEach((item) => {
        next[item.id] = item.readAt ?? now;
      });
      writeMockReadMap(next);
      return;
    }

    await api.patch<{ updated: number }>('/notifications/read-all');
  },
};
