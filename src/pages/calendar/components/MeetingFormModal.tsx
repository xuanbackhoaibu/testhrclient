import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Stack,
  Group,
  TextInput,
  Textarea,
  Button,
  Loader,
  Divider,
  Text,
  Avatar,
  Badge,
  SegmentedControl,
} from '@mantine/core';
import { DateInput, TimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconCalendar } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { calendarApi, CalendarVisibility, CalendarEventType, type CalendarEvent } from '../../../features/calendar/calendarApi';
import { useAuth } from '../../../features/auth/useAuth';
import { ParticipantPicker, type SelectedParticipant } from './ParticipantPicker';
import { CalendarAttachmentDropzone } from './CalendarAttachmentDropzone';
import {
  uploadCalendarAttachments,
  CalendarAttachmentUploadError,
} from '../../../features/calendar/calendarAttachmentUpload';
import type { CalendarAttachmentDto } from '../../../features/calendar/calendarSharedTypes';

function participantsFromEvent(event: CalendarEvent | null | undefined): SelectedParticipant[] {
  if (!event?.participants?.length) return [];
  return event.participants.map((p) => ({
    id: p.employeeId,
    fullName: p.fullName ?? p.employee?.fullName ?? p.employeeCode ?? p.employeeId,
    employeeCode: p.employeeCode ?? p.employee?.employeeCode ?? '',
    departmentName: p.departmentName,
  }));
}

interface MeetingFormModalProps {
  opened: boolean;
  /** Đóng hẳn modal (Hủy khi sửa, hoặc bấm X). */
  onClose: () => void;
  /** Quay lại modal chọn loại lịch — chỉ có khi đang tạo mới (không có khi sửa). */
  onBack?: () => void;
  editEvent?: CalendarEvent | null;
}

/**
 * "Thêm lịch họp" — nhánh Lịch họp của luồng Thêm lịch 2 bước, tham khảo
 * MeetingFormModal.tsx của chat-web-client. Khác với form chung cũ
 * (CreateEventModal), form này cố định eventType=MEETING và có thêm:
 *  - Chủ trì (mặc định là người tạo, có thể đổi — tái dùng ParticipantPicker
 *    với max=1).
 *  - Hình thức họp (Trực tiếp/Trực tuyến) — chỉ đổi nhãn/placeholder của ô
 *    "Địa điểm họp", vì backend hiện chưa có cột riêng cho hình thức họp.
 *  - Đính kèm file — upload thật lên chat-api-service lúc bấm Lưu, gửi
 *    `fileId` cho hr-api qua `attachmentFileIds` (xem
 *    features/calendar/calendarAttachmentUpload.ts và CalendarAttachmentDropzone).
 *  - Quyền xem chỉ còn Riêng tư/Công khai (segmented control) theo đúng mẫu,
 *    thay vì dropdown 5 lựa chọn của form chung cũ.
 */
