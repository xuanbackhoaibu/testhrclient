import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingOverlay, Alert, Button, Group } from '@mantine/core';
import { IconAlertCircle, IconPlus } from '@tabler/icons-react';

import { CalendarHeader } from './components/CalendarHeader';
import { CalendarSidebar } from './components/CalendarSidebar';
import { CalendarView } from './components/CalendarView';
import { EventDetailModal } from './components/EventDetailModal';
import { AddCalendarChoiceModal, type CalendarChoiceKind } from './components/AddCalendarChoiceModal';
import { MeetingFormModal } from './components/MeetingFormModal';
import { PersonalEventFormModal } from './components/PersonalEventFormModal';
import { CalendarEventType } from '../../features/calendar/calendarApi';
import { useCalendarOwnerEvents, useCalendarUnitEvents, type CalendarEvent } from '../../features/calendar/useCalendarEvents';
import { useCalendarView } from '../../features/calendar/useCalendarView';
import { CalendarOwnerProvider, useCalendarOwner } from '../../features/calendar/CalendarContext';
import { ApiError } from '../../shared/api/api.types';
import styles from './CalendarPage.module.css';

function CalendarPageInner() {
  // Sở hữu DUY NHẤT 1 instance của useCalendarView() ở đây, truyền year/month
  // và các hàm điều hướng xuống CalendarView + CalendarSidebar bằng props —
  // xem giải thích trong CalendarView.tsx vì sao không gọi lại hook ở component con.
  const { year, month, currentDate, goToPrev, goToNext, goToToday, goToDate } = useCalendarView();
  const { selectedOwner, isViewingOthers, viewMode } = useCalendarOwner();

  // 'unit' dùng query riêng (scope='unit', không có ownerId) — 'mine'/'person'
  // vẫn dùng useCalendarOwnerEvents như cũ để không đổi hành vi đang chạy tốt.
  const ownerEventsQuery = useCalendarOwnerEvents(
    selectedOwner?.id ?? null,
    year,
    month,
    selectedOwner?.employeeCode,
  );
  const unitEventsQuery = useCalendarUnitEvents(year, month);
  const { data: eventsData, isLoading, error, refetch } =
    viewMode === 'unit' ? unitEventsQuery : ownerEventsQuery;

  const [searchParams, setSearchParams] = useSearchParams();
  const [localEventId, setLocalEventId] = useState<string | null>(null);
  // Luồng "Thêm lịch" 2 bước (tham khảo chat-web-client): bấm nút → modal
  // chọn loại ('choice') → chọn "Lịch họp"/"Lịch cá nhân" → mở form tương
  // ứng ('meeting'/'personal'). Khi sửa 1 sự kiện có sẵn, bỏ qua bước chọn —
  // mở thẳng form theo eventType của sự kiện đó.
  const [activeModal, setActiveModal] = useState<'choice' | 'meeting' | 'personal' | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  // Loại sự kiện đang bị ẩn khỏi lưới — điều khiển bằng checklist "Lịch của
  // tôi" trong sidebar (tham khảo bố cục chat-web-client), lọc phía client
  // vì list tháng đã tải hết về rồi, không cần gọi lại API.
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(() => new Set());
  const toggleType = useCallback((type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  // Chọn chi tiết bằng click trực tiếp hoặc deep-link từ thông báo (?eventId=...).
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
    setActiveModal('choice');
  }, []);

  const handleChoiceSelect = useCallback((kind: CalendarChoiceKind) => {
    setActiveModal(kind);
  }, []);

  const handleBackToChoice = useCallback(() => {
    setActiveModal('choice');
  }, []);

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setActiveModal(event.eventType === CalendarEventType.MEETING ? 'meeting' : 'personal');
  }, []);

  const handleCloseCreate = useCallback(() => {
    setActiveModal(null);
    setEditingEvent(null);
  }, []);

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  const events = useMemo(
    () => (eventsData?.data ?? []).filter((e) => !hiddenTypes.has(e.eventType)),
    [eventsData?.data, hiddenTypes],
  );

  // Backend returns mode:'NO_HR_PROFILE' (200) when the auth user has no linked HR employee.
  // Legacy path: if the old 422 is still received for some reason, catch via errorCode too.
  const isNoHrProfile =
    eventsData?.mode === 'NO_HR_PROFILE' ||
    (error instanceof ApiError && error.errorCode === 'EMPLOYEE_LINK_REQUIRED');

  const hasError = !!error && !isNoHrProfile;

  return (
    <div className={styles.page}>
      <CalendarHeader />

      <div className={styles.layout}>
        <CalendarSidebar
          currentDate={currentDate}
          onSelectDate={goToDate}
          hiddenTypes={hiddenTypes}
          onToggleType={toggleType}
        />

        <div className={styles.mainContent}>
          {/* Action bar — hide create button when HR not linked (would fail), or when
              viewing someone else's / the unit's aggregate calendar (read-only there) */}
          {!isViewingOthers && viewMode !== 'unit' && !isNoHrProfile && (
            <div className={styles.actionBar}>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={handleCreateEvent}
              >
                Thêm lịch
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

          {/* CalendarView (header + lưới) luôn được render, kể cả khi tháng
              không có sự kiện — trước đây phần này bị thay hẳn bằng 1 khối
              "trống" riêng, khiến header (tên tháng, mũi tên, nút "Hôm nay")
              biến mất mỗi khi đổi sang tháng không có sự kiện qua mini
              calendar. Giờ thông báo "chưa có sự kiện" chỉ đè lên phần lưới
              qua prop emptyMessage, header vẫn luôn ở đó. */}
          {!hasError && (
            <CalendarView
              events={events}
              year={year}
              month={month}
              goToPrev={goToPrev}
              goToNext={goToNext}
              goToToday={goToToday}
              onEventClick={handleEventClick}
              emptyMessage={
                events.length === 0 && !isLoading
                  ? selectedOwner
                    ? `${selectedOwner.fullName} chưa có sự kiện nào trong tháng này.`
                    : viewMode === 'unit'
                      ? 'Đơn vị của bạn chưa có sự kiện nào trong tháng này.'
                      : isNoHrProfile
                        ? 'Chưa có sự kiện nào. Liên kết hồ sơ nhân sự để xem lịch phòng ban.'
                        : 'Bạn chưa có sự kiện nào trong tháng này. Nhấn "Thêm lịch" để thêm mới.'
                  : undefined
              }
            />
          )}
        </div>
      </div>

      <EventDetailModal
        eventId={selectedEventId}
        onClose={handleCloseDetail}
        onEdit={handleEditEvent}
      />

      <AddCalendarChoiceModal
        opened={activeModal === 'choice'}
        onClose={handleCloseCreate}
        onSelect={handleChoiceSelect}
      />

      <MeetingFormModal
        key={`meeting-${activeModal === 'meeting' ? 'open' : 'closed'}-${editingEvent?.id ?? 'new'}`}
        opened={activeModal === 'meeting'}
        onClose={handleCloseCreate}
        onBack={editingEvent ? undefined : handleBackToChoice}
        editEvent={editingEvent}
      />

      <PersonalEventFormModal
        key={`personal-${activeModal === 'personal' ? 'open' : 'closed'}-${editingEvent?.id ?? 'new'}`}
        opened={activeModal === 'personal'}
        onClose={handleCloseCreate}
        onBack={editingEvent ? undefined : handleBackToChoice}
        editEvent={editingEvent}
      />
    </div>
  );
}

export function CalendarPage() {
  return (
    <CalendarOwnerProvider>
      <CalendarPageInner />
    </CalendarOwnerProvider>
  );
}
