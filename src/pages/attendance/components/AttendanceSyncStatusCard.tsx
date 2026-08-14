import { Alert, Badge, Card, Grid, Group, Progress, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconAlertTriangle,
  IconClock,
  IconDatabase,
  IconDeviceFloppy,
  IconRefresh,
  IconUsers,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { AttendanceSyncStatus } from '../../../features/attendance/attendanceTypes';

interface AttendanceSyncStatusCardProps {
  status: AttendanceSyncStatus | undefined;
  isLoading: boolean;
  onViewSyncHistory: () => void;
  mayViewSyncLog: boolean;
}

interface SyncJobCardProps {
  title: string;
  icon: typeof IconRefresh;
  job: {
    isRunning: boolean;
    lastSuccessAt: string | null;
    lastError: string | null;
    lastErrorAt: string | null;
    totalSynced: number;
    latestRun: {
      status: string | null;
      totalFetched: number;
      totalUpserted: number;
      errorMessage: string | null;
    } | null;
  } | undefined;
}

function SyncJobCard({ title, icon: Icon, job }: SyncJobCardProps) {
  if (!job) {
    return (
      <Card withBorder padding="sm" radius="md" bg="gray.0">
        <Group gap="xs" mb={4}>
          <Icon size={14} />
          <Text size="xs" fw={600}>{title}</Text>
        </Group>
        <Text size="xs" c="dimmed">Chưa có dữ liệu</Text>
      </Card>
    );
  }

  if (job.isRunning) {
    return (
      <Card withBorder padding="sm" radius="md" bg="blue.0" style={{ borderColor: 'var(--mantine-color-blue-3)' }}>
        <Group gap="xs" mb={4}>
          <Icon size={14} />
          <Text size="xs" fw={600} c="blue.7">{title}</Text>
          <Badge size="xs" color="blue" variant="light">Đang chạy</Badge>
        </Group>
        <Progress value={100} animated color="blue" size="xs" mb={4} />
        <Text size="xs" c="blue.6">Đang đồng bộ dữ liệu...</Text>
      </Card>
    );
  }

  if (job.lastError) {
    return (
      <Card withBorder padding="sm" radius="md" bg="red.0" style={{ borderColor: 'var(--mantine-color-red-3)' }}>
        <Group gap="xs" mb={4}>
          <Icon size={14} />
          <Text size="xs" fw={600} c="red.7">{title}</Text>
          <Badge size="xs" color="red" variant="light">Lỗi</Badge>
        </Group>
        <Text size="xs" c="red.6" lineClamp={2}>{job.lastError}</Text>
        {job.lastErrorAt && (
          <Text size="xs" c="dimmed" mt={2}>
            Lúc {dayjs(job.lastErrorAt).format('DD/MM/YYYY HH:mm')}
          </Text>
        )}
      </Card>
    );
  }

  if (job.lastSuccessAt) {
    return (
      <Card withBorder padding="sm" radius="md" bg="green.0" style={{ borderColor: 'var(--mantine-color-green-3)' }}>
        <Group gap="xs" mb={4}>
          <Icon size={14} />
          <Text size="xs" fw={600} c="green.7">{title}</Text>
          <Badge size="xs" color="green" variant="light">Thành công</Badge>
        </Group>
        <Text size="xs" c="green.6">
          {dayjs(job.lastSuccessAt).format('DD/MM/YYYY HH:mm')} ·{' '}
          {job.totalSynced.toLocaleString('vi-VN')} bản ghi
        </Text>
      </Card>
    );
  }

  return (
    <Card withBorder padding="sm" radius="md" bg="gray.0">
      <Group gap="xs" mb={4}>
        <Icon size={14} />
        <Text size="xs" fw={600}>{title}</Text>
      </Group>
      <Text size="xs" c="dimmed">Chưa chạy lần nào</Text>
    </Card>
  );
}

export function AttendanceSyncStatusCard({
  status,
  isLoading,
  onViewSyncHistory,
  mayViewSyncLog,
}: AttendanceSyncStatusCardProps) {
  if (isLoading) {
    return (
      <Card withBorder padding="md" radius="md">
        <Stack gap="xs">
          <Text size="sm" fw={600}>Trạng thái đồng bộ</Text>
          <Progress value={40} animated />
          <Text size="xs" c="dimmed">Đang tải...</Text>
        </Stack>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const hasNoData = !status.hasAttendanceData;

  return (
    <>
      {/* Warning banner if no data */}
      {hasNoData && (
        <Alert
          color="yellow"
          icon={<IconAlertTriangle size={16} />}
          py={8}
          mb="xs"
        >
          <Group gap="xs" wrap="nowrap">
            <Text size="sm">
              Chưa có dữ liệu chấm công được đồng bộ. Hãy chạy đồng bộ hoặc kiểm tra cấu hình BioTime.
            </Text>
          </Group>
        </Alert>
      )}

      {/* Stats row */}
      <Card withBorder padding="sm" radius="md" mb="xs">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs">
            <ThemeIcon size="sm" variant="light" color="blue" radius="xl">
              <IconDatabase size={12} />
            </ThemeIcon>
            <Text size="xs">
              <Text span fw={600}>{status.attendanceTotal.toLocaleString('vi-VN')}</Text> bản ghi chấm công
            </Text>
          </Group>
          <Group gap="xs">
            <ThemeIcon size="sm" variant="light" color="teal" radius="xl">
              <IconUsers size={12} />
            </ThemeIcon>
            <Text size="xs">
              <Text span fw={600}>{status.departmentTotal}</Text> phòng ban BioTime
            </Text>
          </Group>
          {mayViewSyncLog && (
            <Text
              size="xs"
              c="blue"
              style={{ cursor: 'pointer' }}
              onClick={onViewSyncHistory}
            >
              Xem lịch sử đồng bộ →
            </Text>
          )}
        </Group>
      </Card>

      {/* Sync job cards */}
      <Grid gap="xs">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <SyncJobCard
            title="Đồng bộ hôm nay"
            icon={IconRefresh}
            job={status.dailyToday}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <SyncJobCard
            title="Đồng bộ đêm (7 ngày)"
            icon={IconClock}
            job={status.nightly7Days}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <SyncJobCard
            title="Đồng bộ thủ công"
            icon={IconDeviceFloppy}
            job={status.manualSync}
          />
        </Grid.Col>
      </Grid>
    </>
  );
}
