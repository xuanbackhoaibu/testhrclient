import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell, LoadingOverlay, Alert, Button, Group, Text } from '@mantine/core';
import { IconAlertCircle, IconCalendarEvent, IconPlus } from '@tabler/icons-react';

import { CalendarHeader } from './components/CalendarHeader';
import { CalendarSidebar } from './components/CalendarSidebar';
import { CalendarView } from './components/CalendarView';
import { EventDetailModal } from './components/EventDetailModal';
import { CreateEventModal } from './components/CreateEventModal';
import { useCalendarOwnerEvents, type CalendarEvent } from '../../features/calendar/useCalendarEvents';
import { useCalendarView } from '../../features/calendar/useCalendarView';
import { CalendarOwnerProvider, useCalendarOwner } from '../../features/calendar/CalendarContext';
import { ApiError } from '../../shared/api/api.types';
import styles from './CalendarPage.module.css';

function CalendarPageInner() {
  const { year, month } = useCalendarView();
  const { selectedOwner, isViewingOthers } = useCalendarOwner();

  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useCalendarOwnerEvents(selectedOwner?.id ?? null, year, month, selectedOwner?.employeeCode);

  const [searchParams, setSearchParams] = useSearchParams();
  const [localEventId, setLocalEventId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Detail selection = explicit click OR notification deep-link (?eventId=...).
  // Derived (no effect) so the URL param opens the modal without cascading renders.
  const selectedEventId = localEventId ?? searchParams.get('eventId');

  const clearEventIdParam = useCallback(() => {
    if (searchParams.has('eventId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('eventId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setLocalEventId(event.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setLocalEventId(null);
    clearEventIdParam();
  }, [clearEventIdParam]);

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

  // Backend returns mode:'NO_HR_PROFILE' (200) when the auth user has no linked HR employee.
  // Legacy path: if the old 422 is still received for some reason, catch via errorCode too.
  const isNoHrProfile =
    eventsData?.mode === 'NO_HR_PROFILE' ||
    (error instanceof ApiError && error.errorCode === 'EMPLOYEE_LINK_REQUIRED');

  const hasError = !!error && !isNoHrProfile;

  return (
    <AppShell header={{ height: 60 }} padding={0}>
      <AppShell.Header>
        <CalendarHeader />
      </AppShell.Header>

      <AppShell.Main>
        <div className={styles.layout}>
          <CalendarSidebar />

          <div className={styles.mainContent}>
            {/* Action bar — hide create button when HR not linked (would fail) */}
            {!isViewingOthers && !isNoHrProfile && (
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

            {/* Soft notice — never blocks the calendar grid */}
            {isNoHrProfile && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Chưa liên kết hồ sơ nhân sự"
                color="yellow"
                m="md"
                mb="xs"
              >
                Tài khoản chưa được liên kết với hồ sơ nhân sự. Lịch phòng ban và công ty sẽ khả dụng sau khi liên kết. Vui lòng liên hệ quản trị viên nếu cần hỗ trợ.
              </Alert>
            )}

            {/* Hard error (network, 5xx, etc.) — not shown when it's just no HR profile */}
            {hasError && (
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
            )}

            {/* Calendar view is always rendered — empty state when no events */}
            {!hasError && (events.length === 0 && !isLoading ? (
              <div className={styles.emptyState}>
                <IconCalendarEvent size={48} className={styles.emptyStateIcon} />
                <Text size="sm" className={styles.emptyStateText}>
                  {selectedOwner
                    ? `${selectedOwner.fullName} chưa có sự kiện nào trong tháng này.`
                    : isNoHrProfile
                      ? 'Chưa có sự kiện nào. Liên kết hồ sơ nhân sự để xem lịch phòng ban.'
                      : 'Bạn chưa có sự kiện nào trong tháng này. Nhấn "Tạo sự kiện" để thêm mới.'}
                </Text>
              </div>
            ) : (
              <CalendarView events={events} onEventClick={handleEventClick} />
            ))}
          </div>
        </div>
      </AppShell.Main>

      <EventDetailModal
        eventId={selectedEventId}
        onClose={handleCloseDetail}
        onEdit={handleEditEvent}
      />

      <CreateEventModal
        key={`${isCreateModalOpen ? 'open' : 'closed'}-${editingEvent?.id ?? 'new'}`}
        opened={isCreateModalOpen}
        onClose={handleCloseCreate}
        editEvent={editingEvent}
      />
    </AppShell>
  );
}

export function CalendarPage() {
  return (
    <CalendarOwnerProvider>
      <CalendarPageInner />
    </CalendarOwnerProvider>
  );
}
