import { useState, useCallback, useMemo } from 'react';
import { AppShell, LoadingOverlay, Alert, Button, Group, Text } from '@mantine/core';
import { IconAlertCircle, IconCalendarEvent, IconPlus } from '@tabler/icons-react';

import { CalendarHeader } from './components/CalendarHeader';
import { CalendarSidebar } from './components/CalendarSidebar';
import { CalendarView } from './components/CalendarView';
import { EventDetailModal } from './components/EventDetailModal';
import { CreateEventModal } from './components/CreateEventModal';
import { useCalendarOwnerEvents, type CalendarEvent } from '../../features/calendar/useCalendarEvents';
import { useCalendarView, useSelectedOwner } from '../../features/calendar/useCalendarView';
import { ApiError } from '../../shared/api/api.types';
import styles from './CalendarPage.module.css';

export function CalendarPage() {
  const { year, month } = useCalendarView();
  const { selectedOwner, isViewingOthers } = useSelectedOwner();

  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useCalendarOwnerEvents(selectedOwner?.id ?? null, year, month);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEventId(event.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  const handleCreateEvent = useCallback(() => {
    setEditingEvent(null);
    setIsCreateModalOpen(true);
  }, []);

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setIsCreateModalOpen(true);
  }, []);

  const handleCloseCreate = useCallback(() => {
    setIsCreateModalOpen(false);
    setEditingEvent(null);
  }, []);

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  const events = useMemo(() => eventsData?.data ?? [], [eventsData?.data]);

  const isEmployeeLinkRequired =
    error instanceof ApiError &&
    error.errorCode === 'EMPLOYEE_LINK_REQUIRED';

  return (
    <AppShell header={{ height: 60 }} padding={0}>
      <AppShell.Header>
        <CalendarHeader />
      </AppShell.Header>

      <AppShell.Main>
        <div className={styles.layout}>
          <CalendarSidebar />

          <div className={styles.mainContent}>
            {/* Action bar */}
            {!isViewingOthers && (
              <div className={styles.actionBar}>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={handleCreateEvent}
                >
                  Tạo sự kiện
                </Button>
              </div>
            )}

            {isLoading && <LoadingOverlay visible overlayProps={{ blur: 2 }} />}

            {isEmployeeLinkRequired ? (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Chưa có hồ sơ nhân sự"
                color="yellow"
                m="md"
              >
                Tài khoản của bạn chưa được liên kết với hồ sơ nhân sự. Vui lòng liên hệ quản trị viên để được cấp hồ sơ nhân sự trước khi sử dụng lịch.
              </Alert>
            ) : error ? (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Lỗi tải dữ liệu"
                color="red"
                m="md"
                withCloseButton
              >
                {error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải dữ liệu lịch'}
                <Group mt="sm">
                  <Button size="xs" variant="light" onClick={handleRefetch}>
                    Thử lại
                  </Button>
                </Group>
              </Alert>
            ) : events.length === 0 && !isLoading ? (
              <div className={styles.emptyState}>
                <IconCalendarEvent size={48} className={styles.emptyStateIcon} />
                <Text size="sm" className={styles.emptyStateText}>
                  {selectedOwner
                    ? `${selectedOwner.fullName} chưa có sự kiện nào trong tháng này.`
                    : 'Bạn chưa có sự kiện nào trong tháng này. Nhấn "Tạo sự kiện" để thêm mới.'}
                </Text>
              </div>
            ) : (
              <CalendarView events={events} onEventClick={handleEventClick} />
            )}
          </div>
        </div>
      </AppShell.Main>

      <EventDetailModal
        eventId={selectedEventId}
        onClose={handleCloseDetail}
        onEdit={handleEditEvent}
      />

      <CreateEventModal
        opened={isCreateModalOpen}
        onClose={handleCloseCreate}
        editEvent={editingEvent}
      />
    </AppShell>
  );
}