export function MeetingFormModal({ opened, onClose, onBack, editEvent }: MeetingFormModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = !!editEvent;
  const currentEmployeeId = user?.employeeId ?? user?.employee?.id ?? null;
  const currentUserAsParticipant: SelectedParticipant | null = currentEmployeeId
    ? {
        id: currentEmployeeId,
        fullName: user?.fullName ?? user?.employee?.fullName ?? 'Bạn',
        employeeCode: user?.employee?.employeeCode ?? '',
      }
    : null;

  const [title, setTitle] = useState(() => editEvent?.title ?? '');
  const [notes, setNotes] = useState(() => editEvent?.description ?? '');
  const [startAt, setStartAt] = useState(() =>
    editEvent?.startAt ? dayjs(editEvent.startAt) : dayjs().add(1, 'hour').minute(0),
  );
  const [endAt, setEndAt] = useState(() =>
    editEvent?.endAt ? dayjs(editEvent.endAt) : dayjs().add(2, 'hour').minute(0),
  );
  const [meetingMode, setMeetingMode] = useState<'OFFLINE' | 'ONLINE'>('OFFLINE');
  const [visibility, setVisibility] = useState<CalendarVisibility>(
    () => (editEvent?.visibility === CalendarVisibility.PUBLIC ? CalendarVisibility.PUBLIC : CalendarVisibility.PRIVATE),
  );
  const [location, setLocation] = useState(() => editEvent?.location ?? '');
  const [host, setHost] = useState<SelectedParticipant[]>(() =>
    currentUserAsParticipant ? [currentUserAsParticipant] : [],
  );
  const [participants, setParticipants] = useState<SelectedParticipant[]>(() =>
    participantsFromEvent(editEvent),
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
    if (!startAt.isValid() || !endAt.isValid() || endAt.isBefore(startAt)) return null;
    const minutes = endAt.diff(startAt, 'minute');
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return { text: `${startAt.format('HH:mm')} – ${endAt.format('HH:mm')}`, label: h > 0 ? `${h} giờ${m ? ` ${m} phút` : ''}` : `${m} phút` };
  }, [startAt, endAt]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      notifications.show({ title: 'Lỗi', message: 'Vui lòng nhập nội dung cuộc họp', color: 'red' });
      return;
    }
    if (!startAt.isValid() || !endAt.isValid()) {
      notifications.show({ title: 'Lỗi', message: 'Vui lòng nhập thời gian bắt đầu và kết thúc', color: 'red' });
      return;
    }
    if (endAt.isBefore(startAt) || endAt.isSame(startAt)) {
      notifications.show({ title: 'Lỗi', message: 'Thời gian kết thúc phải sau thời gian bắt đầu', color: 'red' });
      return;
    }

    // Backend chưa có cột "Chủ trì" riêng — nếu người chủ trì khác người tạo,
    // ghi rõ vào đầu Ghi chú để không mất thông tin, và thêm họ vào danh sách
    // tham gia (host phải là 1 participant để nhận thông báo cuộc họp).
    const hostPerson = host[0] ?? null;
    const isHostDifferentFromCreator = hostPerson && hostPerson.id !== currentEmployeeId;
    const description = [
      isHostDifferentFromCreator ? `Chủ trì: ${hostPerson!.fullName}` : null,
      notes.trim() || null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const participantIds = Array.from(
      new Set([
        ...participants.map((p) => p.id),
        ...(isHostDifferentFromCreator ? [hostPerson!.id] : []),
      ]),
    );

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
        // Trước đây `description: description || undefined` / `location:
        // location.trim() || undefined` — khi sửa cuộc họp và xoá hết Ghi chú
        // hoặc Địa điểm, undefined bị bỏ qua lúc gửi lên nên giá trị cũ không
        // bao giờ bị xoá (trông như "sửa không lưu"). Gửi thẳng chuỗi rỗng.
        description,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        visibility,
        eventType: CalendarEventType.MEETING,
        location: location.trim(),
        isAllDay: false,
        timezone,
        participantIds,
        attachmentFileIds,
      };

      if (isEditing && editEvent) {
        await calendarApi.updateEvent(editEvent.id, payload);
        notifications.show({ title: 'Thành công', message: 'Đã cập nhật lịch họp', color: 'green' });
      } else {
        await calendarApi.createEvent(payload);
        notifications.show({
          title: 'Thành công',
          message: participantIds.length > 0 ? 'Đã tạo lịch họp và gửi thông báo cho người tham gia' : 'Đã tạo lịch họp',
          color: 'green',
        });
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
        message: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lưu lịch họp',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    title,
    notes,
    startAt,
    endAt,
    visibility,
    location,
    host,
    participants,
    localFiles,
    remoteAttachments,
    currentEmployeeId,
    isEditing,
    editEvent,
    queryClient,
    handleClose,
  ]);

  return (
    <Modal opened={opened} onClose={handleClose} title="Thêm lịch họp" size="lg">
      <Stack gap="md">
        <TextInput
          label="Nội dung cuộc họp"
          placeholder="VD: Họp tổng kết tháng 5"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
          maxLength={255}
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
          <Group grow>
            <DateInput
              label="Ngày họp"
              valueFormat="DD/MM/YYYY"
              value={startAt.format('YYYY-MM-DD')}
              onChange={(d) => {
                if (!d) return;
                setStartAt((prev) => dayjs(`${d}T${prev.format('HH:mm')}`));
                setEndAt((prev) => dayjs(`${d}T${prev.format('HH:mm')}`));
              }}
            />
          </Group>
          <Group grow mt="xs">
            <TimePicker
              label="Bắt đầu"
              withDropdown
              format="24h"
              value={startAt.format('HH:mm')}
              onChange={(t) => {
                if (!t) return;
                setStartAt((prev) => dayjs(`${prev.format('YYYY-MM-DD')}T${t}`));
              }}
            />
            <TimePicker
              label="Kết thúc"
              withDropdown
              format="24h"
              value={endAt.format('HH:mm')}
              onChange={(t) => {
                if (!t) return;
                setEndAt((prev) => dayjs(`${prev.format('YYYY-MM-DD')}T${t}`));
              }}
            />
          </Group>
          {duration && (
            <Badge mt="xs" variant="light" color="teal">
              {duration.text} · Thời lượng: {duration.label}
            </Badge>
          )}
        </div>

        <div>
          <Text size="sm" fw={500} mb={4}>
            Người tạo
          </Text>
          <Group gap="sm" p="xs" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-sm)' }}>
            <Avatar size="sm" radius="xl" color="blue">
              {(user?.fullName ?? 'B').charAt(0).toUpperCase()}
            </Avatar>
            <Text size="sm">{user?.fullName ?? 'Bạn'}</Text>
            <Badge size="xs" variant="light">
              Bạn
            </Badge>
          </Group>
        </div>

        <ParticipantPicker
          value={host}
          onChange={setHost}
          max={1}
          label="Chủ trì"
          placeholder="Họ và tên người chủ trì..."
        />

        <ParticipantPicker
          value={participants}
          onChange={setParticipants}
          excludeEmployeeId={currentEmployeeId}
          excludeEmployeeIds={host.map((h) => h.id)}
          label="Người tham gia"
        />

        <div>
          <Text size="sm" fw={500} mb={4}>
            Hình thức họp
          </Text>
          <SegmentedControl
            fullWidth
            value={meetingMode}
            onChange={(v) => setMeetingMode(v as 'OFFLINE' | 'ONLINE')}
            data={[
              { label: 'Trực tiếp (Offline)', value: 'OFFLINE' },
              { label: 'Trực tuyến (Online)', value: 'ONLINE' },
            ]}
          />
        </div>

        <div>
          <Text size="sm" fw={500} mb={4}>
            Quyền xem
          </Text>
          <SegmentedControl
            fullWidth
            value={visibility}
            onChange={(v) => setVisibility(v as CalendarVisibility)}
            data={[
              { label: 'Riêng tư', value: CalendarVisibility.PRIVATE },
              { label: 'Công khai', value: CalendarVisibility.PUBLIC },
            ]}
          />
          <Text size="xs" c="dimmed" mt={4}>
            Riêng tư: người khác xem lịch của bạn chỉ thấy ô "Bận", không thấy nội dung.
          </Text>
        </div>

        <TextInput
          label="Địa điểm họp"
          placeholder={meetingMode === 'ONLINE' ? 'Nhập link họp trực tuyến...' : 'Nhập địa điểm hoặc chọn từ danh sách đã lưu'}
          value={location}
          onChange={(e) => setLocation(e.currentTarget.value)}
        />

        <Textarea
          label="Ghi chú"
          placeholder="Thêm ghi chú cho cuộc họp (nếu có)..."
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
            {isEditing ? 'Lưu thay đổi' : 'Lưu & Gửi'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
