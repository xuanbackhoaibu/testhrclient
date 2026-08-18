import { useState, useCallback } from 'react';
import {
  Modal,
  Stack,
  Group,
  TextInput,
  Textarea,
  Select,
  Switch,
  Button,
  Loader,
  Divider,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconCalendar } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { calendarApi, CalendarVisibility, CalendarEventType, type CalendarEvent } from '../../../features/calendar/calendarApi';
import { useAuth } from '../../../features/auth/useAuth';
import { ParticipantPicker, type SelectedParticipant } from './ParticipantPicker';

const PERSONAL_VISIBILITY_OPTIONS = [
  { value: CalendarVisibility.PRIVATE, label: 'Riêng tư' },
  { value: CalendarVisibility.BUSY_ONLY, label: 'Chỉ bận' },
  { value: CalendarVisibility.TEAM, label: 'Nhóm' },
  { value: CalendarVisibility.UNIT, label: 'Đơn vị' },
  { value: CalendarVisibility.PUBLIC, label: 'Công khai' },
];

const VISIBILITY_OPTIONS = PERSONAL_VISIBILITY_OPTIONS;
const PERSONAL_ONLY_VISIBILITY_OPTIONS = PERSONAL_VISIBILITY_OPTIONS.filter(
  (option) =>
    option.value === CalendarVisibility.PRIVATE ||
    option.value === CalendarVisibility.PUBLIC,
);

const EVENT_TYPE_OPTIONS = [
  { value: CalendarEventType.PERSONAL, label: 'Lịch cá nhân' },
  { value: CalendarEventType.MEETING, label: 'Cuộc họp' },
  { value: CalendarEventType.TASK, label: 'Công việc' },
  { value: CalendarEventType.DEADLINE, label: 'Hạn chót' },
  { value: CalendarEventType.REMINDER, label: 'Nhắc nhở' },
  { value: CalendarEventType.LEAVE, label: 'Nghỉ phép' },
  { value: CalendarEventType.OTHER, label: 'Khác' },
];

// Trước đây "Bắt đầu"/"Kết thúc" dùng <TextInput type="datetime-local">, tức
// là input NGÀY GIỜ GỐC CỦA TRÌNH DUYỆT — popup lịch/giờ đó do hệ điều hành/
// trình duyệt tự vẽ, không thể chỉnh CSS, nên nhìn lệch hẳn tông với phần còn
// lại của app (đây là ảnh chụp màn hình người dùng gửi). Đổi sang
// DateTimePicker của @mantine/dates (đã có sẵn trong package.json, chỉ chưa
// dùng) để popup lịch/giờ dùng chung style với toàn bộ ứng dụng.
function toLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = dayjs(iso);
  return d.isValid() ? d.toDate() : null;
}

function participantsFromEvent(event: CalendarEvent | null | undefined): SelectedParticipant[] {
  if (!event?.participants?.length) return [];
  return event.participants.map((p) => ({
    id: p.employeeId,
    fullName: p.fullName ?? p.employee?.fullName ?? p.employeeCode ?? p.employeeId,
    employeeCode: p.employeeCode ?? p.employee?.employeeCode ?? '',
    departmentName: p.departmentName,
  }));
}

function normalizeVisibility(value: string | null | undefined): CalendarVisibility {
  const normalized = value?.trim().toUpperCase();
  return Object.values(CalendarVisibility).includes(normalized as CalendarVisibility)
    ? (normalized as CalendarVisibility)
    : CalendarVisibility.PRIVATE;
}

function isPersonalEventType(value: string): boolean {
  return value === CalendarEventType.PERSONAL;
}

interface CreateEventModalProps {
  opened: boolean;
  onClose: () => void;
  editEvent?: CalendarEvent | null;
}

