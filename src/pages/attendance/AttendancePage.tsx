import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Card, Drawer, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { PageHeader } from '../../shared/components/PageHeader';
import { ROUTES } from '../../shared/constants/routes';
import { formatDate } from '../../shared/utils/date';
import {
  useAttendanceDailyRecords,
  useAttendanceSyncStatus,
  useManualAttendanceSync,
} from '../../features/attendance/useAttendanceSync';
import { useAuth } from '../../features/auth/useAuth';
import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { DataTable } from '../../shared/components/DataTable';
import type { AttendanceDailyFilterParams } from '../../features/attendance/attendanceTypes';
import { AttendanceFilterBar } from './components/AttendanceFilterBar';
import { AttendanceSyncStatusCard } from './components/AttendanceSyncStatusCard';
import { AttendanceSummaryCards } from './components/AttendanceSummaryCards';
import { ManualSyncModal } from './components/ManualSyncModal';
import { AttendanceSyncRunsTable } from './components/AttendanceSyncRunsTable';
import { BioTimeDepartmentsTable } from './components/BioTimeDepartmentsTable';
import styles from './AttendancePage.module.css';

const PAGE_SIZE = 50;

// Short status labels to avoid badge truncation
const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Đủ công',
  LATE: 'Đi muộn',
  ABSENT: 'Vắng',
  SINGLE_PUNCH: '1 lần',
  UNKNOWN: 'Không rõ',
};

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'green',
  LATE: 'yellow',
  ABSENT: 'red',
  SINGLE_PUNCH: 'orange',
  UNKNOWN: 'gray',
};

// Short mapping labels
const MAPPING_LABELS: Record<string, string> = {
  MAPPED: 'Đã map',
  AUTO_MAPPED: 'Tự map',
  UNMAPPED: 'Chưa map',
  CONFLICT: 'Trùng mã',
};

const MAPPING_COLORS: Record<string, string> = {
  MAPPED: 'green',
  AUTO_MAPPED: 'teal',
  UNMAPPED: 'orange',
  CONFLICT: 'red',
};

export interface AttendanceFilters {
  search: string;
  date: string;
  from: string;
  to: string;
  status: string;
  mappingStatus: string;
  biotimeDepartmentId: number | null;
}

function buildQueryParams(
  filters: AttendanceFilters & { page: number; pageSize: number },
): AttendanceDailyFilterParams {
  const params: AttendanceDailyFilterParams = {
    page: filters.page,
    pageSize: filters.pageSize,
  };

  if (filters.search) params.search = filters.search;

  // Date mode vs range mode - don't send both
  if (filters.from || filters.to) {
    // Range mode
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  } else if (filters.date) {
    // Single date mode
    params.date = filters.date;
  }

  if (filters.status) params.status = filters.status;
  if (filters.mappingStatus) params.mappingStatus = filters.mappingStatus;
  if (filters.biotimeDepartmentId) params.biotimeDepartmentId = filters.biotimeDepartmentId;

  return params;
}

const DEFAULT_FILTERS: AttendanceFilters = {
  search: '',
  date: dayjs().format('YYYY-MM-DD'),
  from: '',
  to: '',
  status: '',
  mappingStatus: '',
  biotimeDepartmentId: null,
};

