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
import { notifications } from '@mantine/notifications';
import { IconCalendar } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { calendarApi, CalendarVisibility, CalendarEventType, type CalendarEvent } from '../../../features/calendar/calendarApi';

const VISIBILITY_OPTIONS = [
  { value: CalendarVisibility.PRIVATE, label: 'Riêng tư' },
  { value: CalendarVisibility.BUSY_ONLY, label: 'Chỉ bận' },
  { value: CalendarVisibility.TEAM, label: 'Nhóm' },
  { value: CalendarVisibility.UNIT, label: 'Đơn vị' },
  { value: CalendarVisibility.PUBLIC, label: 'Công khai' },
];

const EVENT_TYPE_OPTIONS = [
  { value: CalendarEventType.MEETING, label: 'Cuộc họp' },
  { value: CalendarEventType.TASK, label: 'Công việc' },
  { value: CalendarEventType.DEADLINE, label: 'Hạn chót' },
  { value: CalendarEventType.REMINDER, label: 'Nhắc nhở' },
  { value: CalendarEventType.LEAVE, label: 'Nghỉ phép' },
  { value: CalendarEventType.OTHER, label: 'Khác' },
];

interface CreateEventModalProps {
  opened: boolean;
  onClose: () => void;
  editEvent?: CalendarEvent | null;
}

export function CreateEventModal({ opened, onClose, editEvent }: CreateEventModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editEvent;

  const [title, setTitle] = useState(editEvent?.title ?? '');
  const [description, setDescription] = useState(editEvent?.description ?? '');
  const [startAt, setStartAt] = useState(editEvent?.startAt ?? '');
  const [endAt, setEndAt] = useState(editEvent?.endAt ?? '');
  const [visibility, setVisibility] = useState<string>(editEvent?.visibility ?? CalendarVisibility.PRIVATE);
  const [eventType, setEventType] = useState<string>(editEvent?.eventType ?? CalendarEventType.MEETING);
  const [location, setLocation] = useState(editEvent?.location ?? '');
  const [isAllDay, setIsAllDay] = useState(editEvent?.isAllDay ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      notifications.show({
        title: 'Lỗi',
        message: 'Vui lòng nhập tiêu đề',
        color: 'red',
      });
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

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (endDate < startDate) {
      notifications.show({
        title: 'Lỗi',
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
        color: 'red',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && editEvent) {
        await calendarApi.updateEvent(editEvent.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          startAt,
          endAt,
          visibility,
          eventType,
          location: location.trim() || undefined,
          isAllDay,
        });
        notifications.show({
          title: 'Thành công',
          message: 'Đã cập nhật sự kiện',
          color: 'green',
        });
      } else {
        await calendarApi.createEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          startAt,
          endAt,
          visibility,
          eventType,
          location: location.trim() || undefined,
          isAllDay,
        });
        notifications.show({
          title: 'Thành công',
          message: 'Đã tạo sự kiện mới',
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
    isEditing,
    editEvent,
    queryClient,
  ]);

  const handleClose = useCallback(() => {
    setTitle('');
    setDescription('');
    setStartAt('');
    setEndAt('');
    setVisibility(CalendarVisibility.PRIVATE);
    setEventType(CalendarEventType.MEETING);
    setLocation('');
    setIsAllDay(false);
    onClose();
  }, [onClose]);

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
          <TextInput
            label="Bắt đầu"
            placeholder="2024-01-01T09:00"
            value={startAt}
            onChange={(e) => setStartAt(e.currentTarget.value)}
            required
          />

          <TextInput
            label="Kết thúc"
            placeholder="2024-01-01T10:00"
            value={endAt}
            onChange={(e) => setEndAt(e.currentTarget.value)}
            required
          />
        </Group>

        <Group grow>
          <Select
            label="Loại sự kiện"
            data={EVENT_TYPE_OPTIONS}
            value={eventType}
            onChange={(val) => setEventType(val ?? CalendarEventType.MEETING)}
            required
          />

          <Select
            label="Hiển thị"
            data={VISIBILITY_OPTIONS}
            value={visibility}
            onChange={(val) => setVisibility(val ?? CalendarVisibility.PRIVATE)}
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
