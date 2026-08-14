import { Badge, Button, Group, Text, Avatar } from '@mantine/core';
import { IconCalendar, IconEye, IconArrowLeft } from '@tabler/icons-react';
import { useCalendarOwner } from '../../../features/calendar/CalendarContext';
import styles from './CalendarHeader.module.css';

export function CalendarHeader() {
  const { selectedOwner, isViewingOthers, clearOwner } = useCalendarOwner();

  const displayName = selectedOwner?.fullName ?? selectedOwner?.employeeCode ?? 'N/A';

  return (
    <div className={styles.header}>
      <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
        {isViewingOthers ? (
          <>
            {/* Avatar */}
            <Avatar size="md" radius="xl" color="hacomRed" style={{ flexShrink: 0 }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>

            {/* Name block — truncates on overflow */}
            <div className={styles.viewingInfo}>
              <Group gap={6} wrap="nowrap">
                <IconEye size={13} style={{ flexShrink: 0, color: 'var(--mantine-color-gray-5)' }} />
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  Đang xem lịch của
                </Text>
              </Group>
              <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                <Text
                  fw={600}
                  className={styles.viewingName}
                  title={displayName}
                >
                  {displayName}
                </Text>
                {selectedOwner?.employeeCode && (
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                    · {selectedOwner.employeeCode}
                  </Text>
                )}
                <Badge color="orange" variant="light" size="sm" style={{ flexShrink: 0 }}>
                  Chỉ xem
                </Badge>
              </Group>
            </div>

            {/* Back button */}
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconArrowLeft size={14} />}
              onClick={clearOwner}
              style={{ flexShrink: 0 }}
            >
              Về lịch của tôi
            </Button>
          </>
        ) : (
          <>
            <IconCalendar size={24} style={{ flexShrink: 0 }} />
            <Text fw={600} size="lg">
              Lịch của tôi
            </Text>
          </>
        )}
      </Group>
    </div>
  );
}
