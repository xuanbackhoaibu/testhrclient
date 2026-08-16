import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Indicator,
  Popover,
  ScrollArea,
  Skeleton,
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
  IconChevronLeft,
  IconClock,
  IconExternalLink,
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
type NotificationView = 'all' | 'unread';

const categoryMeta: Record<NotificationEvent, {
  label: string;
  color: string;
  icon: typeof IconBell;
}> = {
  leave: { label: 'Đơn từ', color: 'blue', icon: IconFileText },
  contract: { label: 'Nhắc nhở', color: 'blue', icon: IconBriefcase },
  employee: { label: 'Nhân sự', color: 'blue', icon: IconUserPlus },
  system: { label: 'Hệ thống', color: 'blue', icon: IconAlertTriangle },
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
  const [view, setView] = useState<NotificationView>('all');
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  useNotificationStream();

  const { data: notifications = [], isLoading } = useNotifications({
    page: 1,
    pageSize: 30,
  });
  const { markRead } = useNotificationMutations();

  const readableEvents = useMemo(() => getReadableNotificationEvents(user), [user]);
  const allowedNotifications = useMemo(
    () =>
      notifications.filter((notification) =>
        canReadNotificationEvent(user, categoryOf(notification)),
      ),
    [notifications, user],
  );

  const filteredNotifications = useMemo(
    () =>
      view === 'all'
        ? allowedNotifications
        : allowedNotifications.filter((notification) => !notification.readAt),
    [allowedNotifications, view],
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

  const groupedNotifications = useMemo(() => {
    return readableEvents.map((event) => event.key)
      .map((key) => ({
        key,
        meta: categoryMeta[key],
        items: filteredNotifications.filter((notification) => categoryOf(notification) === key),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredNotifications, readableEvents]);

  const handleSelect = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    setSelectedNotification(notification);
  };

  const handleOpenAction = (notification: AppNotification) => {
    const url = actionUrlOf(notification);
    setOpened(false);
    setSelectedNotification(null);
    if (url) navigate(url);
  };

  return (
    <Popover
      opened={opened}
      onChange={(nextOpened) => {
        setOpened(nextOpened);
        if (!nextOpened) setSelectedNotification(null);
      }}
      position="bottom-end"
      width="min(392px, calc(100vw - 24px))"
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
        {selectedNotification ? (
          <Stack gap={0} className="notification-detail-view">
            {(() => {
              const category = categoryOf(selectedNotification);
              const meta = categoryMeta[category];
              const Icon = meta.icon;
              const url = actionUrlOf(selectedNotification);
              return (
                <>
                  <Group justify="space-between" className="notification-center-header">
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      leftSection={<IconChevronLeft size={15} />}
                      onClick={() => setSelectedNotification(null)}
                    >
                      Quay lại
                    </Button>
                    <Badge size="sm" variant="light" color={meta.color}>{meta.label}</Badge>
                  </Group>
                  <Stack gap="md" className="notification-detail-body">
                    <Group gap="sm" align="flex-start" wrap="nowrap">
                      <ThemeIcon radius="xl" variant="light" color={meta.color} size={38}>
                        <Icon size={19} />
                      </ThemeIcon>
                      <Box style={{ minWidth: 0 }}>
                        <Text className="notification-detail-title">
                          {selectedNotification.title}
                        </Text>
                        <Group gap={6} mt={4} wrap="nowrap" className="notification-detail-time">
                          <IconClock size={13} />
                          <Text size="xs" c="dimmed">
                            {formatNotificationTime(selectedNotification.createdAt)}
                          </Text>
                          <Text size="xs" c="dimmed">· {relativeTime(selectedNotification.createdAt)}</Text>
                        </Group>
                      </Box>
                    </Group>

                    {selectedNotification.body ? (
                      <Text className="notification-detail-message">
                        {selectedNotification.body}
                      </Text>
                    ) : null}

                    {selectedNotification.actorName ? (
                      <Group justify="space-between" className="notification-detail-row">
                        <Text size="xs" c="dimmed">Người thực hiện</Text>
                        <Text size="xs">{selectedNotification.actorName}</Text>
                      </Group>
                    ) : null}

                    {url ? (
                      <Button
                        variant="light"
                        color="blue"
                        rightSection={<IconExternalLink size={14} />}
                        onClick={() => handleOpenAction(selectedNotification)}
                      >
                        Mở module liên quan
                      </Button>
                    ) : null}
                  </Stack>
                </>
              );
            })()}
          </Stack>
        ) : (
          <>
            <Group justify="space-between" px="md" py="sm" className="notification-center-header">
              <Box>
                <Text className="notification-center-title">Thông báo</Text>
              </Box>
            </Group>

            <ScrollArea type="never" className="notification-filter-scroll">
              <Group gap={6} wrap="nowrap" px="md" pb="sm">
                {[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'unread', label: 'Chưa đọc' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`notification-filter-chip${view === option.value ? ' is-active' : ''}`}
                    onClick={() => setView(option.value as NotificationView)}
                  >
                    {option.label}
                    {option.value === 'unread' && visibleUnreadCount > 0 ? (
                      <span>{visibleUnreadCount}</span>
                    ) : null}
                  </button>
                ))}
              </Group>
            </ScrollArea>

            <ScrollArea.Autosize className="notification-center-scroll" type="hover">
              {isLoading ? (
                <Stack gap={0}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Group key={index} gap="sm" wrap="nowrap" align="flex-start" className="notification-skeleton-item">
                      <Skeleton circle height={32} width={32} />
                      <Stack gap={7} style={{ minWidth: 0, flex: 1 }}>
                        <Group justify="space-between" wrap="nowrap">
                          <Skeleton height={12} width="62%" radius="xl" />
                          <Skeleton height={10} width={46} radius="xl" />
                        </Group>
                        <Skeleton height={10} width="88%" radius="xl" />
                        <Skeleton height={10} width="54%" radius="xl" />
                      </Stack>
                    </Group>
                  ))}
                </Stack>
              ) : filteredNotifications.length === 0 ? (
                <Stack align="center" gap={8} py={30} px="md" className="notification-empty-state">
                  <ThemeIcon size={42} radius="xl" variant="light" color="blue">
                    <IconBellCheck size={24} />
                  </ThemeIcon>
                  <Text className="notification-empty-title" ta="center">
                    {view === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo'}
                  </Text>
                  <Text c="dimmed" size="sm" ta="center">
                    Hệ thống sẽ tự cập nhật khi có nội dung mới.
                  </Text>
                </Stack>
              ) : (
                <Stack gap={0}>
                  {groupedNotifications.map((group) => (
                    <Box key={group.key} className="notification-group">
                      <Group justify="space-between" className="notification-group-title">
                        <Text size="xs">{group.meta.label}</Text>
                        <Text size="xs" c="dimmed">{group.items.length}</Text>
                      </Group>
                      {group.items.map((notification) => {
                        const meta = categoryMeta[categoryOf(notification)];
                        const Icon = meta.icon;
                        const isUnread = !notification.readAt;
                        const title = truncateText(notification.title, 92);
                        const body = truncateText(notification.body, 110);
                        return (
                          <UnstyledButton
                            key={notification.id}
                            onClick={() => handleSelect(notification)}
                            className={`notification-center-item ${isUnread ? 'is-unread' : ''}`}
                          >
                            <Group gap="sm" wrap="nowrap" align="flex-start">
                              <ThemeIcon radius="xl" variant="light" color={meta.color} size={32}>
                                <Icon size={17} />
                              </ThemeIcon>
                              <Stack gap={3} style={{ minWidth: 0, flex: 1 }}>
                                <Group gap={6} wrap="nowrap">
                                  <Text size="sm" className="notification-title" lineClamp={1}>
                                    {title}
                                  </Text>
                                  {isUnread ? <span className="notification-unread-dot" aria-label="Chưa đọc" /> : null}
                                  <Tooltip label={formatNotificationTime(notification.createdAt)}>
                                    <Text size="10px" c="dimmed" ml="auto" className="notification-time">
                                      {relativeTime(notification.createdAt)}
                                    </Text>
                                  </Tooltip>
                                </Group>
                                {body ? (
                                  <Text size="xs" c="dimmed" lineClamp={2} className="notification-body">
                                    {body}
                                  </Text>
                                ) : null}
                              </Stack>
                            </Group>
                          </UnstyledButton>
                        );
                      })}
                    </Box>
                  ))}
                </Stack>
              )}
            </ScrollArea.Autosize>
          </>
        )}

      </Popover.Dropdown>
    </Popover>
  );
}
