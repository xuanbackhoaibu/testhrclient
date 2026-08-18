import { useCallback, useMemo, useState } from 'react';
import { Modal, Stack, Group, TextInput, Textarea, Select, Button, Loader, Divider, Text, Badge } from '@mantine/core';
import { DateInput, TimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconCalendar } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { calendarApi, CalendarVisibility, CalendarEventType, type CalendarEvent } from '../../../features/calendar/calendarApi';
import { CalendarAttachmentDropzone } from './CalendarAttachmentDropzone';
import {
  uploadCalendarAttachments,
  CalendarAttachmentUploadError,
} from '../../../features/calendar/calendarAttachmentUpload';
import type { CalendarAttachmentDto } from '../../../features/calendar/calendarSharedTypes';

// Các loại lịch không phải cuộc họp — người dùng tự tạo qua nhánh "Lịch cá
// nhân" của luồng Thêm lịch (MEETING có form riêng: MeetingFormModal).
// LEAVE (Nghỉ phép) vẫn cho chọn thủ công ở đây để ghi chú nhanh trên lịch —
// đây là 1 sự kiện lịch độc lập, không tự trừ phép hay tạo đơn ở module
// Nghỉ phép (leaveApi.ts/LeavePage.tsx); đơn nghỉ phép chính thức vẫn cần
// nộp riêng ở trang Nghỉ phép.
const PERSONAL_TYPE_OPTIONS = [
  { value: CalendarEventType.PERSONAL, label: 'Cá nhân' },
  { value: CalendarEventType.TASK, label: 'Công việc' },
  { value: CalendarEventType.DEADLINE, label: 'Hạn chót' },
  { value: CalendarEventType.LEAVE, label: 'Nghỉ phép' },
  { value: CalendarEventType.REMINDER, label: 'Nhắc nhở' },
  { value: CalendarEventType.OTHER, label: 'Khác' },
];

interface PersonalEventFormModalProps {
  opened: boolean;
  onClose: () => void;
  /** Quay lại modal chọn loại lịch — chỉ có khi đang tạo mới. */
  onBack?: () => void;
  editEvent?: CalendarEvent | null;
}

/**
 * "Thêm lịch cá nhân" — nhánh Lịch cá nhân của luồng Thêm lịch 2 bước, tham
 * khảo PersonalEventFormModal.tsx của chat-web-client. Không có người tham
 * gia/địa điểm/quyền xem (luôn PRIVATE) — chỉ Nội dung, Loại lịch, Thời gian
 * (Từ ngày → Đến ngày), Ghi chú và đính kèm — file đính kèm được upload thật
 * lên chat-api-service lúc bấm Lưu (xem features/calendar/calendarAttachmentUpload.ts).
 */
