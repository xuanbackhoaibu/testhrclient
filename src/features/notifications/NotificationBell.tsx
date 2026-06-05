import { useState } from 'react';
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
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconBell, IconCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import {
  useNotifications,
  useUnreadNotificationCount,
  useNotificationMutations,
} from './useNotifications';
import type { AppNotification } from './notificationApi';

function relativeTime(iso: string): string {
  const now = dayjs();
  const then = dayjs(iso);
  const diffMin = now.diff(then, 'minute');
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = now.diff(then, 'hour');
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = now.diff(then, 'day');
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return then.format('DD/MM/YYYY HH:mm');
}

function actionUrlOf(n: AppNotification): string | null {
  const fromPayload =
    n.payload && typeof n.payload['actionUrl'] === 'string'
      ? (n.payload['actionUrl'] as string)
      : null;
  if (fromPayload) return fromPayload;
  if (n.entityType === 'CALENDAR_EVENT' && n.entityId) {
    return `/calendar?eventId=${n.entityId}`;
  }
  return null;
}

export function NotificationBell() {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notifications = [], isLoading } = useNotifications({
    page: 1,
    pageSize: 20,
  });
  const { markRead, markAllRead } = useNotificationMutations();

  const handleOpen = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    const url = actionUrlOf(n);
    setOpened(false);
    if (url) navigate(url);
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      width={360}
      shadow="md"
      withArrow
    >
      <Popover.Target>
        <Indicator
          disabled={unreadCount === 0}
          label={unreadCount > 99 ? '99+' : unreadCount}
          size={16}
          color="red"
          offset={4}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label="Thông báo"
            onClick={() => setOpened((o) => !o)}
          >
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <Group justify="space-between" px="md" py="sm">
          <Text fw={600} size="sm">
            Thông báo
          </Text>
          {unreadCount > 0 && (
            <Button
              variant="subtle"
              size="compact-xs"
              leftSection={<IconCheck size={13} />}
              onClick={() => markAllRead.mutate()}
              loading={markAllRead.isPending}
            >
              Đánh dấu đã đọc
            </Button>
          )}
        </Group>

        <ScrollArea.Autosize mah={420} type="hover">
          {isLoading ? (
            <Group justify="center" py="xl">
              <Loader size="sm" />
            </Group>
          ) : notifications.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="xl">
              Không có thông báo
            </Text>
          ) : (
            <Stack gap={0}>
              {notifications.map((n) => (
                <UnstyledButton
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  style={{
                    padding: '10px 16px',
                    borderTop: '1px solid var(--mantine-color-gray-2)',
                    backgroundColor: n.readAt
                      ? undefined
                      : 'var(--mantine-color-blue-0)',
                  }}
                >
                  <Group gap="xs" wrap="nowrap" align="flex-start">
                    {!n.readAt && (
                      <Box
                        mt={6}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'var(--mantine-color-blue-6)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" fw={n.readAt ? 400 : 600} lineClamp={1}>
                        {n.title}
                      </Text>
                      {n.body && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {n.body}
                        </Text>
                      )}
                      <Text size="10px" c="dimmed">
                        {relativeTime(n.createdAt)}
                      </Text>
                    </Stack>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>

        {notifications.length > 0 && (
          <Box px="md" py={6} style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            <Badge variant="light" color="gray" size="xs">
              {unreadCount} chưa đọc
            </Badge>
          </Box>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
