import { useState } from 'react';
import { Badge, Button, Card, Group, Select, Stack, Text, TextInput, Title, Alert } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconRefresh, IconAlertTriangle, IconClock, IconCheck, IconX } from '@tabler/icons-react';
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

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'green',
  LATE: 'yellow',
  ABSENT: 'red',
  SINGLE_PUNCH: 'orange',
  UNKNOWN: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Có mặt',
  LATE: 'Đi muộn',
  ABSENT: 'Vắng mặt',
  SINGLE_PUNCH: '1 lần chấm',
  UNKNOWN: 'Chưa xác định',
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

export function AttendancePage() {
  const { can } = useAuth();
  const [filters, setFilters] = useState<{
    date?: string;
    from?: string;
    to?: string;
    empCode?: string;
    deptName?: string;
    status?: string;
    mappingStatus?: string;
    page: number;
    pageSize: number;
  }>({
    page: 1,
    pageSize: 50,
  });

  const { data, isLoading, error, refetch, isFetching } = useAttendanceDailyRecords(filters);
  const { data: syncStatus } = useAttendanceSyncStatus();
  const manualSync = useManualAttendanceSync();

  const maySync = can(HR_PERMISSIONS.ATTENDANCE_SYNC);

  // Sync status banner
  const dailyJob = syncStatus?.data?.dailyToday;
  const renderSyncStatusBanner = () => {
    if (!dailyJob) return null;

    if (dailyJob.isRunning) {
      return (
        <Alert color="blue" icon={<IconClock size={16} />} title="Sync đang chạy">
          Đang đồng bộ dữ liệu từ ZKTeco BioTime...
        </Alert>
      );
    }

    if (dailyJob.lastError) {
      return (
        <Alert color="red" icon={<IconAlertTriangle size={16} />} title="Sync lỗi gần nhất">
          <Text size="sm">{dailyJob.lastError}</Text>
          {dailyJob.lastErrorAt && (
            <Text size="xs" c="dimmed" mt={4}>
              Lúc {dayjs(dailyJob.lastErrorAt).format('HH:mm DD/MM/YYYY')}
            </Text>
          )}
        </Alert>
      );
    }

    if (dailyJob.lastSuccessAt) {
      return (
        <Alert color="green" icon={<IconCheck size={16} />} title="Sync thành công">
          <Text size="sm">
            Đã sync thành công lúc {dayjs(dailyJob.lastSuccessAt).format('HH:mm DD/MM/YYYY')}
            {dailyJob.totalSynced > 0 && ` · ${dailyJob.totalSynced} bản ghi`}
          </Text>
        </Alert>
      );
    }

    return null;
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const records = data.data ?? [];
  const pagination = data.pagination;

  return (
    <>
      <PageHeader
        title="Chấm công"
        subtitle="Dữ liệu chấm công đồng bộ từ ZKTeco BioTime"
        actions={
          maySync && (
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={() =>
                manualSync.mutate({
                  startDate: filters.date ?? dayjs().format('YYYY-MM-DD'),
                  endDate: filters.date ?? dayjs().format('YYYY-MM-DD'),
                })
              }
              loading={manualSync.isPending}
              variant="light"
              color="blue"
            >
              Đồng bộ lại
            </Button>
          )
        }
      />

      <Stack gap="md">
        {renderSyncStatusBanner()}

        <Card withBorder padding="md">
          <Stack gap="sm">
            <Group grow>
              <DatePickerInput
                label="Ngày"
                placeholder="Chọn ngày"
                value={filters.date ? new Date(filters.date) : null}
                onChange={(val) =>
                  setFilters((f) => ({
                    ...f,
                    date: val ? dayjs(val).format('YYYY-MM-DD') : undefined,
                    page: 1,
                  }))
                }
                clearable
                maxDate={new Date()}
              />
              <DatePickerInput
                label="Từ ngày"
                placeholder="Từ ngày"
                value={filters.from ? new Date(filters.from) : null}
                onChange={(val) =>
                  setFilters((f) => ({
                    ...f,
                    from: val ? dayjs(val).format('YYYY-MM-DD') : undefined,
                    page: 1,
                  }))
                }
                clearable
                maxDate={new Date()}
              />
              <DatePickerInput
                label="Đến ngày"
                placeholder="Đến ngày"
                value={filters.to ? new Date(filters.to) : null}
                onChange={(val) =>
                  setFilters((f) => ({
                    ...f,
                    to: val ? dayjs(val).format('YYYY-MM-DD') : undefined,
                    page: 1,
                  }))
                }
                clearable
                maxDate={new Date()}
              />
              <TextInput
                label="Mã nhân viên (ZKTeco)"
                placeholder="Ví dụ: NV000001"
                value={filters.empCode ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    empCode: e.currentTarget.value || undefined,
                    page: 1,
                  }))
                }
              />
            </Group>
            <Group grow>
              <TextInput
                label="Phòng ban"
                placeholder="Tên phòng ban"
                value={filters.deptName ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    deptName: e.currentTarget.value || undefined,
                    page: 1,
                  }))
                }
              />
              <Select
                label="Trạng thái"
                placeholder="Tất cả"
                clearable
                data={[
                  { value: 'PRESENT', label: 'Có mặt' },
                  { value: 'LATE', label: 'Đi muộn' },
                  { value: 'ABSENT', label: 'Vắng mặt' },
                  { value: 'SINGLE_PUNCH', label: '1 lần chấm' },
                  { value: 'UNKNOWN', label: 'Chưa xác định' },
                ]}
                value={filters.status}
                onChange={(val) =>
                  setFilters((f) => ({ ...f, status: val ?? undefined, page: 1 }))
                }
              />
              <Select
                label="Trạng thái mapping"
                placeholder="Tất cả"
                clearable
                data={[
                  { value: 'MAPPED', label: 'Đã map' },
                  { value: 'AUTO_MAPPED', label: 'Tự động' },
                  { value: 'UNMAPPED', label: 'Chưa map' },
                ]}
                value={filters.mappingStatus}
                onChange={(val) =>
                  setFilters((f) => ({ ...f, mappingStatus: val ?? undefined, page: 1 }))
                }
              />
            </Group>
            <Group justify="flex-end">
              <Button
                variant="subtle"
                size="xs"
                onClick={() =>
                  setFilters({
                    page: 1,
                    pageSize: 50,
                  })
                }
              >
                Xóa lọc
              </Button>
            </Group>
          </Stack>
        </Card>

        {records.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu chấm công"
            description={
              filters.date || filters.from || filters.to
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
                  header: 'Mã NV (ZKTeco)',
                  width: 130,
                  render: (record) => <Text size="sm" fw={500}>{record.empCode}</Text>,
                },
                {
                  key: 'employeeCode',
                  header: 'Mã NV (HRM)',
                  width: 120,
                  render: (record) =>
                    record.employeeCode ? (
                      <Text size="sm" c="blue">{record.employeeCode}</Text>
                    ) : (
                      <Text size="sm" c="dimmed">-</Text>
                    ),
                },
                {
                  key: 'fullName',
                  header: 'Họ tên',
                  width: 180,
                  render: (record) => record.fullName ?? '-',
                },
                {
                  key: 'deptName',
                  header: 'Phòng ban',
                  width: 150,
                  render: (record) => record.deptName ?? '-',
                },
                {
                  key: 'firstPunch',
                  header: 'Giờ vào',
                  width: 90,
                  align: 'center',
                  render: (record) =>
                    record.firstPunch ? (
                      <Text size="sm">{record.firstPunch.slice(0, 5)}</Text>
                    ) : (
                      <Text size="sm" c="dimmed">-</Text>
                    ),
                },
                {
                  key: 'lastPunch',
                  header: 'Giờ ra',
                  width: 90,
                  align: 'center',
                  render: (record) =>
                    record.lastPunch ? (
                      <Text size="sm">{record.lastPunch.slice(0, 5)}</Text>
                    ) : (
                      <Text size="sm" c="dimmed">-</Text>
                    ),
                },
                {
                  key: 'totalTime',
                  header: 'Tổng TG',
                  width: 80,
                  align: 'center',
                  render: (record) => record.totalTime ?? '-',
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  width: 110,
                  align: 'center',
                  render: (record) => (
                    <Badge
                      color={STATUS_COLORS[record.status ?? ''] ?? 'gray'}
                      variant="light"
                      size="sm"
                    >
                      {STATUS_LABELS[record.status ?? ''] ?? record.status ?? 'N/A'}
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
                      color={MAPPING_COLORS[record.mappingStatus] ?? 'gray'}
                      variant="light"
                      size="sm"
                    >
                      {MAPPING_LABELS[record.mappingStatus] ?? record.mappingStatus}
                    </Badge>
                  ),
                },
              ]}
              rowKey={(record) => record.id}
              meta={pagination}
              loading={isFetching}
              onPageChange={(page, pageSize) =>
                setFilters((f) => ({ ...f, page, pageSize }))
              }
            />
          </Card>
        )}
      </Stack>
    </>
  );
}
