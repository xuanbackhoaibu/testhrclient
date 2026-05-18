import { useState } from 'react';
import { Alert, Badge, Card, Group, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconAlertTriangle, IconCheck, IconClock } from '@tabler/icons-react';
import dayjs from 'dayjs';

import {
  useAttendanceDailyRecords,
  useAttendanceSyncStatus,
  useManualAttendanceSync,
} from '../../features/attendance/useAttendanceSync';
import { useAuth } from '../../features/auth/useAuth';
import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatDate } from '../../shared/utils/date';
import {
  AttendanceFilterBar,
  type AttendanceFilters,
} from './components/AttendanceFilterBar';
import type { AttendanceDailyFilterParams } from '../../features/attendance/attendanceTypes';

const PAGE_SIZE = 50;

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'green',
  LATE: 'yellow',
  ABSENT: 'red',
  SINGLE_PUNCH: 'orange',
  UNKNOWN: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Đủ công',
  LATE: 'Đi muộn',
  ABSENT: 'Vắng',
  SINGLE_PUNCH: '1 lần',
  UNKNOWN: 'Không xác định',
};

const MAPPING_COLORS: Record<string, string> = {
  MAPPED: 'green',
  AUTO_MAPPED: 'teal',
  UNMAPPED: 'red',
};

const MAPPING_LABELS: Record<string, string> = {
  MAPPED: 'Đã map',
  AUTO_MAPPED: 'Tự động',
  UNMAPPED: 'Chưa map',
};

function buildQueryParams(
  filters: AttendanceFilters & { page: number; pageSize: number },
): AttendanceDailyFilterParams {
  const params: AttendanceDailyFilterParams = {
    page: filters.page,
    pageSize: filters.pageSize,
  };

  if (filters.search) params.search = filters.search;

  // Resolve date: if single date set, use it; if range set, use from/to
  if (filters.date) {
    params.date = filters.date;
  } else {
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  }

  if (filters.status) params.status = filters.status;
  if (filters.mappingStatus) params.mappingStatus = filters.mappingStatus;

  return params;
}

