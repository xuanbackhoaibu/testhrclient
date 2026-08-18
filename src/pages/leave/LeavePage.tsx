import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCalendarCheck,
  IconFilterOff,
  IconListDetails,
  IconTrash,
} from '@tabler/icons-react';

import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { useAuth } from '../../features/auth/useAuth';
import type {
  LeaveApprovalStep,
  LeavePolicyType,
  LeaveRequest,
} from '../../features/leave/leaveTypes';
import {
  useDeleteCancelledLeaveRequest,
  useLeaveRequests,
  useLeaveTypes,
} from '../../features/leave/useLeaveRequests';
import { useEmployees } from '../../features/employees/useEmployees';
import { LEAVE_TYPE_OPTIONS } from '../../shared/constants/statuses';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { ConfirmActionModal } from '../../shared/components/ConfirmActionModal';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { formatDate } from '../../shared/utils/date';
import styles from './LeavePage.module.css';

const EMPLOYEE_SELECT_PAGE_SIZE = 20;
const CATALOG_PAGE_SIZE = 10;

type EmployeeSelectOption = {
  value: string;
  label: string;
};

const HALF_DAY_SESSION_OPTIONS = [
  { value: 'FULL_DAY', label: 'Cả ngày' },
  { value: 'MORNING', label: 'Buổi sáng' },
  { value: 'AFTERNOON', label: 'Buổi chiều' },
] as const;

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Nghỉ phép năm',
  SICK: 'Nghỉ ốm',
  UNPAID: 'Nghỉ không lương',
  MARRIAGE: 'Nghỉ kết hôn',
  MATERNITY: 'Thai sản',
  OTHER: 'Nghỉ khác',
  WORK_FULL: 'Làm việc cả ngày',
  WORK_HALF: 'Làm việc nửa ngày',
  PAID_PERSONAL: 'Nghỉ việc riêng có lương',
  CHILD_SICK: 'Nghỉ con ốm',
  WORK_ACCIDENT: 'Tai nạn lao động',
  COMPENSATORY: 'Nghỉ bù',
  HOLIDAY: 'Lễ Tết',
  COMPANY_TRIP: 'Du lịch',
  WORK_STOP: 'Nghỉ ngừng việc',
  BUSINESS_TRIP: 'Công tác',
  SECONDMENT: 'Công tác biệt phái',
  OFFICE_DUTY: 'Trực văn phòng',
  MEETING: 'Hội họp',
  COMPULSORY_LABOR: 'Lao động nghĩa vụ',
  ONLINE_WORK: 'Làm việc online',
};

const REQUEST_STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

const REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đang trình duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

const QUOTA_MODE_LABELS: Record<string, string> = {
  NONE: 'Không trừ quỹ',
  ANNUAL_BALANCE: 'Trừ phép năm',
  PER_EVENT: 'Theo từng sự kiện',
  INSURANCE: 'Chế độ BHXH',
  COMPENSATORY_BALANCE: 'Quỹ nghỉ bù',
  PENDING_HR_RULE: 'Chờ HR chốt quy tắc',
};

const APPROVAL_STEP_LABELS: Record<string, string> = {
  ATTENDANCE_TRACKER: 'Người theo dõi chấm công',
  DEPARTMENT_MANAGER: 'Trưởng bộ phận',
  OFFICE_CHIEF: 'Chánh văn phòng',
  BOARD: 'Ban Tổng giám đốc',
};

function labelFrom(map: Record<string, string>, value?: string | null) {
  return value ? map[value] ?? value : '-';
}

function sessionLabel(value?: string | null) {
  return HALF_DAY_SESSION_OPTIONS.find((item) => item.value === value)?.label ?? 'Cả ngày';
}

function sessionRangeLabel(record: LeaveRequest) {
  const start = sessionLabel(record.startHalfDaySession);
  const end = sessionLabel(record.endHalfDaySession);
  return start === end ? start : `${start} - ${end}`;
}

function noticeLabel(record: LeaveRequest) {
  const actual = record.noticeActualDays ?? '-';
  const required = record.noticeRequiredDays ?? '-';
  return record.lateSubmission ? `Trễ hạn (${actual}/${required})` : `${actual}/${required} ngày`;
}

function approvalLabel(step: LeaveApprovalStep | null) {
  if (!step) {
    return '-';
  }

  return `Cấp ${step.stepOrder}: ${labelFrom(APPROVAL_STEP_LABELS, step.stepCode) || step.stepName}`;
}

function policyName(record: LeavePolicyType) {
  return labelFrom(LEAVE_TYPE_LABELS, record.code) || record.name;
}

