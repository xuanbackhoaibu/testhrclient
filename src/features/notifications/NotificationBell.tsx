import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Indicator,
  Loader,
  Popover,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBell,
  IconBellCheck,
  IconBriefcase,
  IconCheck,
  IconClock,
  IconFileText,
  IconUserPlus,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import {
  useNotifications,
  useNotificationMutations,
  useNotificationStream,
} from './useNotifications';
import { useAuth } from '../auth/useAuth';
import type { AppNotification } from './notificationApi';
import {
  canReadNotificationEvent,
  getReadableNotificationEvents,
  notificationEventFromType,
  type NotificationEvent,
} from './notificationSettings';

type NotificationFilter = 'all' | NotificationEvent;

const categoryMeta: Record<NotificationEvent, {
  label: string;
  color: string;
  icon: typeof IconBell;
}> = {
  leave: { label: 'Đơn từ', color: 'hacomRed', icon: IconFileText },
  contract: { label: 'Nhắc nhở', color: 'orange', icon: IconBriefcase },
  employee: { label: 'Nhân sự', color: 'green', icon: IconUserPlus },
  system: { label: 'Hệ thống', color: 'violet', icon: IconAlertTriangle },
};

function parseNotificationDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatNotificationTime(value: string): string {
  const date = parseNotificationDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function relativeTime(value: string): string {
  const date = parseNotificationDate(value);
  if (!date) return '-';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 0) return 'Thời gian từ hệ thống';
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return formatNotificationTime(value);
}

function actionUrlOf(notification: AppNotification): string | null {
  const fromPayload =
    notification.payload && typeof notification.payload['actionUrl'] === 'string'
      ? (notification.payload['actionUrl'] as string)
      : null;
  if (fromPayload) return fromPayload;
  if (notification.entityType === 'CALENDAR_EVENT' && notification.entityId) {
    return `/calendar?eventId=${notification.entityId}`;
  }
  if (notification.entityType === 'EMPLOYEE' && notification.entityId) {
    return `/employees/${notification.entityId}`;
  }
  return null;
}

function categoryOf(notification: AppNotification): NotificationEvent {
  return notificationEventFromType(notification.category ?? notification.type);
}

