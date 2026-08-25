import { useMemo, useState } from 'react';
import { ActionIcon, Button, Drawer, Group, NumberInput, Select, SimpleGrid, Stack, Switch, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';

import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { useAuth } from '../../features/auth/useAuth';

import type {
  LeaveApprovalStep,
  LeavePolicyType,
  LeavePolicyTypePayload,
  LeaveQuotaMode,
  LeaveRequest,
} from '../../features/leave/leaveTypes';
import { useCreateLeaveType, useDeleteCancelledLeaveRequest, useDeleteLeaveType, useLeaveRequests, useLeaveTypes, useUpdateLeaveType } from '../../features/leave/useLeaveRequests';
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
import { TableActionsMenu } from '../../shared/components/TableActionsMenu';
import { formatDate } from '../../shared/utils/date';
const EMPLOYEE_SELECT_PAGE_SIZE = 20;
const CATALOG_PAGE_SIZE = 10;

type EmployeeSelectOption = {
  value: string;
  label: string;
};

type LeaveTypeFormValues = {
  name: string;
  displaySymbol: string;
  deductsAnnualLeave: boolean;
  paid: 'PAID' | 'UNPAID' | 'UNSET';
  dayValue: number | string;
  requiresAttachment: boolean;
  attachmentMinDays: number | string;
  quotaMode: LeaveQuotaMode;
  maxDaysPerEvent: number | string;
  hrRuleStatus: 'CONFIRMED' | 'PENDING_HR_RULE';
  note: string;
};

const EMPTY_LEAVE_TYPE_FORM: LeaveTypeFormValues = {
  name: '',
  displaySymbol: '',
  deductsAnnualLeave: false,
  paid: 'UNSET',
  dayValue: '',
  requiresAttachment: false,
  attachmentMinDays: '',
  quotaMode: 'NONE',
  maxDaysPerEvent: '',
  hrRuleStatus: 'CONFIRMED',
  note: '',
};

const PAID_OPTIONS = [
  { value: 'PAID', label: 'Có lương' },
  { value: 'UNPAID', label: 'Không lương' },
  { value: 'UNSET', label: 'Chưa chốt' },
];

const HR_RULE_OPTIONS = [
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PENDING_HR_RULE', label: 'Chờ HR chốt' },
];

function nullableNumber(value: number | string): number | null {
  return typeof value === 'number' ? value : null;
}

function optionalRangeError(value: number | string, max: number) {
  return typeof value === 'number' && (value < 0 || value > max)
    ? `Giá trị phải từ 0 đến ${max}.`
    : null;
}

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

const QUOTA_MODE_OPTIONS = Object.entries(QUOTA_MODE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

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
  return record.name || labelFrom(LEAVE_TYPE_LABELS, record.code);
}

function leaveTypeFormValues(record: LeavePolicyType): LeaveTypeFormValues {
  return {
    name: record.name,
    displaySymbol: record.displaySymbol,
    deductsAnnualLeave: record.deductsAnnualLeave,
    paid: record.paid === true ? 'PAID' : record.paid === false ? 'UNPAID' : 'UNSET',
    dayValue: record.dayValue ?? '',
    requiresAttachment: record.requiresAttachment,
    attachmentMinDays: record.attachmentMinDays ?? '',
    quotaMode: record.quotaMode as LeaveQuotaMode,
    maxDaysPerEvent: record.maxDaysPerEvent ?? '',
    hrRuleStatus:
      record.hrRuleStatus === 'PENDING_HR_RULE'
        ? 'PENDING_HR_RULE'
        : 'CONFIRMED',
    note: record.note ?? '',
  };
}

function leaveTypeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('LEAVE_POLICY_TYPE_SYMBOL_ALREADY_EXISTS')) {
    return 'Ký hiệu này đã tồn tại. Hãy chọn ký hiệu khác.';
  }
  if (message.includes('LEAVE_POLICY_TYPE_CODE_ALREADY_EXISTS')) {
    return 'Không thể tạo ký hiệu lúc này. Hãy thử lại.';
  }
  if (message.includes('LEAVE_APPROVAL_CONFIGURATION_SCOPE_DENIED')) {
    return 'Tài khoản không có phạm vi toàn hệ thống để sửa danh mục này.';
  }
  if (message.includes('LEAVE_POLICY_TYPE_NOT_FOUND')) {
    return 'Ký hiệu không còn tồn tại hoặc đã được người khác xóa.';
  }
  return 'Không thể lưu thay đổi. Kiểm tra dữ liệu và thử lại.';
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
  const canManageCatalog = can(HR_PERMISSIONS.LEAVE_UPDATE);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSelectOption | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<LeaveRequest | null>(null);
  const [editingLeaveType, setEditingLeaveType] = useState<LeavePolicyType | null>(null);
  const [deletingLeaveType, setDeletingLeaveType] = useState<LeavePolicyType | null>(null);
  const [leaveTypeDrawerOpened, setLeaveTypeDrawerOpened] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    employeeId: undefined as string | undefined,
    leaveType: undefined as string | undefined,
    status: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = useLeaveRequests(params);
  const leaveTypesQuery = useLeaveTypes();
  const leaveTypes = leaveTypesQuery.data ?? [];
  const deleteCancelledLeaveRequest = useDeleteCancelledLeaveRequest();
  const createLeaveType = useCreateLeaveType();
  const updateLeaveType = useUpdateLeaveType();
  const deleteLeaveType = useDeleteLeaveType();
  const leaveTypeForm = useForm<LeaveTypeFormValues>({
    initialValues: EMPTY_LEAVE_TYPE_FORM,
    validateInputOnBlur: true,
    validate: {
      name: (value) =>
        value.trim() && value.trim().length <= 120
          ? null
          : 'Nhập tên ký hiệu, tối đa 120 ký tự.',
      displaySymbol: (value) =>
        value.trim() && !/[;\s]/u.test(value) && value.length <= 12
          ? null
          : 'Ký hiệu không có khoảng trắng hoặc dấu chấm phẩy.',
      dayValue: (value) => optionalRangeError(value, 1),
      attachmentMinDays: (value) => optionalRangeError(value, 365),
      maxDaysPerEvent: (value) => optionalRangeError(value, 365),
    },
  });
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
  function closeLeaveTypeDrawer() {
    setLeaveTypeDrawerOpened(false);
    setEditingLeaveType(null);
    leaveTypeForm.reset();
  }

  function openCreateLeaveType() {
    setEditingLeaveType(null);
    leaveTypeForm.setValues(EMPTY_LEAVE_TYPE_FORM);
    leaveTypeForm.resetDirty();
    setLeaveTypeDrawerOpened(true);
  }

  function openEditLeaveType(record: LeavePolicyType) {
    setEditingLeaveType(record);
    leaveTypeForm.setValues(leaveTypeFormValues(record));
    leaveTypeForm.resetDirty();
    setLeaveTypeDrawerOpened(true);
  }

  async function handleSaveLeaveType(values: LeaveTypeFormValues) {
    const payload: LeavePolicyTypePayload = {
      name: values.name.trim(),
      displaySymbol: values.displaySymbol.trim(),
      deductsAnnualLeave: values.deductsAnnualLeave,
      paid:
        values.paid === 'PAID'
          ? true
          : values.paid === 'UNPAID'
            ? false
            : null,
      dayValue: nullableNumber(values.dayValue),
      requiresAttachment: values.requiresAttachment,
      attachmentMinDays: values.requiresAttachment
        ? nullableNumber(values.attachmentMinDays)
        : null,
      quotaMode: values.quotaMode,
      maxDaysPerEvent:
        values.quotaMode === 'PER_EVENT'
          ? nullableNumber(values.maxDaysPerEvent)
          : null,
      hrRuleStatus: values.hrRuleStatus,
      note: values.note.trim() || null,
    };

    try {
      if (editingLeaveType) {
        await updateLeaveType.mutateAsync({
          id: editingLeaveType.id,
          payload,
        });
      } else {
        await createLeaveType.mutateAsync(payload);
        setCatalogPage(1);
      }
      notifications.show({
        color: 'green',
        title: editingLeaveType ? 'Đã cập nhật ký hiệu' : 'Đã thêm ký hiệu',
        message: `${payload.displaySymbol} · ${payload.name} đã được lưu.`,
      });
      closeLeaveTypeDrawer();
    } catch (saveError) {
      notifications.show({
        color: 'red',
        title: 'Không lưu được ký hiệu',
        message: leaveTypeErrorMessage(saveError),
      });
    }
  }

  async function handleDeleteLeaveType() {
    if (!deletingLeaveType) return;
    try {
      await deleteLeaveType.mutateAsync(deletingLeaveType.id);
      notifications.show({
        color: 'green',
        title: 'Đã xóa ký hiệu',
        message: `${deletingLeaveType.displaySymbol} đã được ngừng sử dụng và ẩn khỏi danh mục.`,
      });
      setDeletingLeaveType(null);
    } catch (deleteError) {
      notifications.show({
        color: 'red',
        title: 'Không xóa được ký hiệu',
        message: leaveTypeErrorMessage(deleteError),
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
  if (canManageCatalog) {
    catalogColumns.push({
      key: 'actions',
      header: '',
      width: 96,
      align: 'right',
      render: (record) => (
        <TableActionsMenu
          label={`Thao tác ký hiệu ${record.displaySymbol}`}
          actions={[
            {
              label: `Chỉnh sửa ${record.displaySymbol}`,
              icon: <IconEdit size={16} />,
              onClick: () => openEditLeaveType(record),
            },
            {
              label: `Xóa ${record.displaySymbol}`,
              icon: <IconTrash size={16} />,
              color: 'red',
              onClick: () => setDeletingLeaveType(record),
            },
          ]}
        />
      ),
    });
  }


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
          actions={
            canManageCatalog ? (
              <Button
                size="sm"
                leftSection={<IconPlus size={16} />}
                onClick={openCreateLeaveType}
              >
                Thêm ký hiệu
              </Button>
            ) : null
          }
          flushHeader
        >
          <Stack gap="xs" px="sm" pb="sm">
            <DataTable
              data={pagedLeaveTypes}
              columns={catalogColumns}
              rowKey={(record) => record.id}
              loading={leaveTypesQuery.isLoading}
              error={leaveTypesQuery.error}
              onRetry={() => void leaveTypesQuery.refetch()}
              meta={catalogMeta}
              onPageChange={(page) => setCatalogPage(page)}
              emptyTitle="Chưa có ký hiệu nghỉ phép"
            />
          </Stack>
        </SectionCard>
      </Stack>

      <Drawer
        opened={leaveTypeDrawerOpened}
        onClose={closeLeaveTypeDrawer}
        title={
          editingLeaveType
            ? `Chỉnh sửa ký hiệu ${editingLeaveType.displaySymbol}`
            : 'Thêm ký hiệu nghỉ phép'
        }
        position="right"
        size="lg"
      >
        <form
          onSubmit={leaveTypeForm.onSubmit((values) =>
            void handleSaveLeaveType(values),
          )}
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Ký hiệu được dùng khi đối chiếu và giải thích bảng công. Hãy chọn
              ký hiệu ngắn gọn và dễ nhận biết.
            </Text>

            <TextInput
              label="Ký hiệu"
              placeholder="P"
              description="Tối đa 12 ký tự, không có khoảng trắng hoặc dấu ;"
              withAsterisk
              maxLength={12}
              {...leaveTypeForm.getInputProps('displaySymbol')}
            />

            <TextInput
              label="Tên ký hiệu"
              placeholder="Nghỉ phép năm"
              withAsterisk
              maxLength={120}
              {...leaveTypeForm.getInputProps('name')}
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
                label="Tính lương"
                data={PAID_OPTIONS}
                allowDeselect={false}
                value={leaveTypeForm.values.paid}
                onChange={(value) =>
                  leaveTypeForm.setFieldValue(
                    'paid',
                    (value ?? 'UNSET') as LeaveTypeFormValues['paid'],
                  )
                }
              />
              <NumberInput
                label="Giá trị ngày"
                placeholder="Chưa chốt"
                min={0}
                max={1}
                step={0.5}
                decimalScale={2}
                {...leaveTypeForm.getInputProps('dayValue')}
              />
            </SimpleGrid>

            <Select
              label="Quỹ phép"
              data={QUOTA_MODE_OPTIONS}
              allowDeselect={false}
              value={leaveTypeForm.values.quotaMode}
              onChange={(value) =>
                leaveTypeForm.setFieldValue(
                  'quotaMode',
                  (value ?? 'NONE') as LeaveQuotaMode,
                )
              }
            />

            {leaveTypeForm.values.quotaMode === 'PER_EVENT' ? (
              <NumberInput
                label="Số ngày tối đa mỗi sự kiện"
                placeholder="Không giới hạn"
                min={0}
                max={365}
                step={0.5}
                decimalScale={2}
                {...leaveTypeForm.getInputProps('maxDaysPerEvent')}
              />
            ) : null}

            <Switch
              label="Trừ vào quỹ phép năm"
              description="Bật khi ký hiệu làm giảm số ngày phép năm còn lại."
              {...leaveTypeForm.getInputProps('deductsAnnualLeave', {
                type: 'checkbox',
              })}
            />

            <Switch
              label="Bắt buộc có chứng từ"
              description="Áp dụng cho nghỉ ốm, thai sản hoặc chính sách cần hồ sơ."
              {...leaveTypeForm.getInputProps('requiresAttachment', {
                type: 'checkbox',
              })}
            />

            {leaveTypeForm.values.requiresAttachment ? (
              <NumberInput
                label="Bắt buộc chứng từ từ số ngày"
                placeholder="Áp dụng cho mọi thời lượng"
                min={0}
                max={365}
                step={0.5}
                decimalScale={2}
                {...leaveTypeForm.getInputProps('attachmentMinDays')}
              />
            ) : null}

            <Select
              label="Quy tắc HR"
              data={HR_RULE_OPTIONS}
              allowDeselect={false}
              value={leaveTypeForm.values.hrRuleStatus}
              onChange={(value) =>
                leaveTypeForm.setFieldValue(
                  'hrRuleStatus',
                  (value ?? 'CONFIRMED') as LeaveTypeFormValues['hrRuleStatus'],
                )
              }
            />

            <Textarea
              label="Ghi chú"
              placeholder="Mô tả điều kiện áp dụng hoặc nội dung HR cần chốt"
              minRows={3}
              autosize
              maxLength={500}
              {...leaveTypeForm.getInputProps('note')}
            />

            <Group justify="flex-end" mt="xs">
              <Button
                type="button"
                variant="default"
                onClick={closeLeaveTypeDrawer}
                disabled={createLeaveType.isPending || updateLeaveType.isPending}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                loading={createLeaveType.isPending || updateLeaveType.isPending}
              >
                {editingLeaveType ? 'Lưu thay đổi' : 'Thêm ký hiệu'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <ConfirmActionModal
        opened={deletingLeaveType !== null}
        title={`Xóa ký hiệu ${deletingLeaveType?.displaySymbol ?? ''}?`}
        message="Ký hiệu sẽ ngừng sử dụng và biến mất khỏi danh mục. Dữ liệu quỹ phép và lịch sử liên quan vẫn được giữ nguyên."
        confirmLabel="Xóa khỏi danh mục"
        loading={deleteLeaveType.isPending}
        onClose={() => setDeletingLeaveType(null)}
        onConfirm={() => void handleDeleteLeaveType()}
      />

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
