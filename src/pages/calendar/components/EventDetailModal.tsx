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
import styles from './EventDetailModal.module.css';

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

  const { data: event, isLoading: eventLoading, error: eventError } = useCalendarEvent(eventId);
  const { data: permissions, isLoading: permLoading } = useCalendarEventPermissions(eventId);

  const isLoading = eventLoading || permLoading;
  const typedPermissions = permissions as CalendarPermission | undefined;

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

  const handleDelete = async () => {
    if (!eventId || !window.confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
    try {
      await deleteEvent(eventId);
      await refetchAll();
      notifications.show({ title: 'Đã xóa', message: 'Đã xóa sự kiện', color: 'green' });
      onClose();
    } catch (e) {
      notifications.show({
        title: 'Lỗi',
        message: e instanceof Error ? e.message : 'Không thể xóa sự kiện',
        color: 'red',
      });
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
          <Group gap="xs">
            <Badge color="blue" variant="light">
              {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
            </Badge>
            <Badge color="gray" variant="outline">
              {VISIBILITY_LABELS[event.visibility] ?? event.visibility}
            </Badge>
          </Group>

          {(event.owner || event.ownerName) && (
            <Group gap="sm">
              <Avatar size="sm" radius="xl" color="blue">
                {(event.owner?.fullName ?? event.ownerName ?? '?')
                  .charAt(0)
                  .toUpperCase()}
              </Avatar>
              <Text size="sm">
                Người tổ chức:{' '}
                <strong>{event.owner?.fullName ?? event.ownerName}</strong>
              </Text>
            </Group>
          )}

          <Divider />

          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Bắt đầu</Text>
              <Text size="sm">{dayjs(event.startAt).format('dddd, DD/MM/YYYY HH:mm')}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Kết thúc</Text>
              <Text size="sm">{dayjs(event.endAt).format('dddd, DD/MM/YYYY HH:mm')}</Text>
            </Group>
            {event.isAllDay && (
              <Badge color="teal" variant="light">Cả ngày</Badge>
            )}
          </Stack>

          {event.location && (
            <>
              <Divider />
              <Group gap="sm">
                <Text size="sm" c="dimmed">Địa điểm</Text>
                <Text size="sm">{event.location}</Text>
              </Group>
            </>
          )}

          {event.description && (
            <>
              <Divider />
              <Text size="sm">{event.description}</Text>
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
                  <Button color="red" variant="light" size="sm" onClick={handleDelete}>
                    Xóa
                  </Button>
                )}
                <Button variant="filled" size="sm" onClick={handleEdit}>
                  Sửa
                </Button>
              </Group>
            </>
          )}
        </Stack>
      ) : (
        <Text c="dimmed" ta="center">Không tìm thấy sự kiện</Text>
      )}
    </Modal>
  );
}