function truncateText(value: string | null | undefined, maxLength: number) {
  if (!value) return '';
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

export function NotificationBell() {
  const [opened, setOpened] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const navigate = useNavigate();
  const { user } = useAuth();
  useNotificationStream();

  const { data: notifications = [], isLoading } = useNotifications({
    page: 1,
    pageSize: 30,
  });
  const { markRead, markAllRead } = useNotificationMutations();

  const readableEvents = useMemo(() => getReadableNotificationEvents(user), [user]);
  const readableEventSet = useMemo(
    () => new Set(readableEvents.map((event) => event.key)),
    [readableEvents],
  );
  const activeFilter: NotificationFilter =
    filter === 'all' || readableEventSet.has(filter) ? filter : 'all';
  const allowedNotifications = useMemo(
    () =>
      notifications.filter((notification) =>
        canReadNotificationEvent(user, categoryOf(notification)),
      ),
    [notifications, user],
  );

  const filteredNotifications = useMemo(
    () =>
      activeFilter === 'all'
        ? allowedNotifications
        : allowedNotifications.filter((notification) => categoryOf(notification) === activeFilter),
    [activeFilter, allowedNotifications],
  );

  const unreadByCategory = useMemo(() => {
    const result: Record<NotificationFilter, number> = {
      all: 0,
      leave: 0,
      contract: 0,
      employee: 0,
      system: 0,
    };
    allowedNotifications.forEach((notification) => {
      if (notification.readAt) return;
      const category = categoryOf(notification);
      result.all += 1;
      result[category] += 1;
    });
    return result;
  }, [allowedNotifications]);

  const visibleUnreadCount = unreadByCategory.all;

  const handleOpen = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    const url = actionUrlOf(notification);
    setOpened(false);
    if (url) navigate(url);
  };

  const filterOptions = [
    { value: 'all', label: `Tất cả ${unreadByCategory.all ? `(${unreadByCategory.all})` : ''}` },
    ...readableEvents.map((event) => ({
      value: event.key,
      label: `${categoryMeta[event.key].label} ${unreadByCategory[event.key] ? `(${unreadByCategory[event.key]})` : ''}`,
    })),
  ];

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      width="min(440px, calc(100vw - 24px))"
      shadow="xl"
      withArrow
    >
      <Popover.Target>
        <Indicator
          disabled={visibleUnreadCount === 0}
          label={visibleUnreadCount > 99 ? '99+' : visibleUnreadCount}
          size={17}
          color="red"
          offset={4}
        >
          <Tooltip label="Trung tâm thông báo">
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Trung tâm thông báo"
              onClick={() => setOpened((current) => !current)}
            >
              <IconBell size={20} />
            </ActionIcon>
          </Tooltip>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown p={0} className="notification-center-panel">
        <Group justify="space-between" px="md" py="sm" className="notification-center-header">
          <Box>
            <Text fw={800} size="sm">Trung tâm thông báo</Text>
            <Text size="xs" c="dimmed">Tự ẩn thông báo cũ sau 30 ngày</Text>
          </Box>
          <Group gap="xs">
            <Badge variant="light" color={visibleUnreadCount > 0 ? 'red' : 'green'} size="sm">
              {visibleUnreadCount} chưa đọc
            </Badge>
            {visibleUnreadCount > 0 ? (
              <Button
                variant="subtle"
                size="compact-xs"
                leftSection={<IconCheck size={13} />}
                onClick={() => markAllRead.mutate()}
                loading={markAllRead.isPending}
              >
                Đọc tất cả
              </Button>
            ) : null}
          </Group>
        </Group>

        <Box px="md" pb="sm">
          <SegmentedControl
            size="xs"
            fullWidth
            value={activeFilter}
            onChange={(value) => setFilter(value as NotificationFilter)}
            data={filterOptions}
          />
        </Box>

        <ScrollArea.Autosize className="notification-center-scroll" type="hover">
          {isLoading ? (
            <Group justify="center" py="xl">
              <Loader size="sm" />
            </Group>
          ) : filteredNotifications.length === 0 ? (
            <Stack align="center" gap="xs" py="xl" px="md">
              <ThemeIcon size={48} radius="xl" variant="light" color="green">
                <IconBellCheck size={24} />
              </ThemeIcon>
              <Text fw={800} ta="center">Không có thông báo phù hợp</Text>
              <Text c="dimmed" size="sm" ta="center">
                Hệ thống sẽ tự cập nhật khi có đơn từ, hợp đồng hoặc thay đổi mới.
              </Text>
            </Stack>
          ) : (
            <Stack gap={0}>
              {filteredNotifications.map((notification) => {
                const category = categoryOf(notification);
                const meta = categoryMeta[category];
                const Icon = meta.icon;
                const isUnread = !notification.readAt;
                const title = truncateText(notification.title, 120);
                const body = truncateText(notification.body, 220);
                const actorName = truncateText(notification.actorName, 48);
                const notificationTime = formatNotificationTime(notification.createdAt);
                return (
                  <UnstyledButton
                    key={notification.id}
                    onClick={() => handleOpen(notification)}
                    className={`notification-center-item ${isUnread ? 'is-unread' : ''}`}
                  >
                    <Group gap="sm" wrap="nowrap" align="flex-start">
                      <ThemeIcon radius="xl" variant="light" color={meta.color} size={34}>
                        <Icon size={18} />
                      </ThemeIcon>
                      <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                        <Group gap={6} wrap="nowrap">
                          <Badge size="xs" variant="light" color={meta.color}>{meta.label}</Badge>
                          <Group gap={4} wrap="nowrap" ml="auto" className="notification-meta">
                            {isUnread ? <span className="notification-unread-dot" aria-label="Chưa đọc" /> : null}
                            <IconClock size={12} />
                            <Tooltip label={relativeTime(notification.createdAt)}>
                              <Text size="10px" c="dimmed" span>
                                {notificationTime}
                              </Text>
                            </Tooltip>
                          </Group>
                        </Group>
                        <Text size="sm" fw={isUnread ? 800 : 650} lineClamp={2} className="notification-title">
                          {title}
                        </Text>
                        {body ? (
                          <Text size="xs" c="dimmed" lineClamp={3} className="notification-body">
                            {body}
                          </Text>
                        ) : null}
                        {actorName ? (
                          <Text size="10px" c="dimmed" lineClamp={1} className="notification-actor">
                            Người thực hiện: {actorName}
                          </Text>
                        ) : null}
                      </Stack>
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </ScrollArea.Autosize>

      </Popover.Dropdown>
    </Popover>
  );
}