export function AttendancePage() {
  const { can } = useAuth();
  const [filters, setFilters] = useState<AttendanceFilters>({
    search: '',
    date: dayjs().format('YYYY-MM-DD'),
    from: '',
    to: '',
    status: '',
    mappingStatus: '',
  });
  const [page, setPage] = useState(1);

  const queryParams = buildQueryParams({ ...filters, page, pageSize: PAGE_SIZE });
  const { data, isLoading, error, refetch, isFetching } =
    useAttendanceDailyRecords(queryParams);
  const { data: syncStatus } = useAttendanceSyncStatus();
  const manualSync = useManualAttendanceSync();

  const maySync = can(HR_PERMISSIONS.ATTENDANCE_SYNC);

  const dailyJob = syncStatus?.data?.dailyToday;

  const renderSyncBanner = () => {
    if (!dailyJob) return null;

    if (dailyJob.isRunning) {
      return (
        <Alert
          color="blue"
          icon={<IconClock size={15} />}
          py={6}
          px="sm"
        >
          <Text size="xs">Đang đồng bộ dữ liệu từ ZKTeco BioTime...</Text>
        </Alert>
      );
    }

    if (dailyJob.lastError) {
      return (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={15} />}
          py={6}
          px="sm"
        >
          <Text size="xs" lineClamp={1}>{dailyJob.lastError}</Text>
          {dailyJob.lastErrorAt && (
            <Text size="xs" c="dimmed" mt={2}>
              Lúc {dayjs(dailyJob.lastErrorAt).format('HH:mm DD/MM/YYYY')}
            </Text>
          )}
        </Alert>
      );
    }

    if (dailyJob.lastSuccessAt) {
      return (
        <Alert
          color="green"
          icon={<IconCheck size={15} />}
          py={6}
          px="sm"
        >
          <Text size="xs">
            Sync lúc {dayjs(dailyJob.lastSuccessAt).format('HH:mm DD/MM/YYYY')}
            {dailyJob.totalSynced > 0 && ` · ${dailyJob.totalSynced.toLocaleString('vi-VN')} bản ghi`}
          </Text>
        </Alert>
      );
    }

    return null;
  };

  const handleFilterChange = (newFilters: AttendanceFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleSync = () => {
    const syncDate = filters.date || dayjs().format('YYYY-MM-DD');
    manualSync.mutate({
      startDate: syncDate,
      endDate: syncDate,
    });
  };

  const records = data?.data ?? [];
  const pagination = data?.pagination;

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageHeader
        title="Chấm công"
        subtitle="Dữ liệu đồng bộ từ ZKTeco BioTime"
      />

      <Stack gap="xs">
        {renderSyncBanner()}

        <AttendanceFilterBar
          filters={filters}
          onChange={handleFilterChange}
          onSync={handleSync}
          isSyncing={manualSync.isPending}
          maySync={maySync}
        />

        {records.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu chấm công"
            description={
              filters.date || filters.from || filters.to || filters.search
                ? 'Không có bản ghi phù hợp với bộ lọc hiện tại.'
                : 'Dữ liệu chấm công sẽ xuất hiện sau khi sync từ ZKTeco BioTime.'
            }
          />
        ) : (
          <Card withBorder padding={0}>
            <DataTable
              data={records}
              columns={[
                {
                  key: 'workDate',
                  header: 'Ngày',
                  width: 100,
                  render: (record) => formatDate(record.workDate),
                },
                {
                  key: 'empCode',
                  header: 'Mã NV',
                  width: 110,
                  render: (record) => (
                    <Text size="sm" fw={500}>
                      {record.empCode}
                    </Text>
                  ),
                },
                {
                  key: 'fullName',
                  header: 'Họ tên',
                  minWidth: 150,
                  render: (record) => record.fullName ?? '-',
                },
                {
                  key: 'deptName',
                  header: 'Phòng ban',
                  minWidth: 140,
                  render: (record) => record.deptName ?? '-',
                },
                {
                  key: 'firstPunch',
                  header: 'Vào',
                  width: 70,
                  align: 'center',
                  render: (record) =>
                    record.firstPunch ? (
                      <Text size="sm">{record.firstPunch.slice(0, 5)}</Text>
                    ) : (
                      <Text size="sm" c="dimmed">
                        -
                      </Text>
                    ),
                },
                {
                  key: 'lastPunch',
                  header: 'Ra',
                  width: 70,
                  align: 'center',
                  render: (record) =>
                    record.lastPunch ? (
                      <Text size="sm">{record.lastPunch.slice(0, 5)}</Text>
                    ) : (
                      <Text size="sm" c="dimmed">
                        -
                      </Text>
                    ),
                },
                {
                  key: 'totalTime',
                  header: 'Tổng giờ',
                  width: 80,
                  align: 'center',
                  render: (record) => record.totalTime ?? '-',
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  width: 100,
                  align: 'center',
                  render: (record) => (
                    <Badge
                      color={
                        STATUS_COLORS[record.status ?? ''] ?? 'gray'
                      }
                      variant="light"
                      size="sm"
                    >
                      {STATUS_LABELS[record.status ?? ''] ??
                        record.status ??
                        'N/A'}
                    </Badge>
                  ),
                },
                {
                  key: 'mappingStatus',
                  header: 'Mapping',
                  width: 100,
                  align: 'center',
                  render: (record) => (
                    <Badge
                      color={
                        MAPPING_COLORS[record.mappingStatus] ?? 'gray'
                      }
                      variant="light"
                      size="sm"
                    >
                      {MAPPING_LABELS[record.mappingStatus] ??
                        record.mappingStatus}
                    </Badge>
                  ),
                },
              ]}
              rowKey={(record) => record.id}
              meta={pagination ?? undefined}
              loading={isFetching}
              onPageChange={(newPage, newPageSize) => {
                setPage(newPage);
                if (newPageSize !== PAGE_SIZE) {
                  // PageSize doesn't change in this design
                }
              }}
            />
          </Card>
        )}
      </Stack>
    </>
  );
}
