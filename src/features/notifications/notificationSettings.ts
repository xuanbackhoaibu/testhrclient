import { AUTH_ADMIN_PERMISSIONS, HR_PERMISSIONS, hasAnyPermission } from '../auth/permissions';
import type { AuthUser } from '../auth/types';

export type NotificationChannel = 'inApp' | 'email';
export type NotificationEvent = 'leave' | 'contract' | 'employee' | 'system';

export type NotificationSettings = {
  matrix: Record<NotificationEvent, Record<NotificationChannel, boolean>>;
  quietHoursEnabled: boolean;
  quietFrom: string;
  quietTo: string;
};

export const NOTIFICATION_SETTINGS_STORAGE_KEY = 'hr-web-client.notification-settings';

export const notificationEvents: Array<{
  key: NotificationEvent;
  label: string;
  description: string;
  permissions: string[];
}> = [
  {
    key: 'leave',
    label: 'Đơn từ',
    description: 'Có đơn nghỉ phép mới, đơn cần duyệt hoặc cập nhật trạng thái.',
    permissions: [
      HR_PERMISSIONS.LEAVE_READ,
      HR_PERMISSIONS.LEAVE_APPROVE,
      HR_PERMISSIONS.LEAVE_UPDATE,
    ],
  },
  {
    key: 'contract',
    label: 'Nhắc nhở hợp đồng',
    description: 'Hợp đồng, thử việc hoặc phụ lục sắp hết hạn.',
    permissions: [
      HR_PERMISSIONS.CONTRACT_READ,
      HR_PERMISSIONS.CONTRACT_UPDATE,
    ],
  },
  {
    key: 'employee',
    label: 'Nhân sự',
    description: 'Nhân viên mới được tạo hoặc hồ sơ quan trọng vừa thay đổi.',
    permissions: [
      HR_PERMISSIONS.EMPLOYEE_READ,
      HR_PERMISSIONS.EMPLOYEE_CREATE,
      HR_PERMISSIONS.EMPLOYEE_UPDATE,
    ],
  },
  {
    key: 'system',
    label: 'Hệ thống / cảnh báo',
    description: 'Thay đổi cấu hình, bảo mật và cảnh báo vận hành.',
    permissions: [
      HR_PERMISSIONS.AUDIT_READ,
      AUTH_ADMIN_PERMISSIONS.USERS_READ,
      AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
      AUTH_ADMIN_PERMISSIONS.ROLES_READ,
      AUTH_ADMIN_PERMISSIONS.ROLES_MANAGE,
    ],
  },
];

export function canReadNotificationEvent(
  user: AuthUser | null | undefined,
  event: NotificationEvent,
) {
  const config = notificationEvents.find((item) => item.key === event);
  return Boolean(config && hasAnyPermission(user, config.permissions));
}

export function getReadableNotificationEvents(user: AuthUser | null | undefined) {
  return notificationEvents.filter((event) => canReadNotificationEvent(user, event.key));
}

export function createDefaultNotificationSettings(): NotificationSettings {
  return {
    matrix: {
      leave: { inApp: true, email: true },
      contract: { inApp: true, email: true },
      employee: { inApp: true, email: false },
      system: { inApp: true, email: true },
    },
    quietHoursEnabled: true,
    quietFrom: '22:00',
    quietTo: '07:00',
  };
}

function isNotificationEvent(value: string): value is NotificationEvent {
  return ['leave', 'contract', 'employee', 'system'].includes(value);
}

export function notificationEventFromType(type: string | null | undefined): NotificationEvent {
  const normalized = String(type ?? '').toLowerCase();
  if (normalized.includes('leave') || normalized.includes('absence') || normalized.includes('request')) {
    return 'leave';
  }
  if (normalized.includes('contract') || normalized.includes('probation')) {
    return 'contract';
  }
  if (normalized.includes('employee') || normalized.includes('profile') || normalized.includes('onboarding')) {
    return 'employee';
  }
  if (isNotificationEvent(normalized)) {
    return normalized;
  }
  return 'system';
}

export function readNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') {
    return createDefaultNotificationSettings();
  }

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY);
    if (!raw) return createDefaultNotificationSettings();
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    const defaults = createDefaultNotificationSettings();
    return {
      matrix: {
        leave: { ...defaults.matrix.leave, ...parsed.matrix?.leave },
        contract: { ...defaults.matrix.contract, ...parsed.matrix?.contract },
        employee: { ...defaults.matrix.employee, ...parsed.matrix?.employee },
        system: { ...defaults.matrix.system, ...parsed.matrix?.system },
      },
      quietHoursEnabled: parsed.quietHoursEnabled ?? defaults.quietHoursEnabled,
      quietFrom: parsed.quietFrom ?? defaults.quietFrom,
      quietTo: parsed.quietTo ?? defaults.quietTo,
    };
  } catch {
    return createDefaultNotificationSettings();
  }
}

export function writeNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function minutesOfDay(value: string) {
  const [hour = '0', minute = '0'] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}

export function isNotificationQuietTime(
  settings: Pick<NotificationSettings, 'quietHoursEnabled' | 'quietFrom' | 'quietTo'>,
) {
  if (!settings.quietHoursEnabled) return false;
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const from = minutesOfDay(settings.quietFrom);
  const to = minutesOfDay(settings.quietTo);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return false;
  return from < to
    ? current >= from && current < to
    : current >= from || current < to;
}
