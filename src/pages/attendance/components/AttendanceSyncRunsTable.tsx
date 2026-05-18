import { useState } from 'react';
import {
  Badge,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import dayjs from 'dayjs';
import { useAttendanceSyncRuns } from '../../features/attendance/useAttendanceSync';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';

interface SyncRun {
  id: string;
  jobName: string;
  status: string;
  startDate: string;
  endDate: string;
  totalFetched: number;
  totalUpserted: number;
  mappedCount: number;
  unmappedCount: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  triggeredBy: string | null;
  metadata?: Record<string, unknown>;
}

const STATUS_COLORS: Record<string, string> = {
  RUNNING: 'blue',
  SUCCESS: 'green',
  FAILED: 'red',
  SKIPPED: 'yellow',
  PARTIAL: 'orange',
};

const STATUS_LABELS: Record<string, string> = {
  RUNNING: 'Đang chạy',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  SKIPPED: 'Bỏ qua',
  PARTIAL: 'Một phần',
};

const JOB_LABELS: Record<string, string> = {
  daily_today: 'Đồng bộ hôm nay',
  nightly_7days: 'Đồng bộ đêm',
  manual_sync: 'Thủ công',
};

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return '...';
  const ms = dayjs(finishedAt).diff(dayjs(startedAt));
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function AttendanceSyncRunsTable() {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useAttendanceSyncRuns({ page, pageSize: PAGE_SIZE });
  const runs = (data?.data ?? []) as SyncRun[];
  const pagination = data?.pagination;

  return (
    <Stack gap="sm">
      {runs.length === 0 && !isLoading ? (
        <EmptyState
          title="Chưa có lịch sử đồng bộ"
          description="Lịch sử đồng bộ sẽ xuất hiện sau khi chạy sync."
        />
      ) : (
        <DataTable
          data={runs}
          columns={[
            {
              key: 'startedAt',
              header: 'Thời gian',
              width: 160,
              render: (run) => (
                <Stack gap={0}>
                  <Text size="sm">{dayjs(run.startedAt).format('HH:mm DD/MM/YYYY')}</Text>
                  <Text size="xs" c="dimmed">{formatDuration(run.startedAt, run.finishedAt)}</Text>
                </Stack>
              ),
            },
            {
              key: 'jobName',
              header: 'Loại',
              width: 140,
              render: (run) => (
                <Text size="sm">{JOB_LABELS[run.jobName] ?? run.jobName}</Text>
              ),
            },
            {
              key: 'status',
              header: 'Trạng thái',
              width: 100,
              align: 'center',
              render: (run) => (
                <Badge color={STATUS_COLORS[run.status] ?? 'gray'} variant="light" size="sm">
                  {STATUS_LABELS[run.status] ?? run.status}
                </Badge>
              ),
            },
            {
              key: 'range',
              header: 'Khoảng ngày',
              width: 140,
              render: (run) => (
                <Text size="xs">{run.startDate} → {run.endDate}</Text>
              ),
            },
            {
              key: 'stats',
              header: 'Kết quả',
              width: 140,
              render: (run) => (
                <Stack gap={2}>
                  <Group gap={4}>
                    <Text size="xs" c="dimmed">Fetch:</Text>
                    <Text size="xs" fw={500}>{run.totalFetched.toLocaleString('vi-VN')}</Text>
                  </Group>
                  <Group gap={4}>
                    <Text size="xs" c="dimmed">Upsert:</Text>
                    <Text size="xs" fw={500}>{run.totalUpserted.toLocaleString('vi-VN')}</Text>
                  </Group>
                </Stack>
              ),
            },
            {
              key: 'mapping',
              header: 'Mapping',
              width: 100,
              render: (run) => (
                <Stack gap={2}>
                  <Group gap={4}>
                    <Text size="xs" c="green.6">✓</Text>
                    <Text size="xs">{run.mappedCount.toLocaleString('vi-VN')}</Text>
                  </Group>
                  <Group gap={4}>
                    <Text size="xs" c="red.6">✗</Text>
                    <Text size="xs">{run.unmappedCount.toLocaleString('vi-VN')}</Text>
                  </Group>
                </Stack>
              ),
            },
            {
              key: 'error',
              header: 'Lỗi',
              minWidth: 200,
              render: (run) => {
                if (run.status === 'FAILED' && run.errorMessage) {
                  return (
                    <Text size="xs" c="red" lineClamp={2}>
                      {run.errorMessage}
                    </Text>
                  );
                }
                return <Text size="xs" c="dimmed">—</Text>;
              },
            },
          ]}
          rowKey={(run) => run.id}
          meta={pagination}
          loading={isLoading}
          onPageChange={(newPage) => setPage(newPage)}
        />
      )}
    </Stack>
  );
}