export function PersonalEventFormModal({ opened, onClose, onBack, editEvent }: PersonalEventFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editEvent;

  const [title, setTitle] = useState(() => editEvent?.title ?? '');
  const [eventType, setEventType] = useState<CalendarEventType>(
    () => editEvent?.eventType ?? CalendarEventType.PERSONAL,
  );
  const [notes, setNotes] = useState(() => editEvent?.description ?? '');
  const [fromAt, setFromAt] = useState(() =>
    editEvent?.startAt ? dayjs(editEvent.startAt) : dayjs().add(1, 'hour').minute(0),
  );
  const [toAt, setToAt] = useState(() =>
    editEvent?.endAt ? dayjs(editEvent.endAt) : dayjs().add(2, 'hour').minute(0),
  );
  // File mới chọn ở form này, chưa upload — upload thật lúc bấm Lưu.
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  // Khi sửa lịch: file đã lưu thật trên server từ trước, đọc thẳng từ
  // event.attachments (không còn IndexedDB tạm). Có thể bỏ bớt trước khi lưu.
  const [remoteAttachments, setRemoteAttachments] = useState<CalendarAttachmentDto[]>(
    () => editEvent?.attachments ?? [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const duration = useMemo(() => {
    if (!fromAt.isValid() || !toAt.isValid() || toAt.isBefore(fromAt)) return null;
    const minutes = toAt.diff(fromAt, 'minute');
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return {
      text: `${fromAt.format('DD/MM/YYYY HH:mm')} – ${toAt.format('DD/MM/YYYY HH:mm')}`,
      label: h > 0 ? `${h} giờ${m ? ` ${m} phút` : ''}` : `${m} phút`,
    };
  }, [fromAt, toAt]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      notifications.show({ title: 'Lỗi', message: 'Vui lòng nhập nội dung', color: 'red' });
      return;
    }
    if (!fromAt.isValid() || !toAt.isValid()) {
      notifications.show({ title: 'Lỗi', message: 'Vui lòng nhập thời gian bắt đầu và kết thúc', color: 'red' });
      return;
    }
    if (toAt.isBefore(fromAt) || toAt.isSame(fromAt)) {
      notifications.show({ title: 'Lỗi', message: 'Thời gian kết thúc phải sau thời gian bắt đầu', color: 'red' });
      return;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';

    setIsSubmitting(true);
    try {
      // Upload file mới chọn lên chat-api-service TRƯỚC khi lưu sự kiện — chỉ
      // gửi fileId cho hr-api, không multipart. Nếu upload lỗi, dừng lại,
      // KHÔNG lưu sự kiện thiếu đính kèm rồi báo thành công nhầm.
      let uploadedFileIds: string[] = [];
      if (localFiles.length > 0) {
        try {
          const uploaded = await uploadCalendarAttachments(localFiles);
          uploadedFileIds = uploaded.map((f) => f.fileId);
        } catch (error) {
          const message =
            error instanceof CalendarAttachmentUploadError
              ? error.message
              : 'Tải file đính kèm lên thất bại.';
          notifications.show({ title: 'Không thể đính kèm file', message, color: 'red' });
          setIsSubmitting(false);
          return;
        }
      }
      // Full desired set = file cũ còn giữ lại + file mới vừa upload.
      const attachmentFileIds = [...remoteAttachments.map((a) => a.fileId), ...uploadedFileIds];

      const payload = {
        title: title.trim(),
        // Trước đây dùng `notes.trim() || undefined` — khi sửa sự kiện và xoá
        // hết nội dung Ghi chú, `undefined` bị bỏ qua lúc gửi lên nên giá trị
        // cũ không bao giờ bị xoá (trông như "sửa không lưu"). Gửi thẳng
        // chuỗi rỗng để backend biết là xoá ghi chú.
        description: notes.trim(),
        startAt: fromAt.toISOString(),
        endAt: toAt.toISOString(),
        visibility: CalendarVisibility.PRIVATE,
        eventType,
        isAllDay: false,
        timezone,
        participantIds: [],
        attachmentFileIds,
      };

      if (isEditing && editEvent) {
        await calendarApi.updateEvent(editEvent.id, payload);
        notifications.show({ title: 'Thành công', message: 'Đã cập nhật lịch cá nhân', color: 'green' });
      } else {
        await calendarApi.createEvent(payload);
        notifications.show({ title: 'Thành công', message: 'Đã tạo lịch cá nhân mới', color: 'green' });
      }
      // Xoá cache của cả danh sách lẫn chi tiết sự kiện đang sửa — trước đây
      // chỉ invalidate 'calendar-events' (danh sách), nên khi mở lại đúng sự
      // kiện vừa sửa ở EventDetailModal, nó vẫn đọc cache cũ (staleTime 60s)
      // và hiển thị như chưa lưu, dù dữ liệu trên server đã đúng.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
        ...(isEditing && editEvent
          ? [
              queryClient.invalidateQueries({ queryKey: ['calendar-event', editEvent.id] }),
              queryClient.invalidateQueries({ queryKey: ['calendar-permissions', editEvent.id] }),
            ]
          : []),
      ]);
      handleClose();
    } catch (error) {
      notifications.show({
        title: 'Lỗi',
        message: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lưu lịch',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, notes, fromAt, toAt, eventType, localFiles, remoteAttachments, isEditing, editEvent, queryClient, handleClose]);

  return (
    <Modal opened={opened} onClose={handleClose} title="Thêm lịch cá nhân" size="md">
      <Stack gap="md">
        <TextInput
          label="Nội dung"
          placeholder="VD: Khám sức khỏe định kỳ"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
          maxLength={255}
        />

        <Select
          label="Loại lịch"
          data={PERSONAL_TYPE_OPTIONS}
          value={eventType}
          onChange={(val) => setEventType((val as CalendarEventType) ?? CalendarEventType.PERSONAL)}
        />

        <div>
          <Group justify="space-between" mb={4}>
            <Text size="sm" fw={500}>
              Thời gian <Text component="span" c="red">*</Text>
            </Text>
            <Text size="xs" c="dimmed">
              (định dạng 24h — giờ địa phương)
            </Text>
          </Group>
          <Stack gap="xs">
            <Group grow align="flex-start">
              <DateInput
                label="Từ ngày"
                valueFormat="DD/MM/YYYY"
                value={fromAt.format('YYYY-MM-DD')}
                onChange={(d) => {
                  if (!d) return;
                  setFromAt((prev) => dayjs(`${d}T${prev.format('HH:mm')}`));
                }}
              />
              <TimePicker
                label=" "
                withDropdown
                format="24h"
                value={fromAt.format('HH:mm')}
                onChange={(t) => {
                  if (!t) return;
                  setFromAt((prev) => dayjs(`${prev.format('YYYY-MM-DD')}T${t}`));
                }}
              />
            </Group>
            <Group grow align="flex-start">
              <DateInput
                label="Đến ngày"
                valueFormat="DD/MM/YYYY"
                value={toAt.format('YYYY-MM-DD')}
                onChange={(d) => {
                  if (!d) return;
                  setToAt((prev) => dayjs(`${d}T${prev.format('HH:mm')}`));
                }}
              />
              <TimePicker
                label=" "
                withDropdown
                format="24h"
                value={toAt.format('HH:mm')}
                onChange={(t) => {
                  if (!t) return;
                  setToAt((prev) => dayjs(`${prev.format('YYYY-MM-DD')}T${t}`));
                }}
              />
            </Group>
          </Stack>
          {duration && (
            <Badge mt="xs" variant="light" color="teal">
              {duration.text} · Thời lượng: {duration.label}
            </Badge>
          )}
        </div>

        <Textarea
          label="Ghi chú"
          placeholder="Thêm ghi chú (nếu có)..."
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          minRows={3}
        />

        <CalendarAttachmentDropzone
          localFiles={localFiles}
          onLocalFilesChange={setLocalFiles}
          remoteAttachments={remoteAttachments}
          onRemoveRemote={(fileId) => setRemoteAttachments((prev) => prev.filter((a) => a.fileId !== fileId))}
        />

        <Divider />

        <Group justify="space-between" gap="xs">
          <Button variant="subtle" color="gray" onClick={onBack ?? handleClose} disabled={isSubmitting}>
            {isEditing ? 'Hủy' : 'Quay lại'}
          </Button>
          <Button
            leftSection={isSubmitting ? <Loader size={14} /> : <IconCalendar size={16} />}
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            {isEditing ? 'Lưu thay đổi' : 'Lưu'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