export function AttendancePage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Permissions
  const maySync = can(HR_PERMISSIONS.ATTENDANCE_SYNC);
  const mayViewSyncLog = can(HR_PERMISSIONS.ATTENDANCE_SYNC_LOG_READ);
  const mayExport = can(HR_PERMISSIONS.ATTENDANCE_EXPORT);

  // Modal & drawer states
  const [syncModalOpened, { open: openSyncModal, close: closeSyncModal }] = useDisclosure(false);
  const [syncHistoryOpened, { open: openSyncHistory, close: closeSyncHistory }] = useDisclosure(false);
  const [biotimeDeptsOpened, { open: openBiotimeDepts, close: closeBiotimeDepts }] = useDisclosure(false);

  // Read filter state from URL, fallback to localStorage
  const [savedFilters, setSavedFilters] = useLocalStorage<AttendanceFilters>({
    key: 'attendance-filters',
    defaultValue: DEFAULT_FILTERS,
  });

  // Sync filter state from URL
  const pageParam = parseInt(searchParams.get('page') ?? '1', 10);

  const [filters, setFilters] = useState<AttendanceFilters>(() => ({
    search: searchParams.get('search') ?? savedFilters.search,
    date: searchParams.get('date') ?? savedFilters.date,
    from: searchParams.get('from') ?? savedFilters.from,
    to: searchParams.get('to') ?? savedFilters.to,
    status: searchParams.get('status') ?? savedFilters.status,
    mappingStatus: searchParams.get('mappingStatus') ?? savedFilters.mappingStatus,
    biotimeDepartmentId: savedFilters.biotimeDepartmentId ?? null,
  }));

  const [page, setPage] = useState(pageParam);

  const queryParams = buildQueryParams({ ...filters, page, pageSize: PAGE_SIZE });

  // Queries
  const { data, isLoading, error, refetch, isFetching } = useAttendanceDailyRecords(queryParams);
  const { data: syncStatus, isLoading: syncStatusLoading } = useAttendanceSyncStatus();
  const manualSync = useManualAttendanceSync();

  const records = data?.data ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary;

  // Handle filter changes - sync to URL and localStorage
  const handleFilterChange = (newFilters: AttendanceFilters) => {
    setFilters(newFilters);
    setSavedFilters(newFilters);
    setPage(1);

    // Sync to URL
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.date) params.set('date', newFilters.date);
    if (newFilters.from) params.set('from', newFilters.from);
    if (newFilters.to) params.set('to', newFilters.to);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.mappingStatus) params.set('mappingStatus', newFilters.mappingStatus);
    if (newFilters.biotimeDepartmentId) params.set('biotimeDepartmentId', String(newFilters.biotimeDepartmentId));
    params.set('page', '1');
    setSearchParams(params, { replace: true });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('page', String(newPage));
      return params;
    }, { replace: true });
  };

  // Sync modal handlers
  const handleSync = () => {
    openSyncModal();
  };

  const handleSyncSubmit = (params: { startDate: string; endDate: string; refreshDepartments: boolean }) => {
    manualSync.mutate(params, {
      onSuccess: (result) => {
        const syncResult = result.data;
        closeSyncModal();
        if (syncResult.status === 'SUCCESS') {
          notifications.show({
            title: 'Đồng bộ thành công',
            message: `${syncResult.totalUpserted?.toLocaleString('vi-VN') ?? 0} bản ghi đã được đồng bộ`,
            color: 'green',
            icon: <IconCheck size={16} />,
          });
        } else {
          notifications.show({
            title: 'Đồng bộ thất bại',
            message: syncResult.errorMessage ?? 'Lỗi không xác định',
            color: 'red',
          });
        }
        void refetch();
      },
      onError: (err) => {
        closeSyncModal();
        notifications.show({
          title: 'Đồng bộ thất bại',
          message: err instanceof Error ? err.message : 'Lỗi không xác định',
          color: 'red',
        });
      },
    });
  };

  // Export handler
  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.from || filters.to) {
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
    } else if (filters.date) {
      params.set('date', filters.date);
    }
    if (filters.status) params.set('status', filters.status);
    if (filters.mappingStatus) params.set('mappingStatus', filters.mappingStatus);

    const baseUrl = import.meta.env.VITE_API_URL ?? '';
    const token = localStorage.getItem('accessToken') ?? '';
    const url = `${baseUrl}/attendance/daily/export?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      notifications.show({
        title: 'Xuất thất bại',
        message: 'Không thể tải file xuất',
        color: 'red',
      });
      return;
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `attendance_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  };

  // Determine empty state reason
  const getEmptyStateReason = (): { title: string; description: string; action?: () => void } => {
    const hasActiveFilters =
      filters.search ||
      filters.date ||
      filters.from ||
      filters.to ||
      filters.status ||
      filters.mappingStatus ||
      filters.biotimeDepartmentId;

    if (!syncStatus?.data?.hasAttendanceData) {
      return {
        title: 'Chưa có dữ liệu chấm công',
        description: 'Hãy đồng bộ dữ liệu từ BioTime để bắt đầu.',
      };
    }

    if (syncStatus?.data?.dailyToday?.lastError || syncStatus?.data?.nightly7Days?.lastError) {
      return {
        title: 'Đồng bộ gần nhất thất bại',
        description: 'Hãy xem lịch sử đồng bộ để kiểm tra lỗi.',
      };
    }

    if (hasActiveFilters) {
      return {
        title: 'Không có dữ liệu phù hợp',
        description: 'Không có bản ghi nào phù hợp với bộ lọc hiện tại.',
        action: () =>
          handleFilterChange({
            ...DEFAULT_FILTERS,
          }),
      };
    }

    return {
      title: 'Chưa có dữ liệu chấm công',
      description: 'Hãy đồng bộ dữ liệu từ BioTime để bắt đầu.',
    };
  };

  const emptyReason = getEmptyStateReason();

  return (
    <>
      <PageHeader
        title="Chấm công"
        subtitle="Theo dõi dữ liệu chấm công đồng bộ từ BioTime/ZKTeco"
        actions={
          <Group gap="xs">
            {mayViewSyncLog && (
              <Text
                size="sm"
                c="blue"
                style={{ cursor: 'pointer' }}
                onClick={openBiotimeDepts}
              >
                Phòng ban BioTime
              </Text>
            )}
            {mayViewSyncLog && (
              <Text
                size="sm"
                c="blue"
                style={{ cursor: 'pointer' }}
                onClick={openSyncHistory}
              >
                Lịch sử đồng bộ
              </Text>
            )}
            {mayExport && (
              <Text
                size="sm"
                c="blue"
                style={{ cursor: 'pointer' }}
                onClick={handleExport}
              >
                Xuất CSV
              </Text>
            )}
            {maySync && (
              <Text
                size="sm"
                c="blue"
                style={{ cursor: 'pointer' }}
                onClick={handleSync}
              >
                Đồng bộ dữ liệu
              </Text>
            )}
          </Group>
        }
      />

      <Stack gap="xs">
        {/* Sync Status Card */}
        <AttendanceSyncStatusCard
          status={syncStatus?.data}
          isLoading={syncStatusLoading}
          onViewSyncHistory={openSyncHistory}
          mayViewSyncLog={mayViewSyncLog}
        />

        {/* Unmapped/Conflict warning */}
        {(summary && (summary.unmapped + summary.conflict) > 0) && (
          <Text size="xs" c="orange">
            Có {summary.unmapped + summary.conflict} bản ghi chấm công chưa được map với nhân sự HRM.
            Cần xử lý để dữ liệu hiển thị trên lịch cá nhân.
          </Text>
        )}

        {/* Summary Cards */}
        <AttendanceSummaryCards summary={summary} />

        {/* Filter Bar */}
        <AttendanceFilterBar
          filters={filters}
          onChange={handleFilterChange}
          maySync={maySync}
          onSync={handleSync}
          onOpenMapping={() => navigate(ROUTES.attendanceMapping)}
          isSyncing={manualSync.isPending}
          unmappedConflictCount={summary ? summary.unmapped + summary.conflict : 0}
        />

        {/* Data Table or Empty State */}
        {isLoading ? (
          <ErrorState title="Đang tải dữ liệu..." />
        ) : error || !data ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : records.length === 0 ? (
          <EmptyState
            title={emptyReason.title}
            description={emptyReason.description}
            actionLabel={emptyReason.action ? 'Xóa bộ lọc' : undefined}
            onAction={emptyReason.action}
          />
        ) : (
          <Card withBorder padding={0} className={styles.tableCard}>
            <DataTable
              data={records}
              columns={[
                {
                  key: 'workDate',
                  header: 'Ngày',
                  width: 110,
                  align: 'center',
                  render: (record) => (
                    <Text size="sm" className={styles.dateCell}>
                      {formatDate(record.workDate)}
                    </Text>
                  ),
                },
                {
                  key: 'empCode',
                  header: 'Mã chấm công',
                  width: 100,
                  render: (record) => (
                    <Text size="sm" fw={600} className={styles.empCode}>
                      {record.empCode}
                    </Text>
                  ),
                },
                {
                  key: 'employeeCode',
                  header: 'Mã NS HRM',
                  width: 100,
                  align: 'center',
                  render: (record) => (
                    <Text
                      size="sm"
                      c={record.employeeCode ? undefined : 'dimmed'}
                    >
                      {record.employeeCode ?? '—'}
                    </Text>
                  ),
                },
                {
                  key: 'fullName',
                  header: 'Họ tên',
                  minWidth: 180,
                  render: (record) => (
                    <Text size="sm" fw={500}>
                      {record.fullName ?? '-'}
                    </Text>
                  ),
                },
                {
                  key: 'deptName',
                  header: 'Phòng ban',
                  minWidth: 160,
                  render: (record) => (
                    <Text size="sm" c="dimmed">
                      {record.deptName ?? '-'}
                    </Text>
                  ),
                },
                {
                  key: 'firstPunch',
                  header: 'Vào',
                  width: 70,
                  align: 'center',
                  render: (record) =>
                    record.firstPunch ? (
                      <Text size="sm" className={styles.timeCell}>
                        {record.firstPunch.slice(0, 5)}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed">—</Text>
                    ),
                },
                {
                  key: 'lastPunch',
                  header: 'Ra',
                  width: 70,
                  align: 'center',
                  render: (record) =>
                    record.lastPunch ? (
                      <Text size="sm" className={styles.timeCell}>
                        {record.lastPunch.slice(0, 5)}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed">—</Text>
                    ),
                },
                {
                  key: 'totalTime',
                  header: 'Tổng giờ',
                  width: 80,
                  align: 'right',
                  render: (record) => (
                    <Text size="sm" className={styles.numericCell}>
                      {record.totalTime ?? '—'}
                    </Text>
                  ),
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  width: 100,
                  align: 'center',
                  render: (record) => (
                    <Tooltip
                      label={
                        record.status === 'SINGLE_PUNCH'
                          ? 'Chỉ chấm 1 lần - có thể thiếu giờ ra'
                          : record.status === 'UNKNOWN'
                          ? 'Không rõ - cần kiểm tra lại'
                          : undefined
                      }
                      disabled={record.status !== 'SINGLE_PUNCH' && record.status !== 'UNKNOWN'}
                    >
                      <Badge
                        color={STATUS_COLORS[record.status ?? ''] ?? 'gray'}
                        variant="light"
                        size="sm"
                        radius="md"
                      >
                        {STATUS_LABELS[record.status ?? ''] ?? record.status ?? 'N/A'}
                      </Badge>
                    </Tooltip>
                  ),
                },
                {
                  key: 'mappingStatus',
                  header: 'Mapping',
                  width: 100,
                  align: 'center',
                  render: (record) => (
                    <Tooltip
                      label={
                        record.mappingStatus === 'UNMAPPED'
                          ? 'Nhân sự chưa liên kết với HRM'
                          : record.mappingStatus === 'AUTO_MAPPED'
                          ? 'Tự động map theo prefix+mã số'
                          : undefined
                      }
                      disabled={record.mappingStatus === 'MAPPED'}
                    >
                      <Badge
                        color={MAPPING_COLORS[record.mappingStatus] ?? 'gray'}
                        variant="light"
                        size="sm"
                        radius="md"
                      >
                        {MAPPING_LABELS[record.mappingStatus] ?? record.mappingStatus}
                      </Badge>
                    </Tooltip>
                  ),
                },
              ]}
              rowKey={(record) => record.id}
              meta={pagination ?? undefined}
              loading={isFetching}
              onPageChange={handlePageChange}
            />
          </Card>
        )}
      </Stack>

      {/* Manual Sync Modal */}
      <ManualSyncModal
        opened={syncModalOpened}
        onClose={closeSyncModal}
        onSync={handleSyncSubmit}
        isLoading={manualSync.isPending}
      />

      {/* Sync History Drawer */}
      <Drawer
        opened={syncHistoryOpened}
        onClose={closeSyncHistory}
        title="Lịch sử đồng bộ"
        position="right"
        size="lg"
        padding="md"
      >
        <AttendanceSyncRunsTable />
      </Drawer>

      {/* BioTime Departments Drawer */}
      <Drawer
        opened={biotimeDeptsOpened}
        onClose={closeBiotimeDepts}
        title="Phòng ban BioTime"
        position="right"
        size="lg"
        padding="md"
      >
        <BioTimeDepartmentsTable />
      </Drawer>
    </>
  );
}
