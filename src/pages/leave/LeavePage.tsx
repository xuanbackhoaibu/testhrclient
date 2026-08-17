import { useMemo, useState } from 'react';
import { ActionIcon, Group, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';

import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { useAuth } from '../../features/auth/useAuth';

import type {
  LeaveApprovalStep,
  LeavePolicyType,
  LeaveRequest,
} from '../../features/leave/leaveTypes';
import { useDeleteCancelledLeaveRequest, useLeaveRequests, useLeaveTypes } from '../../features/leave/useLeaveRequests';
import { useEmployees } from '../../features/employees/useEmployees';
import { LEAVE_TYPE_OPTIONS } from '../../shared/constants/statuses';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { ConfirmActionModal } from '../../shared/components/ConfirmActionModal';
import { ErrorState } from '../../shared/components/ErrorState';
import { FilterBar } from '../../shared/components/FilterBar';
import filterStyles from '../../shared/components/FilterBar.module.css';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { SectionCard } from '../../shared/components/SectionCard';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate } from '../../shared/utils/date';
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
  return record.lateSubmission ? `Trễ hạn (${actual}/${required})` : `${actual}/${required}`;
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
  const employeeOptions = useMemo<EmployeeSelectOption[]>(
    () => {
      const options = (employeesQuery.data?.items ?? []).map((employee) => ({
        value: employee.id,
        label: employee.fullName,
      }));

      if (
        selectedEmployee &&
        !options.some((option) => option.value === selectedEmployee.value)
      ) {
        return [selectedEmployee, ...options];
      }

      return options;
    },
    [employeesQuery.data?.items, selectedEmployee],
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

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



  const requestColumns: DataTableColumn<LeaveRequest>[] = [
    {
      key: 'employee',
      header: 'Nhân viên',
      minWidth: 190,
      render: (record) => (
        <Stack gap={0}>
          <Text size="sm" fw={500}>
            {record.employeeName ?? record.employee?.fullName ?? record.employeeId}
          </Text>
          <Text size="xs" c="dimmed">
            {record.employee?.employeeCode ?? record.employeeId}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'leaveType',
      header: 'Loại nghỉ',
      minWidth: 150,
      render: (record) => (
        <Text size="sm">{labelFrom(LEAVE_TYPE_LABELS, record.leaveType)}</Text>
      ),
    },
    {
      key: 'startDate',
      header: 'Từ ngày',
      width: 108,
      align: 'center',
      render: (record) => (
        <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(record.startDate)}
        </Text>
      ),
    },
    {
      key: 'endDate',
      header: 'Đến ngày',
      width: 108,
      align: 'center',
      render: (record) => (
        <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(record.endDate)}
        </Text>
      ),
    },
    {
      key: 'session',
      header: 'Buổi nghỉ',
      minWidth: 130,
      render: (record) => <Text size="sm">{sessionRangeLabel(record)}</Text>,
    },
    {
      key: 'totalDays',
      header: 'Số ngày',
      width: 84,
      align: 'right',
      render: (record) => (
        <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {record.totalDays ?? '-'}
        </Text>
      ),
    },
    {
      key: 'notice',
      header: 'Báo trước',
      width: 116,
      align: 'center',
      render: (record) => (
        <Text size="sm" c={record.lateSubmission ? 'orange.7' : undefined}>
          {noticeLabel(record)}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 168,
      render: (record) => (
        <Group gap={4} wrap="nowrap">
          <StatusTag status={record.status} />
          {record.status === 'CANCELLED' && canDeleteCancelled ? (
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
              <IconTrash size={15} />
            </ActionIcon>
          ) : null}
        </Group>
      ),
    },
    {
      key: 'approval',
      header: 'Luồng duyệt',
      minWidth: 180,
      render: (record) => (
        <Text size="sm" c="dimmed">
          {approvalLabel(currentApprovalStep(record))}
        </Text>
      ),
    },
  ];

  // The catalog endpoint returns every symbol at once, so page it here.
  const catalogTotalPages = Math.max(
    1,
    Math.ceil(leaveTypes.length / CATALOG_PAGE_SIZE),
  );
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
      width: 84,
      align: 'center',
      render: (record) => (
        <Text size="sm" fw={600}>
          {record.displaySymbol}
        </Text>
      ),
    },
    {
      key: 'code',
      header: 'Mã',
      minWidth: 150,
      render: (record) => (
        <Text size="sm" c="dimmed">
          {record.code}
        </Text>
      ),
    },
    {
      key: 'name',
      header: 'Tên ký hiệu',
      minWidth: 200,
      render: (record) => (
        <Stack gap={0}>
          <Text size="sm">{policyName(record)}</Text>
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
      width: 106,
      align: 'right',
      render: (record) => (
        <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {record.dayValue ?? '-'}
        </Text>
      ),
    },
    {
      key: 'quotaMode',
      header: 'Quỹ phép',
      minWidth: 160,
      render: (record) => (
        <Text size="sm">{labelFrom(QUOTA_MODE_LABELS, record.quotaMode)}</Text>
      ),
    },
    {
      key: 'hrRule',
      header: 'Quy tắc HR',
      width: 150,
      render: (record) => <StatusTag status={record.hrRuleStatus} />,
    },
    {
      key: 'annual',
      header: 'Trừ phép năm',
      width: 122,
      align: 'center',
      render: (record) => (
        <Text size="sm">{record.deductsAnnualLeave ? 'Có' : 'Không'}</Text>
      ),
    },
    {
      key: 'attachment',
      header: 'Chứng từ',
      width: 112,
      align: 'center',
      render: (record) => (
        <Text size="sm">{record.requiresAttachment ? 'Bắt buộc' : 'Không'}</Text>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Quản lý nghỉ phép"
        subtitle="Theo dõi trạng thái đơn và quy tắc ký hiệu nghỉ phép trước khi đối chiếu bảng công. Tạo và xử lý đơn thực hiện trên Hacom Chat."
      />

      <Stack gap="sm">
        <SectionCard
          title="Danh sách đơn nghỉ phép"
          count={`${data.pagination.total} đơn`}
          flushHeader
        >
          <Stack gap="xs" px="sm" pb="sm">
            <FilterBar>
              <Select
                aria-label="Nhân viên"
                placeholder="Nhân viên"
                data={employeeOptions}
                value={selectedEmployee?.value ?? null}
                clearable
                searchable
                size="sm"
                className={filterStyles.fieldWide}
                nothingFoundMessage={
                  employeesQuery.isFetching
                    ? 'Đang tải nhân viên...'
                    : 'Không tìm thấy nhân viên'
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
                placeholder="Loại nghỉ"
                data={leaveTypeOptions}
                value={params.leaveType ?? null}
                clearable
                size="sm"
                className={filterStyles.fieldWide}
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
                placeholder="Trạng thái"
                data={statusOptions}
                value={params.status ?? null}
                clearable
                size="sm"
                className={filterStyles.field}
                onChange={(value) =>
                  setParams((current) => ({
                    ...current,
                    page: 1,
                    status: value ?? undefined,
                  }))
                }
              />
            </FilterBar>

            <DataTable
              data={data.items}
              columns={requestColumns}
              rowKey={(record) => record.id}
              meta={data.pagination}
              onPageChange={(page, pageSize) =>
                setParams((current) => ({ ...current, page, pageSize }))
              }
              emptyTitle="Chưa có đơn nghỉ phép"
              emptyDescription="Đơn được tạo và xử lý trên Hacom Chat, sau đó hiển thị tại đây."
            />
          </Stack>
        </SectionCard>

        <SectionCard
          title="Danh mục ký hiệu nghỉ phép"
          count={`${leaveTypes.length} ký hiệu`}
          description="Ký hiệu dùng khi đối chiếu bảng công tháng."
          flushHeader
        >
          <Stack gap="xs" px="sm" pb="sm">
            <DataTable
              data={pagedLeaveTypes}
              columns={catalogColumns}
              rowKey={(record) => record.id}
              loading={isLeaveTypesLoading}
              meta={catalogMeta}
              onPageChange={(page) => setCatalogPage(page)}
              emptyTitle="Chưa có ký hiệu nghỉ phép"
            />
          </Stack>
        </SectionCard>
      </Stack>

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
    </>
  );
}