function getInitials(name?: string | null): string {
  if (!name) return 'HR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderZaloStatus(status?: string | null) {
  if (!status) return null;
  const label = labelFrom(REQUEST_STATUS_LABELS, status);
  let statusClass = styles.statusDraft;

  switch (status) {
    case 'SUBMITTED':
      statusClass = styles.statusSubmitted;
      break;
    case 'APPROVED':
      statusClass = styles.statusApproved;
      break;
    case 'REJECTED':
      statusClass = styles.statusRejected;
      break;
    case 'CANCELLED':
      statusClass = styles.statusCancelled;
      break;
    default:
      statusClass = styles.statusDraft;
  }

  return <span className={`${styles.zaloStatusTag} ${statusClass}`}>{label}</span>;
}

const leaveTypeOptions = LEAVE_TYPE_OPTIONS.map((item) => ({
  value: item,
  label: labelFrom(LEAVE_TYPE_LABELS, item),
}));

const statusOptions = REQUEST_STATUS_OPTIONS.map((item) => ({
  value: item,
  label: labelFrom(REQUEST_STATUS_LABELS, item),
}));

export function LeavePage() {
  const { can } = useAuth();
  const canDeleteCancelled = can(HR_PERMISSIONS.LEAVE_CANCEL);

  const [activeTab, setActiveTab] = useState<'requests' | 'catalog'>('requests');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSelectOption | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<LeaveRequest | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    employeeId: undefined as string | undefined,
    leaveType: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  const { data, isLoading, error, refetch } = useLeaveRequests(params);
  const { data: leaveTypes = [], isLoading: isLeaveTypesLoading } = useLeaveTypes();
  const deleteCancelledLeaveRequest = useDeleteCancelledLeaveRequest();

  const employeesQuery = useEmployees({
    search: employeeSearch.trim() || undefined,
    page: 1,
    pageSize: EMPLOYEE_SELECT_PAGE_SIZE,
  });

  const employeeOptions = useMemo<EmployeeSelectOption[]>(() => {
    const options = (employeesQuery.data?.items ?? []).map((employee) => ({
      value: employee.id,
      label: employee.fullName,
    }));

    if (selectedEmployee && !options.some((option) => option.value === selectedEmployee.value)) {
      return [selectedEmployee, ...options];
    }

    return options;
  }, [employeesQuery.data?.items, selectedEmployee]);

  const activeFilterCount =
    (params.employeeId ? 1 : 0) + (params.leaveType ? 1 : 0) + (params.status ? 1 : 0);

  const currentApprovalStep = (record: LeaveRequest) =>
    record.status === 'SUBMITTED'
      ? (record.approvalSteps?.find((step) => step.status === 'SUBMITTED') ?? null)
      : null;

  async function handleDeleteCancelledRequest(record: LeaveRequest) {
    try {
      await deleteCancelledLeaveRequest.mutateAsync(record.id);
      setDeletingRequest(null);
      notifications.show({
        title: 'Đã xóa đơn',
        message: 'Đơn nghỉ phép đã hủy được xóa khỏi danh sách.',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Không xóa được đơn',
        message: 'Đơn chỉ được xóa khi đã ở trạng thái hủy.',
        color: 'red',
      });
    }
  }

  function handleClearFilters() {
    setSelectedEmployee(null);
    setParams({
      page: 1,
      pageSize: params.pageSize,
      employeeId: undefined,
      leaveType: undefined,
      status: undefined,
    });
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const requestColumns: DataTableColumn<LeaveRequest>[] = [
    {
      key: 'employee',
      header: 'Nhân viên',
      minWidth: 210,
      render: (record) => {
        const name = record.employeeName ?? record.employee?.fullName ?? record.employeeId;
        const code = record.employee?.employeeCode ?? record.employeeId;
        return (
          <div className={styles.employeeCell}>
            <div className={styles.zaloAvatar}>{getInitials(name)}</div>
            <div className={styles.employeeInfo}>
              <span className={styles.employeeName}>{name}</span>
              <span className={styles.employeeCode}>{code}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'leaveType',
      header: 'Loại nghỉ',
      minWidth: 160,
      render: (record) => (
        <Badge variant="light" color="gray" size="sm">
          {labelFrom(LEAVE_TYPE_LABELS, record.leaveType)}
        </Badge>
      ),
    },
    {
      key: 'dateRange',
      header: 'Thời gian nghỉ',
      minWidth: 180,
      render: (record) => (
        <Stack gap={3}>
          <div className={styles.dateRangeText}>
            <span>{formatDate(record.startDate)}</span>
            <span>→</span>
            <span>{formatDate(record.endDate)}</span>
          </div>
          <span className={styles.sessionPill}>{sessionRangeLabel(record)}</span>
        </Stack>
      ),
    },
    {
      key: 'totalDays',
      header: 'Số ngày',
      width: 90,
      align: 'right',
      render: (record) => (
        <span className={styles.daysNumber}>
          {record.totalDays != null ? `${record.totalDays} ngày` : '-'}
        </span>
      ),
    },
    {
      key: 'notice',
      header: 'Báo trước',
      width: 120,
      align: 'center',
      render: (record) => (
        <span className={record.lateSubmission ? styles.noticeLate : styles.noticeNormal}>
          {noticeLabel(record)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 170,
      render: (record) => (
        <Group gap={6} wrap="nowrap">
          {renderZaloStatus(record.status)}
          {record.status === 'CANCELLED' && canDeleteCancelled ? (
            <Tooltip label="Xóa đơn đã hủy" withArrow>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                aria-label={
                  'Xóa đơn nghỉ phép đã hủy của ' +
                  (record.employeeName ?? record.employee?.fullName ?? record.employeeId)
                }
                disabled={deleteCancelledLeaveRequest.isPending}
                onClick={() => setDeletingRequest(record)}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          ) : null}
        </Group>
      ),
    },
    {
      key: 'approval',
      header: 'Luồng duyệt',
      minWidth: 190,
      render: (record) => (
        <span className={styles.approvalStepText}>
          {approvalLabel(currentApprovalStep(record))}
        </span>
      ),
    },
  ];

  // The catalog endpoint returns every symbol at once, so page it here.
  const catalogTotalPages = Math.max(1, Math.ceil(leaveTypes.length / CATALOG_PAGE_SIZE));
  const catalogCurrentPage = Math.min(catalogPage, catalogTotalPages);
  const pagedLeaveTypes = leaveTypes.slice(
    (catalogCurrentPage - 1) * CATALOG_PAGE_SIZE,
    catalogCurrentPage * CATALOG_PAGE_SIZE,
  );
  const catalogMeta = {
    page: catalogCurrentPage,
    pageSize: CATALOG_PAGE_SIZE,
    total: leaveTypes.length,
    totalPages: catalogTotalPages,
    hasNextPage: catalogCurrentPage < catalogTotalPages,
    hasPreviousPage: catalogCurrentPage > 1,
  };

  const catalogColumns: DataTableColumn<LeavePolicyType>[] = [
    {
      key: 'symbol',
      header: 'Ký hiệu',
      width: 90,
      align: 'center',
      render: (record) => (
        <Badge variant="outline" color="dark" size="md" fw={700}>
          {record.displaySymbol}
        </Badge>
      ),
    },
    {
      key: 'code',
      header: 'Mã',
      minWidth: 140,
      render: (record) => (
        <Text size="sm" c="dimmed">
          {record.code}
        </Text>
      ),
    },
    {
      key: 'name',
      header: 'Tên ký hiệu',
      minWidth: 220,
      render: (record) => (
        <Stack gap={2}>
          <Text size="sm" fw={600}>
            {policyName(record)}
          </Text>
          {record.note ? (
            <Text size="xs" c="dimmed">
              {record.note}
            </Text>
          ) : null}
        </Stack>
      ),
    },
    {
      key: 'dayValue',
      header: 'Giá trị ngày',
      width: 110,
      align: 'right',
      render: (record) => (
        <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {record.dayValue ?? '-'}
        </Text>
      ),
    },
    {
      key: 'quotaMode',
      header: 'Quỹ phép',
      minWidth: 170,
      render: (record) => (
        <Badge variant="dot" color="blue" size="sm">
          {labelFrom(QUOTA_MODE_LABELS, record.quotaMode)}
        </Badge>
      ),
    },
    {
      key: 'hrRule',
      header: 'Quy tắc HR',
      width: 140,
      render: (record) => (
        <Badge variant="light" color={record.hrRuleStatus === 'ACTIVE' ? 'green' : 'gray'} size="sm">
          {record.hrRuleStatus === 'ACTIVE' ? 'Áp dụng' : record.hrRuleStatus ?? '—'}
        </Badge>
      ),
    },
    {
      key: 'annual',
      header: 'Trừ phép năm',
      width: 125,
      align: 'center',
      render: (record) => (
        <Badge
          variant="light"
          color={record.deductsAnnualLeave ? 'blue' : 'gray'}
          size="sm"
        >
          {record.deductsAnnualLeave ? 'Có' : 'Không'}
        </Badge>
      ),
    },
    {
      key: 'attachment',
      header: 'Chứng từ',
      width: 115,
      align: 'center',
      render: (record) => (
        <Badge
          variant="light"
          color={record.requiresAttachment ? 'orange' : 'gray'}
          size="sm"
        >
          {record.requiresAttachment ? 'Bắt buộc' : 'Không'}
        </Badge>
      ),
    },
  ];

  return (
    <div className={styles.zaloLeaveWrapper}>
      {/* 1. Header Bar with Zalo Web Tabs */}
      <div className={styles.zaloHeaderRow}>
        <div className={styles.zaloTitleArea}>
          <h1 className={styles.zaloMainTitle}>Quản lý nghỉ phép</h1>
          <span className={styles.zaloSubtitle}>
            Theo dõi trạng thái đơn nghỉ phép, luồng phê duyệt và danh mục ký hiệu đối chiếu bảng công.
          </span>
        </div>

        <SegmentedControl
          size="xs"
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'requests' | 'catalog')}
          className={styles.zaloSegmentTabs}
          data={[
            {
              value: 'requests',
              label: (
                <div className={styles.zaloTabItem}>
                  <IconCalendarCheck size={14} />
                  <span>Đơn nghỉ phép</span>
                  <span className={styles.zaloTabBadge}>{data.pagination.total}</span>
                </div>
              ),
            },
            {
              value: 'catalog',
              label: (
                <div className={styles.zaloTabItem}>
                  <IconListDetails size={14} />
                  <span>Bảng ký hiệu</span>
                  <span className={styles.zaloTabBadge}>{leaveTypes.length}</span>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* 2. Flat Zalo Web Card containing Toolbar & Table */}
      <div className={styles.zaloMainCard}>
        {/* Toolbar with Filters (Only on requests tab) */}
        {activeTab === 'requests' && (
          <div className={styles.zaloToolbar}>
            <div className={styles.zaloFiltersLeft}>
              <Select
                aria-label="Nhân viên"
                placeholder="Chọn nhân viên"
                data={employeeOptions}
                value={selectedEmployee?.value ?? null}
                clearable
                searchable
                size="xs"
                className={styles.zaloFilterEmp}
                nothingFoundMessage={
                  employeesQuery.isFetching ? 'Đang tải nhân viên...' : 'Không tìm thấy nhân viên'
                }
                onSearchChange={setEmployeeSearch}
                onChange={(value) => {
                  setSelectedEmployee(
                    employeeOptions.find((option) => option.value === value) ?? null,
                  );
                  setParams((current) => ({
                    ...current,
                    page: 1,
                    employeeId: value ?? undefined,
                  }));
                }}
              />

              <Select
                aria-label="Loại nghỉ"
                placeholder="Loại nghỉ phép"
                data={leaveTypeOptions}
                value={params.leaveType ?? null}
                clearable
                size="xs"
                className={styles.zaloFilterType}
                onChange={(value) =>
                  setParams((current) => ({
                    ...current,
                    page: 1,
                    leaveType: value ?? undefined,
                  }))
                }
              />

              <Select
                aria-label="Trạng thái"
                placeholder="Trạng thái duyệt"
                data={statusOptions}
                value={params.status ?? null}
                clearable
                size="xs"
                className={styles.zaloFilterStatus}
                onChange={(value) =>
                  setParams((current) => ({
                    ...current,
                    page: 1,
                    status: value ?? undefined,
                  }))
                }
              />
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                className={styles.zaloClearFilterBtn}
                onClick={handleClearFilters}
              >
                <IconFilterOff size={13} />
                <span>Xóa bộ lọc ({activeFilterCount})</span>
              </button>
            )}
          </div>
        )}

        {/* Table Content */}
        {activeTab === 'requests' ? (
          <DataTable
            data={data.items}
            columns={requestColumns}
            rowKey={(record) => record.id}
            meta={data.pagination}
            onPageChange={(page, pageSize) =>
              setParams((current) => ({ ...current, page, pageSize }))
            }
            emptyTitle="Chưa có đơn nghỉ phép"
            emptyDescription="Đơn được tạo và xử lý trên Hacom Chat, sau đó tự động đồng bộ tại đây."
          />
        ) : (
          <DataTable
            data={pagedLeaveTypes}
            columns={catalogColumns}
            rowKey={(record) => record.id}
            loading={isLeaveTypesLoading}
            meta={catalogMeta}
            onPageChange={(page) => setCatalogPage(page)}
            emptyTitle="Chưa có ký hiệu nghỉ phép"
          />
        )}
      </div>

      <ConfirmActionModal
        opened={deletingRequest !== null}
        title="Xóa đơn đã hủy?"
        message="Đơn sẽ bị xóa khỏi danh sách và không thể khôi phục."
        confirmLabel="Xóa"
        loading={deleteCancelledLeaveRequest.isPending}
        onClose={() => setDeletingRequest(null)}
        onConfirm={() => {
          if (deletingRequest) {
            void handleDeleteCancelledRequest(deletingRequest);
          }
        }}
      />
    </div>
  );
}
