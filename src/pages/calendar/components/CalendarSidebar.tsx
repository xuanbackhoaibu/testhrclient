import { useState } from 'react';
import {
  Avatar,
  Button,
  Checkbox,
  Divider,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { IconX, IconCalendar, IconUsers, IconBuilding } from '@tabler/icons-react';
import type { Dayjs } from 'dayjs';
import type { SelectedOwner } from '../../../features/calendar/useCalendarView';
import { useCalendarOwner } from '../../../features/calendar/CalendarContext';
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, EVENT_TYPE_ORDER } from '../../../features/calendar/eventTypeMeta';
import { PersonSearchModal } from './PersonSearchModal';
import styles from './CalendarSidebar.module.css';

interface CalendarSidebarProps {
  /** Tháng/ngày đang hiển thị trên lưới lịch chính, để mini calendar đồng bộ theo. */
  currentDate: Dayjs;
  /** Gọi khi bấm chọn 1 ngày trên mini calendar — nhảy lưới chính tới tháng đó. */
  onSelectDate: (date: Date) => void;
  /** Các loại sự kiện đang bị ẩn khỏi lưới (điều khiển bởi checklist bên dưới). */
  hiddenTypes: Set<string>;
  onToggleType: (type: string) => void;
}

export function CalendarSidebar({ currentDate, onSelectDate, hiddenTypes, onToggleType }: CalendarSidebarProps) {
  const { selectedOwner, selectOwner, selectUnit, viewMode } = useCalendarOwner();
  const [isPersonSearchOpen, setIsPersonSearchOpen] = useState(false);

  const handleSelectUser = (owner: SelectedOwner | null) => {
    selectOwner(owner);
  };

  const displayName = selectedOwner?.fullName ?? selectedOwner?.employeeCode ?? 'N/A';

  return (
    <aside className={styles.sidebar}>
      <Stack gap="sm" h="100%">
        {/* Mini calendar điều hướng nhanh theo ngày/tháng — tham khảo bố cục
            sidebar của chat-web-client (mini calendar phía trên danh sách),
            dựng lại bằng component Calendar sẵn có của Mantine thay vì viết
            lại lưới ngày thủ công. */}
        <Calendar
          className={styles.miniCalendar}
          size="xs"
          date={currentDate.format('YYYY-MM-DD')}
          onDateChange={(value) => onSelectDate(new Date(value))}
          highlightToday
          getDayProps={(value) => ({
            selected: value === currentDate.format('YYYY-MM-DD'),
            onClick: () => onSelectDate(new Date(value)),
          })}
        />

        {/* Chế độ xem — tham khảo bố cục chat-web-client: 3 lựa chọn phạm vi
            lịch. "Lịch đơn vị" dùng scope='unit' đã có sẵn ở tầng API (backend
            tự resolve đơn vị theo người dùng đăng nhập, không cần chọn ai). */}
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          Chế độ xem
        </Text>
        <Stack gap={4}>
          <Button
            variant={viewMode === 'mine' ? 'filled' : 'subtle'}
            color={viewMode === 'mine' ? 'blue' : 'gray'}
            fullWidth
            justify="flex-start"
            size="xs"
            leftSection={<IconCalendar size={16} />}
            onClick={() => handleSelectUser(null)}
          >
            Lịch của tôi
          </Button>
          <Button
            variant={viewMode === 'person' ? 'filled' : 'subtle'}
            color={viewMode === 'person' ? 'blue' : 'gray'}
            fullWidth
            justify="flex-start"
            size="xs"
            leftSection={<IconUsers size={16} />}
            onClick={() => setIsPersonSearchOpen(true)}
          >
            Xem lịch người khác
          </Button>
          <Button
            variant={viewMode === 'unit' ? 'filled' : 'subtle'}
            color={viewMode === 'unit' ? 'blue' : 'gray'}
            fullWidth
            justify="flex-start"
            size="xs"
            leftSection={<IconBuilding size={16} />}
            onClick={selectUnit}
          >
            Lịch đơn vị
          </Button>
        </Stack>

        {/* "Currently viewing" card — shown only when viewing another person */}
        {viewMode === 'person' && selectedOwner && (
          <div className={styles.viewingCard}>
            <Avatar size="sm" radius="xl" color="blue" style={{ flexShrink: 0 }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <div className={styles.viewingCardInfo}>
              <div className={styles.viewingCardLabel}>Lịch đang xem</div>
              <div className={styles.viewingCardName} title={displayName}>
                {displayName}
              </div>
              {selectedOwner.employeeCode && (
                <div className={styles.viewingCardSub} title={selectedOwner.employeeCode}>
                  {selectedOwner.employeeCode}
                </div>
              )}
            </div>
            <button
              type="button"
              className={styles.viewingCardClose}
              title="Về lịch của tôi"
              onClick={() => handleSelectUser(null)}
            >
              <IconX size={14} />
            </button>
          </div>
        )}

        {/* Checklist loại sự kiện — ẩn/hiện theo loại ngay trên lưới, tham
            khảo mục "Lịch của tôi" (Lịch họp/Cá nhân/Chấm công...) của
            chat-web-client, dùng đúng CalendarEventType của HRM thay vì bịa
            loại không tồn tại trong dữ liệu thật. */}
        {viewMode !== 'person' && (
          <>
            <Divider label={viewMode === 'unit' ? 'Loại sự kiện' : 'Lịch của tôi'} labelPosition="left" />
            <Stack gap={6}>
              {EVENT_TYPE_ORDER.map((type) => (
                <Checkbox
                  key={type}
                  size="xs"
                  checked={!hiddenTypes.has(type)}
                  onChange={() => onToggleType(type)}
                  color={EVENT_TYPE_COLORS[type]}
                  label={
                    <Group gap={6} wrap="nowrap">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: `var(--mantine-color-${EVENT_TYPE_COLORS[type]}-6)`,
                          flexShrink: 0,
                        }}
                      />
                      <Text size="xs">{EVENT_TYPE_LABELS[type]}</Text>
                    </Group>
                  }
                />
              ))}
            </Stack>
          </>
        )}
      </Stack>

      <PersonSearchModal
        opened={isPersonSearchOpen}
        onClose={() => setIsPersonSearchOpen(false)}
        selectedOwner={selectedOwner}
        onSelect={handleSelectUser}
      />
    </aside>
  );
}
