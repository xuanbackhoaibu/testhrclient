import { useMemo, useState } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Avatar,
  Divider,
  Loader,
  Alert,
  Paper,
} from '@mantine/core';
import {
  IconCheck,
  IconX as IconDecline,
  IconLock,
  IconUsers,
  IconClock,
  IconMapPin,
  IconPaperclip,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';

import { useCalendarMutations } from '../../../features/calendar/useCalendarView';
import { useCalendarOwner } from '../../../features/calendar/CalendarContext';
import {
  useCalendarEvent,
  useCalendarEventPermissions,
} from '../../../features/calendar/useCalendarEvents';
import type {
  CalendarEvent,
  CalendarParticipant,
  CalendarPermission,
} from '../../../features/calendar/useCalendarEvents';
import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal';
import { calendarApi } from '../../../features/calendar/calendarApi';
import { CalendarAttachmentItem, CalendarFilePreviewModal, useCalendarFilePreview } from './file-preview';
import type { RemotePreviewItem } from './file-preview';
import styles from './EventDetailModal.module.css';

const EVENT_TYPE_LABELS: Record<string, string> = {
  PERSONAL: 'Lịch cá nhân',
  MEETING: 'Cuộc họp',
  TASK: 'Công việc',
  LEAVE: 'Nghỉ phép',
  DEADLINE: 'Hạn chót',
  REMINDER: 'Nhắc nhở',
  OTHER: 'Khác',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  PERSONAL: 'blue',
  MEETING: 'grape',
  TASK: 'teal',
  LEAVE: 'orange',
  DEADLINE: 'red',
  REMINDER: 'yellow',
  OTHER: 'gray',
};

const VISIBILITY_LABELS: Record<string, string> = {
  PRIVATE: 'Riêng tư',
  BUSY_ONLY: 'Chỉ bận',
  TEAM: 'Nhóm',
  UNIT: 'Đơn vị',
  PUBLIC: 'Công khai',
};

const VISIBILITY_COLORS: Record<string, string> = {
  PRIVATE: 'gray',
  BUSY_ONLY: 'gray',
  TEAM: 'blue',
  UNIT: 'blue',
  PUBLIC: 'green',
};

/** Same dot-pill convention as StatusTag, so calendar badges read like every
 *  other status/type badge in the app instead of a shouty uppercase default. */
function DotBadge({ color, label }: { color: string; label: string }) {
  return (
    <Badge
      color={color}
      variant="light"
      radius="xl"
      size="sm"
      tt="none"
      fw={600}
      leftSection={
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: `var(--mantine-color-${color}-6)`,
            flexShrink: 0,
          }}
        />
      }
    >
      {label}
    </Badge>
  );
}

const RESPONSE_LABELS: Record<string, string> = {
  PENDING: 'Chưa phản hồi',
  ACCEPTED: 'Tham gia',
  DECLINED: 'Không tham gia',
  MAYBE: 'Có thể',
};

const RESPONSE_COLORS: Record<string, string> = {
  PENDING: 'gray',
  ACCEPTED: 'green',
  DECLINED: 'red',
  MAYBE: 'blue',
};

interface EventDetailModalProps {
  eventId: string | null;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
}

