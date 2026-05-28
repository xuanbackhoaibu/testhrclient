import { Badge, Group, Stack, Text, Avatar, UnstyledButton } from '@mantine/core';
import { IconCalendar, IconEye, IconArrowLeft } from '@tabler/icons-react';
import { useCalendarOwner } from '../../../features/calendar/CalendarContext';
import styles from './CalendarHeader.module.css';

export function CalendarHeader() {
  const { selectedOwner, isViewingOthers, clearOwner } = useCalendarOwner();

  return (
    <div className={styles.header}>
      <Group gap="md">
        {isViewingOthers ? (
          <>
            <Avatar size="md" radius="xl" color="blue">
              {selectedOwner?.fullName?.charAt(0).toUpperCase() ?? '?'}
            </Avatar>
            <Stack gap={2}>
              <Group gap="xs">
                <IconEye size={14} />
                <Text size="xs" c="dimmed">
                  Đang xem lịch của
                </Text>
              </Group>
              <Group gap="xs">
                <Text fw={600}>{selectedOwner?.fullName ?? 'N/A'}</Text>
                <Badge color="orange" variant="light" size="sm">
                  Chỉ xem
                </Badge>
              </Group>
            </Stack>
            <UnstyledButton
              className={styles.backButton}
              onClick={clearOwner}
            >
              <IconArrowLeft size={14} />
              <Text size="sm">Quay lại lịch của tôi</Text>
            </UnstyledButton>
          </>
        ) : (
          <>
            <IconCalendar size={24} />
            <Text fw={600} size="lg">
              Lịch của tôi
            </Text>
          </>
        )}
      </Group>
    </div>
  );
}