export function CreateEventModal({ opened, onClose, editEvent }: CreateEventModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = !!editEvent;

  // Lazy initializers read editEvent on mount. CalendarPage gives this modal a
  // `key` that changes per open / edit target, so it remounts with fresh values
  // (this is what makes "Edit" correctly preload — no state-sync effect needed).
  const [title, setTitle] = useState(() => editEvent?.title ?? '');
  const [description, setDescription] = useState(() => editEvent?.description ?? '');
  const [startAt, setStartAt] = useState<Date | null>(() => toLocalDate(editEvent?.startAt));
  const [endAt, setEndAt] = useState<Date | null>(() => toLocalDate(editEvent?.endAt));
  const [visibility, setVisibility] = useState<CalendarVisibility>(
    () => normalizeVisibility(editEvent?.visibility),
  );
  const [eventType, setEventType] = useState<CalendarEventType>(
    () => editEvent?.eventType ?? CalendarEventType.PERSONAL,
  );
  const [location, setLocation] = useState(() => editEvent?.location ?? '');
  const [isAllDay, setIsAllDay] = useState(() => editEvent?.isAllDay ?? false);
  const [participants, setParticipants] = useState<SelectedParticipant[]>(() =>
    participantsFromEvent(editEvent),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const showParticipants =
    !isPersonalEventType(eventType) &&
    (eventType === CalendarEventType.MEETING || participants.length > 0);

  const visibilityOptions = isPersonalEventType(eventType)
    ? PERSONAL_ONLY_VISIBILITY_OPTIONS
    : VISIBILITY_OPTIONS;

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      notifications.show({ title: 'Lỗi', message: 'Vui lòng nhập tiêu đề', color: 'red' });
      return;
    }
    if (!startAt || !endAt) {
      notifications.show({
        title: 'Lỗi',
        message: 'Vui lòng nhập thời gian bắt đầu và kết thúc',
        color: 'red',
      });
      return;
    }

    const start = dayjs(startAt);
    const end = dayjs(endAt);
    if (!start.isValid() || !end.isValid()) {
      notifications.show({ title: 'Lỗi', message: 'Thời gian không hợp lệ', color: 'red' });
      return;
    }
    if (end.isBefore(start)) {
      notifications.show({
        title: 'Lỗi',
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
        color: 'red',
      });
      return;
    }

    const participantIds =
      !isPersonalEventType(eventType) &&
      (eventType === CalendarEventType.MEETING || participants.length > 0)
        ? participants.map((p) => p.id)
        : [];

    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      // Send absolute instants (UTC ISO) so the server stores the correct
      // moment regardless of its own timezone.
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      visibility,
      eventType,
      location: location.trim() || undefined,
      isAllDay,
      timezone,
      participantIds,
    };

    setIsSubmitting(true);
    try {
      if (isEditing && editEvent) {
        await calendarApi.updateEvent(editEvent.id, payload);
        notifications.show({
          title: 'Thành công',
          message:
            participantIds.length > 0
              ? 'Đã cập nhật lịch họp và đồng bộ người tham gia'
              : 'Đã cập nhật sự kiện',
          color: 'green',
        });
      } else {
        await calendarApi.createEvent(payload);
        notifications.show({
          title: 'Thành công',
          message:
            participantIds.length > 0
              ? 'Đã tạo lịch họp và gửi thông báo cho người tham gia'
              : 'Đã tạo sự kiện mới',
          color: 'green',
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      handleClose();
    } catch (error) {
      notifications.show({
        title: 'Lỗi',
        message: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lưu sự kiện',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    title,
    description,
    startAt,
    endAt,
    visibility,
    eventType,
    location,
    isAllDay,
    participants,
    isEditing,
    editEvent,
    queryClient,
    handleClose,
  ]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={isEditing ? 'Sửa sự kiện' : 'Tạo sự kiện mới'}
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label="Tiêu đề"
          placeholder="Nhập tiêu đề sự kiện"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
          maxLength={255}
        />

        <Textarea
          label="Mô tả"
          placeholder="Nhập mô tả (tùy chọn)"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={3}
        />

        <Group grow>
          <DateTimePicker
            label="Bắt đầu"
            placeholder="Chọn ngày giờ bắt đầu"
            value={startAt ? dayjs(startAt).format('YYYY-MM-DDTHH:mm:ss') : null}
            onChange={(value) => setStartAt(value ? dayjs(value).toDate() : null)}
            valueFormat="DD/MM/YYYY HH:mm"
            leftSection={<IconCalendar size={16} />}
            clearable
            required
          />
          <DateTimePicker
            label="Kết thúc"
            placeholder="Chọn ngày giờ kết thúc"
            value={endAt ? dayjs(endAt).format('YYYY-MM-DDTHH:mm:ss') : null}
            onChange={(value) => setEndAt(value ? dayjs(value).toDate() : null)}
            valueFormat="DD/MM/YYYY HH:mm"
            leftSection={<IconCalendar size={16} />}
            clearable
            required
          />
        </Group>

        <Group grow>
          <Select
            label="Loại sự kiện"
            data={EVENT_TYPE_OPTIONS}
            value={eventType}
            onChange={(val) => {
              const nextType =
                (val as CalendarEventType | null) ?? CalendarEventType.PERSONAL;
              setEventType(nextType);
              if (
                isPersonalEventType(nextType) &&
                visibility !== CalendarVisibility.PRIVATE &&
                visibility !== CalendarVisibility.PUBLIC
              ) {
                setVisibility(CalendarVisibility.PRIVATE);
              }
            }}
            required
          />
          <Select
            label="Hiển thị"
            data={visibilityOptions}
            value={visibility}
            onChange={(val) => setVisibility(normalizeVisibility(val))}
            required
          />
        </Group>

        <TextInput
          label="Địa điểm"
          placeholder="Nhập địa điểm (tùy chọn)"
          value={location}
          onChange={(e) => setLocation(e.currentTarget.value)}
        />

        <Switch
          label="Cả ngày"
          checked={isAllDay}
          onChange={(e) => setIsAllDay(e.currentTarget.checked)}
        />

        {showParticipants && (
          <>
            <Divider label="Lịch họp" labelPosition="left" />
            <ParticipantPicker
              value={participants}
              onChange={setParticipants}
              excludeEmployeeId={user?.employeeId ?? user?.employee?.id ?? null}
            />
          </>
        )}

        <Divider />

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            leftSection={isSubmitting ? <Loader size={14} /> : <IconCalendar size={16} />}
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            {isEditing ? 'Lưu thay đổi' : 'Tạo sự kiện'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