export function EventDetailModal({ eventId, onClose, onEdit }: EventDetailModalProps) {
  // Read-only state comes from the shared owner context (NOT a local hook),
  // so "viewing someone else's calendar" is detected correctly here.
  const { isViewingOthers } = useCalendarOwner();
  const { updateMyResponse, deleteEvent } = useCalendarMutations();
  const queryClient = useQueryClient();

  const [responding, setResponding] = useState<
    null | 'ACCEPTED' | 'DECLINED'
  >(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: event, isLoading: eventLoading, error: eventError } = useCalendarEvent(eventId);
  const { data: permissions, isLoading: permLoading } = useCalendarEventPermissions(eventId);

  const isLoading = eventLoading || permLoading;
  const typedPermissions = permissions as CalendarPermission | undefined;

  // File đính kèm THẬT lưu trên server (chat-api-service), đọc thẳng từ
  // event.attachments — thấy được trên MỌI máy/trình duyệt đã đăng nhập,
  // không còn phụ thuộc IndexedDB của từng trình duyệt như trước.
  //
  // `url` trong event.attachments là presigned, TTL ngắn nên có thể đã hết
  // hạn nếu người dùng mở lại sự kiện sau một lúc — bấm vào 1 file sẽ xin
  // lại URL mới nhất qua calendarApi.getAttachmentDownloadUrl() rồi mới mở,
  // thay vì dùng thẳng URL cũ có thể đã hỏng.
  const attachments = useMemo(() => event?.attachments ?? [], [event?.attachments]);

  // Mở lightbox xem trước (ảnh/PDF/Word/Excel/CSV/text…) thay vì window.open
  // thẳng URL — trước đây bấm vào 1 file chỉ mở URL gốc, mà nhiều trình
  // duyệt/định dạng (đặc biệt .docx/.xlsx) sẽ tải file về thay vì hiển thị.
  // Mỗi lần mở/chuyển sang 1 file, `resolveUrl` xin lại URL mới nhất qua
  // calendarApi.getAttachmentDownloadUrl() (URL trong event.attachments là
  // presigned, TTL ngắn, có thể đã hết hạn).
  const filePreview = useCalendarFilePreview(attachments.length);

  const previewItems: RemotePreviewItem[] = useMemo(
    () =>
      attachments.map((att) => ({
        kind: 'remote' as const,
        name: att.filename ?? 'Tệp đính kèm',
        size: att.sizeBytes,
        mimeType: att.mimeType,
        resolveUrl: async () => {
          if (!eventId) return att.url;
          try {
            const fresh = await calendarApi.getAttachmentDownloadUrl(eventId, att.fileId);
            return fresh.url ?? att.url;
          } catch {
            return att.url;
          }
        },
        // Đính kèm lịch không có mốc "ai đăng/lúc nào" riêng theo TỪNG file
        // (khác tin nhắn Zalo) — chỉ dùng chủ sự kiện làm thông tin chia sẻ,
        // KHÔNG dùng createdAt của sự kiện làm giờ hiển thị vì mọi file trong
        // cùng sự kiện sẽ bị hiện chung 1 giờ dù thêm vào lúc nào (gây hiểu
        // nhầm). Muốn có giờ thật theo từng file cần backend bổ sung field
        // uploadedAt riêng trong CalendarAttachmentDto.
        uploaderName: event?.ownerName ?? event?.owner?.fullName ?? null,
        uploaderAvatarUrl: event?.owner?.avatarUrl ?? null,
      })),
    [attachments, eventId, event?.ownerName, event?.owner],
  );

  const isOwner = !!event?.canEdit;
  const canRespond = !!event?.isParticipant && !isOwner;

  const summary = useMemo(() => {
    const ps = event?.participants ?? [];
    return {
      total: ps.length,
      accepted: ps.filter((p) => p.response === 'ACCEPTED').length,
      declined: ps.filter((p) => p.response === 'DECLINED').length,
      pending: ps.filter((p) => p.response === 'PENDING').length,
    };
  }, [event?.participants]);

  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['calendar-event', eventId] }),
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
    ]);
  };

  const handleResponse = async (response: 'ACCEPTED' | 'DECLINED') => {
    if (!eventId) return;
    setResponding(response);
    try {
      await updateMyResponse(eventId, response);
      await refetchAll();
      notifications.show({
        title: 'Đã cập nhật',
        message:
          response === 'ACCEPTED'
            ? 'Bạn đã xác nhận tham gia'
            : 'Bạn đã từ chối tham gia',
        color: response === 'ACCEPTED' ? 'green' : 'orange',
      });
    } catch (e) {
      notifications.show({
        title: 'Lỗi',
        message: e instanceof Error ? e.message : 'Không thể cập nhật phản hồi',
        color: 'red',
      });
    } finally {
      setResponding(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!eventId) return;
    setDeleting(true);
    try {
      await deleteEvent(eventId);
      // Server (hr-api + chat-api) tự dọn file đính kèm khi xoá sự kiện —
      // không còn cần clearStoredAttachments(IndexedDB) như trước.
      notifications.show({ title: 'Đã xóa', message: 'Đã xóa sự kiện', color: 'green' });
      // Close and clear the confirm dialog immediately — the event is already
      // gone from the backend at this point. Refreshing the surrounding
      // month/week view is a background concern and shouldn't hold the
      // modal open while the list refetches.
      setConfirmDeleteOpen(false);
      onClose();
      void refetchAll();
    } catch (e) {
      notifications.show({
        title: 'Lỗi',
        message: e instanceof Error ? e.message : 'Không thể xóa sự kiện',
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    if (event && onEdit) onEdit(event);
  };

  if (!eventId) return null;

  if (eventError) {
    return (
      <Modal opened={!!eventId} onClose={onClose} title="Chi tiết sự kiện" size="lg">
        <Alert color="red" icon={<IconLock size={16} />} title="Không có quyền xem">
          Bạn không có quyền xem chi tiết sự kiện này.
        </Alert>
        <Group justify="flex-end" mt="md">
          <Button onClick={onClose}>Đóng</Button>
        </Group>
      </Modal>
    );
  }

  return (
    <Modal
      opened={!!eventId}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Text fw={600}>{event?.title ?? 'Chi tiết sự kiện'}</Text>
          {canRespond && (
            <Badge color="grape" variant="light" size="sm">
              Được mời
            </Badge>
          )}
          {isViewingOthers && (
            <Badge color="orange" variant="light" size="sm">
              Chỉ xem
            </Badge>
          )}
        </Group>
      }
      size="lg"
    >
      {isLoading ? (
        <div className={styles.loading}>
          <Loader size="sm" />
        </div>
      ) : event ? (
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="xs">
              <DotBadge
                color={EVENT_TYPE_COLORS[event.eventType] ?? 'gray'}
                label={EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
              />
              <DotBadge
                color={VISIBILITY_COLORS[event.visibility] ?? 'gray'}
                label={VISIBILITY_LABELS[event.visibility] ?? event.visibility}
              />
              {event.isAllDay && <DotBadge color="teal" label="Cả ngày" />}
            </Group>
            {(event.owner || event.ownerName) && (
              <Group gap={8} wrap="nowrap">
                <Avatar size="sm" radius="xl" color="blue">
                  {(event.owner?.fullName ?? event.ownerName ?? '?')
                    .charAt(0)
                    .toUpperCase()}
                </Avatar>
                <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {event.owner?.fullName ?? event.ownerName}
                </Text>
              </Group>
            )}
          </Group>

          <Paper p="sm" radius="md" withBorder>
            <Stack gap={8}>
              <Group justify="space-between" wrap="nowrap">
                <Group gap={6} wrap="nowrap">
                  <IconClock size={15} style={{ opacity: 0.6, flexShrink: 0 }} />
                  <Text size="sm" c="dimmed">Bắt đầu</Text>
                </Group>
                <Text size="sm" fw={600} ta="right">
                  {dayjs(event.startAt).format('dddd, DD/MM/YYYY HH:mm')}
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Group gap={6} wrap="nowrap">
                  <IconClock size={15} style={{ opacity: 0.6, flexShrink: 0 }} />
                  <Text size="sm" c="dimmed">Kết thúc</Text>
                </Group>
                <Text size="sm" fw={600} ta="right">
                  {dayjs(event.endAt).format('dddd, DD/MM/YYYY HH:mm')}
                </Text>
              </Group>
              {event.location && (
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={6} wrap="nowrap">
                    <IconMapPin size={15} style={{ opacity: 0.6, flexShrink: 0 }} />
                    <Text size="sm" c="dimmed">Địa điểm</Text>
                  </Group>
                  <Text size="sm" fw={600} ta="right">{event.location}</Text>
                </Group>
              )}
            </Stack>
          </Paper>

          {event.description && (
            <Text size="sm" c="#1f2937">{event.description}</Text>
          )}

          {/* Tệp đính kèm — bấm vào để xem trước (ảnh/PDF/Word/Excel/CSV/text…) */}
          {attachments.length > 0 && (
            <>
              <Divider />
              <Stack gap={8}>
                <Group gap={6}>
                  <IconPaperclip size={16} />
                  <Text size="sm" fw={500}>
                    Tệp đính kèm ({attachments.length})
                  </Text>
                </Group>
                <Group gap={6}>
                  {attachments.map((att, index) => (
                    <CalendarAttachmentItem
                      key={att.fileId}
                      file={{ name: att.filename ?? 'Tệp đính kèm', size: att.sizeBytes, mimeType: att.mimeType }}
                      isSaved
                      onOpen={() => filePreview.open(index)}
                    />
                  ))}
                </Group>
              </Stack>
            </>
          )}

          {/* Participant roster */}
          {event.participants?.length > 0 && typedPermissions?.canViewFullDetails && (
            <>
              <Divider />
              <Group justify="space-between">
                <Group gap={6}>
                  <IconUsers size={16} />
                  <Text size="sm" fw={500}>
                    Người tham gia ({summary.total})
                  </Text>
                </Group>
                {isOwner && (
                  <Group gap={6}>
                    <Badge color="green" variant="light" size="sm">
                      {summary.accepted} tham gia
                    </Badge>
                    <Badge color="red" variant="light" size="sm">
                      {summary.declined} từ chối
                    </Badge>
                    <Badge color="gray" variant="light" size="sm">
                      {summary.pending} chưa phản hồi
                    </Badge>
                  </Group>
                )}
              </Group>
              <Stack gap="xs">
                {event.participants.map((p: CalendarParticipant) => {
                  const name = p.fullName ?? p.employee?.fullName ?? 'N/A';
                  const sub =
                    p.departmentName ??
                    p.employeeCode ??
                    p.employee?.employeeCode ??
                    '';
                  return (
                    <Group key={p.id} gap="sm" wrap="nowrap">
                      <Avatar size="sm" radius="xl" color="gray">
                        {name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                        <Text size="sm" lineClamp={1}>{name}</Text>
                        {sub && (
                          <Text size="xs" c="dimmed" lineClamp={1}>{sub}</Text>
                        )}
                      </Stack>
                      <Badge color={RESPONSE_COLORS[p.response]} variant="light" size="sm">
                        {RESPONSE_LABELS[p.response]}
                      </Badge>
                    </Group>
                  );
                })}
              </Stack>
            </>
          )}

          {/* Participant response area (invitee, not the organizer) */}
          {canRespond && (
            <>
              <Divider />
              <Paper p="sm" radius="md" withBorder>
                <Text size="sm" fw={500} mb="xs">
                  Bạn được mời tham gia lịch họp này
                </Text>
                <Group gap="xs">
                  <Button
                    size="sm"
                    color="green"
                    leftSection={<IconCheck size={16} />}
                    onClick={() => handleResponse('ACCEPTED')}
                    loading={responding === 'ACCEPTED'}
                    disabled={responding !== null}
                  >
                    Tham gia
                  </Button>
                  <Button
                    size="sm"
                    color="red"
                    variant="light"
                    leftSection={<IconDecline size={16} />}
                    onClick={() => handleResponse('DECLINED')}
                    loading={responding === 'DECLINED'}
                    disabled={responding !== null}
                  >
                    Không tham gia
                  </Button>
                </Group>
              </Paper>
            </>
          )}

          {/* Owner actions */}
          {isOwner && (
            <>
              <Divider />
              <Group justify="flex-end" gap="xs">
                {typedPermissions?.canDelete && (
                  <Button
                    color="red"
                    variant="light"
                    size="sm"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    Xóa
                  </Button>
                )}
                {typedPermissions?.canEdit && onEdit ? (
                  <Button variant="filled" size="sm" onClick={handleEdit}>
                    Sửa
                  </Button>
                ) : null}
              </Group>
            </>
          )}
        </Stack>
      ) : (
        <Text c="dimmed" ta="center">Không tìm thấy sự kiện</Text>
      )}

      <ConfirmActionModal
        opened={confirmDeleteOpen}
        title="Xóa sự kiện"
        message={`Bạn có chắc muốn xóa "${event?.title ?? 'sự kiện này'}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        color="red"
        loading={deleting}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDeleteConfirmed()}
      />

      <CalendarFilePreviewModal
        items={previewItems}
        currentIndex={filePreview.currentIndex}
        isOpen={filePreview.isOpen}
        onClose={filePreview.close}
        onPrev={filePreview.prev}
        onNext={filePreview.next}
      />
    </Modal>
  );
}
