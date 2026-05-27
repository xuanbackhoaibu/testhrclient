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
} from '@mantine/core';
import {
  IconCheck,
  IconX as IconDecline,
  IconMinus,
  IconLock,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useCalendarMutations, useSelectedOwner } from '../../../features/calendar/useCalendarView';
import { useCalendarEvent, useCalendarEventPermissions } from '../../../features/calendar/useCalendarEvents';
import { useQueryClient } from '@tanstack/react-query';
import styles from './EventDetailModal.module.css';

interface CalendarPermission {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewFullDetails: boolean;
  reason?: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  MEETING: 'Cuộc họp',
  TASK: 'Công việc',
  LEAVE: 'Nghỉ phép',
  DEADLINE: 'Hạn chót',
  REMINDER: 'Nhắc nhở',
  OTHER: 'Khác',
};

const VISIBILITY_LABELS: Record<string, string> = {
  PRIVATE: 'Riêng tư',
  BUSY_ONLY: 'Chỉ bận',
  TEAM: 'Nhóm',
  UNIT: 'Đơn vị',
  PUBLIC: 'Công khai',
};

const RESPONSE_LABELS: Record<string, string> = {
  PENDING: 'Chờ phản hồi',
  ACCEPTED: 'Đã chấp nhận',
  DECLINED: 'Đã từ chối',
  MAYBE: 'Có thể',
};

const RESPONSE_COLORS: Record<string, string> = {
  PENDING: 'yellow',
  ACCEPTED: 'green',
  DECLINED: 'red',
  MAYBE: 'blue',
};

interface EventDetailModalProps {
  eventId: string | null;
  onClose: () => void;
  onEdit?: (event: any) => void;
}

export function EventDetailModal({ eventId, onClose, onEdit }: EventDetailModalProps) {
  const { selectedOwner } = useSelectedOwner();
  const { updateMyResponse, deleteEvent } = useCalendarMutations();
  const queryClient = useQueryClient();

  const isViewingOthers = selectedOwner !== null;

  const { data: event, isLoading: eventLoading, error: eventError } = useCalendarEvent(eventId);
  const { data: permissions, isLoading: permLoading } = useCalendarEventPermissions(eventId);

  const isLoading = eventLoading || permLoading;

  const typedPermissions = permissions as CalendarPermission | undefined;

  const handleResponse = async (response: 'ACCEPTED' | 'DECLINED' | 'MAYBE') => {
    if (!eventId) return;
    await updateMyResponse(eventId, response);
    await queryClient.invalidateQueries({ queryKey: ['calendar-event', eventId] });
  };

  const handleDelete = async () => {
    if (!eventId || !window.confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
    await deleteEvent(eventId);
    await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    onClose();
  };

  const handleEdit = () => {
    if (event && onEdit) {
      onEdit(event);
    }
  };

  if (!eventId) return null;

  // Show permission denied state
  if (eventError) {
    return (
      <Modal
        opened={!!eventId}
        onClose={onClose}
        title="Chi tiết sự kiện"
        size="lg"
      >
        <Alert
          color="red"
          icon={<IconLock size={16} />}
          title="Không có quyền xem"
        >
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
          {/* Event Type & Visibility */}
          <Group gap="xs">
            <Badge color="blue" variant="light">
              {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
            </Badge>
            <Badge color="gray" variant="outline">
              {VISIBILITY_LABELS[event.visibility] ?? event.visibility}
            </Badge>
          </Group>

          {/* Owner Info */}
          {event.owner && (
            <Group gap="sm">
              <Avatar size="sm" radius="xl" color="blue">
                {event.owner.fullName?.charAt(0).toUpperCase()}
              </Avatar>
              <Text size="sm">
                Người tạo: <strong>{event.owner.fullName}</strong>
              </Text>
            </Group>
          )}

          <Divider />

          {/* Time Info */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Bắt đầu</Text>
              <Text size="sm">
                {dayjs(event.startAt).format('dddd, DD/MM/YYYY HH:mm')}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Kết thúc</Text>
              <Text size="sm">
                {dayjs(event.endAt).format('dddd, DD/MM/YYYY HH:mm')}
              </Text>
            </Group>
            {event.isAllDay && (
              <Badge color="teal" variant="light">
                Cả ngày
              </Badge>
            )}
          </Stack>

          {/* Location */}
          {event.location && (
            <>
              <Divider />
              <Group gap="sm">
                <Text size="sm" c="dimmed">Địa điểm</Text>
                <Text size="sm">{event.location}</Text>
              </Group>
            </>
          )}

          {/* Description */}
          {event.description && (
            <>
              <Divider />
              <Text size="sm">{event.description}</Text>
            </>
          )}

          {/* Participants */}
          {event.participants?.length > 0 && typedPermissions?.canViewFullDetails && (
            <>
              <Divider />
              <Stack gap="xs">
                <Text size="sm" fw={500}>Người tham gia</Text>
                {event.participants.map((p: any) => (
                  <Group key={p.id} gap="sm">
                    <Avatar size="sm" radius="xl" color="gray">
                      {p.employee?.fullName?.charAt(0).toUpperCase() ?? '?'}
                    </Avatar>
                    <Text size="sm">{p.employee?.fullName ?? 'N/A'}</Text>
                    <Badge color={RESPONSE_COLORS[p.response]} variant="light" size="xs">
                      {RESPONSE_LABELS[p.response]}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            </>
          )}

          {/* Participant Response Actions */}
          {event.isParticipant && !isViewingOthers && (
            <>
              <Divider />
              <Text size="sm" fw={500}>Phản hồi của bạn</Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  color="green"
                  leftSection={<IconCheck size={14} />}
                  onClick={() => handleResponse('ACCEPTED')}
                >
                  Chấp nhận
                </Button>
                <Button
                  size="xs"
                  color="yellow"
                  variant="light"
                  leftSection={<IconMinus size={14} />}
                  onClick={() => handleResponse('MAYBE')}
                >
                  Có thể
                </Button>
                <Button
                  size="xs"
                  color="red"
                  variant="light"
                  leftSection={<IconDecline size={14} />}
                  onClick={() => handleResponse('DECLINED')}
                >
                  Từ chối
                </Button>
              </Group>
            </>
          )}

          {/* Actions */}
          {!isViewingOthers && typedPermissions?.canEdit && (
            <>
              <Divider />
              <Group justify="flex-end" gap="xs">
                {typedPermissions?.canDelete && (
                  <Button
                    color="red"
                    variant="light"
                    size="sm"
                    onClick={handleDelete}
                  >
                    Xóa
                  </Button>
                )}
                <Button
                  variant="filled"
                  size="sm"
                  onClick={handleEdit}
                >
                  Sửa
                </Button>
              </Group>
            </>
          )}

          {/* Read-only indicator when viewing others */}
          {isViewingOthers && (
            <>
              <Divider />
              <Alert color="gray" variant="light">
                Bạn đang xem lịch của người khác và chỉ có quyền xem.
              </Alert>
            </>
          )}
        </Stack>
      ) : (
        <Text c="dimmed" ta="center">Không tìm thấy sự kiện</Text>
      )}
    </Modal>
  );
}
