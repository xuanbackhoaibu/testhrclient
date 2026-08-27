import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Drawer,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';

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
  if (record.noticeActualDays == null && record.noticeRequiredDays == null) {
    return '-';
  }
  const actual = record.noticeActualDays ?? '-';
  const required = record.noticeRequiredDays ?? '-';
  return record.lateSubmission ? `Trễ hạn (${actual}/${required})` : `Đúng hạn (${actual}/${required})`;
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
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    title: string;
    employeeName?: string;
  } | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    employeeId: undefined as string | undefined,
    leaveType: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  const { data, isLoading, error, refetch, isFetching } = useLeaveRequests(params);
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
      if (selectedLeave?.id === record.id) {
        setSelectedLeave(null);
      }
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
      minWidth: 200,
      render: (record) => {
        const name = record.employeeName ?? record.employee?.fullName ?? record.employeeId;
        const code = record.employee?.employeeCode ?? record.employeeId;
        return (
          <Group gap="xs" wrap="nowrap">
            <Avatar radius="xl" size={32} color="blue">
              {getInitials(name)}
            </Avatar>
            <Stack gap={1}>
              <Text size="sm" fw={600} lineClamp={1}>
                {name}
              </Text>
              <Text size="xs" c="dimmed">
                {code}
              </Text>
            </Stack>
          </Group>
        );
      },
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
      width: 110,
      render: (record) => (
        <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(record.startDate)}
        </Text>
      ),
    },
    {
      key: 'endDate',
      header: 'Đến ngày',
      width: 110,
      render: (record) => (
        <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(record.endDate)}
        </Text>
      ),
    },
    {
      key: 'session',
      header: 'Buổi nghỉ',
      width: 120,
      render: (record) => (
        <Text size="sm">{sessionRangeLabel(record)}</Text>
      ),
    },
    {
      key: 'totalDays',
      header: 'Số ngày',
      width: 90,
      align: 'right',
      render: (record) => (
        <Text size="sm" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {record.totalDays ?? '-'}
        </Text>
      ),
    },
    {
      key: 'notice',
      header: 'Báo trước',
      width: 130,
      render: (record) => (
        <Text
          size="sm"
          c={record.lateSubmission ? 'orange.7' : undefined}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {noticeLabel(record)}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 160,
      render: (record) => (
        <Group gap={6} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
          <StatusTag status={record.status} />
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
      minWidth: 180,
      render: (record) => (
        <Text size="xs" c="dimmed">
          {approvalLabel(currentApprovalStep(record))}
        </Text>
      ),
    },
  ];

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
        <Text size="sm" fw={700}>
          {record.displaySymbol}
        </Text>
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
      width: 125,
      align: 'center',
      render: (record) => (
        <Text size="sm">{record.deductsAnnualLeave ? 'Có' : 'Không'}</Text>
      ),
    },
    {
      key: 'attachment',
      header: 'Chứng từ',
      minWidth: 130,
      align: 'center',
      render: (record) => {
        if (!record.requiresAttachment) {
          return <Text size="sm" c="dimmed">Không</Text>;
        }
        return (
          <Text size="sm" c="blue.7" fw={500}>
            {record.attachmentMinDays ? `Bắt buộc (≥ ${record.attachmentMinDays} ngày)` : 'Bắt buộc'}
          </Text>
        );
      },
    },
  ];

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <Text size="xs" c="dimmed">
          Theo dõi trạng thái đơn và quy tắc ký hiệu nghỉ phép trước khi đối chiếu bảng công. Tạo và xử lý đơn thực hiện trên Hacom Chat.
        </Text>

        <SegmentedControl
          size="xs"
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'requests' | 'catalog')}
          data={[
            {
              value: 'requests',
              label: `Đơn nghỉ phép (${data.pagination.total})`,
            },
            {
              value: 'catalog',
              label: `Bảng ký hiệu (${leaveTypes.length})`,
            },
          ]}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <Group justify="flex-start" align="baseline" gap="xs" px="md" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <Text size="sm" fw={500}>
            {activeTab === 'requests' ? 'Danh sách đơn nghỉ phép' : 'Danh mục ký hiệu nghỉ phép'}
          </Text>
          <Text size="xs" c="dimmed">
            {activeTab === 'requests' ? `${data.pagination.total} đơn` : `${leaveTypes.length} ký hiệu`}
          </Text>
        </Group>

        {activeTab === 'requests' && (
          <Group justify="space-between" px="md" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
            <Group gap="xs" wrap="wrap" style={{ flex: 1 }}>
              <Select
                aria-label="Nhân viên"
                placeholder="Chọn nhân viên"
                data={employeeOptions}
                value={selectedEmployee?.value ?? null}
                clearable
                searchable
                size="xs"
                w={240}
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
                w={180}
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
                w={150}
                onChange={(value) =>
                  setParams((current) => ({
                    ...current,
                    page: 1,
                    status: value ?? undefined,
                  }))
                }
              />
            </Group>

            <Group gap="xs">
              {activeFilterCount > 0 && (
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={handleClearFilters}
                >
                  Xóa lọc ({activeFilterCount})
                </Button>
              )}

              <Button
                size="xs"
                variant="default"
                loading={isFetching}
                onClick={() => void refetch()}
              >
                Làm mới
              </Button>
            </Group>
          </Group>
        )}

        {activeTab === 'requests' ? (
          <DataTable
            data={data.items}
            columns={requestColumns}
            rowKey={(record) => record.id}
            meta={data.pagination}
            onRowClick={(record) => setSelectedLeave(record)}
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
      </Paper>

      <Drawer
        opened={selectedLeave !== null}
        onClose={() => setSelectedLeave(null)}
        position="right"
        size="md"
        title={<Text fw={700} size="sm">Chi tiết đơn nghỉ phép</Text>}
      >
        {selectedLeave && (
          <Stack gap="md">
            <Paper withBorder p="sm" radius="md">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <Avatar radius="xl" size={40} color="blue">
                    {getInitials(selectedLeave.employeeName ?? selectedLeave.employee?.fullName)}
                  </Avatar>
                  <Stack gap={1}>
                    <Text fw={700} size="sm">
                      {selectedLeave.employeeName ?? selectedLeave.employee?.fullName ?? selectedLeave.employeeId}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Mã nhân sự: {selectedLeave.employee?.employeeCode ?? selectedLeave.employeeId}
                    </Text>
                  </Stack>
                </Group>
                <StatusTag status={selectedLeave.status} />
              </Group>
            </Paper>

            <Paper withBorder p="sm" radius="md">
              <Text fw={700} size="xs" mb="xs">
                Thông tin nghỉ phép
              </Text>
              <SimpleGrid cols={2} spacing="xs">
                <Stack gap={1}>
                  <Text size="xs" c="dimmed">Loại nghỉ</Text>
                  <Text size="xs" fw={600}>
                    {labelFrom(LEAVE_TYPE_LABELS, selectedLeave.leaveType)}
                  </Text>
                </Stack>

                <Stack gap={1}>
                  <Text size="xs" c="dimmed">Tổng số ngày</Text>
                  <Text size="xs" fw={600}>
                    {selectedLeave.totalDays != null ? `${selectedLeave.totalDays} ngày` : '-'}
                  </Text>
                </Stack>

                <Stack gap={1}>
                  <Text size="xs" c="dimmed">Thời gian nghỉ</Text>
                  <Text size="xs" fw={600}>
                    {formatDate(selectedLeave.startDate)} → {formatDate(selectedLeave.endDate)}
                  </Text>
                </Stack>

                <Stack gap={1}>
                  <Text size="xs" c="dimmed">Buổi nghỉ</Text>
                  <Text size="xs" fw={600}>
                    {sessionRangeLabel(selectedLeave)}
                  </Text>
                </Stack>

                <Stack gap={1}>
                  <Text size="xs" c="dimmed">Hạn báo trước</Text>
                  <Text size="xs" fw={600}>
                    {noticeLabel(selectedLeave)}
                  </Text>
                </Stack>
              </SimpleGrid>
            </Paper>

            <Paper withBorder p="sm" radius="md">
              <Text fw={700} size="xs" mb="xs">
                Lý do xin nghỉ
              </Text>
              <Paper p="xs" radius="sm" bg="gray.0">
                <Text size="xs" c="gray.8">
                  {selectedLeave.reason ? selectedLeave.reason : 'Không có ghi chú lý do.'}
                </Text>
              </Paper>
            </Paper>

            <Paper withBorder p="sm" radius="md">
              <Text fw={700} size="xs" mb="xs">
                Chứng từ đính kèm
              </Text>
              {selectedLeave.attachmentUrl ? (
                <Paper p="xs" radius="sm" bg="gray.0">
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" fw={500} lineClamp={1} style={{ flex: 1 }}>
                      {selectedLeave.attachmentUrl.split('/').pop() || 'Tệp chứng từ đính kèm'}
                    </Text>
                    <Button
                      size="xs"
                      variant="filled"
                      color="blue"
                      onClick={() =>
                        setPreviewAttachment({
                          url: selectedLeave.attachmentUrl!,
                          title: `Chứng từ: ${labelFrom(LEAVE_TYPE_LABELS, selectedLeave.leaveType)}`,
                          employeeName:
                            selectedLeave.employeeName ??
                            selectedLeave.employee?.fullName ??
                            selectedLeave.employeeId,
                        })
                      }
                    >
                      Xem
                    </Button>
                  </Group>
                </Paper>
              ) : (
                <Text size="xs" c="dimmed">
                  Không có tệp chứng từ đính kèm.
                </Text>
              )}
            </Paper>

            <Paper withBorder p="sm" radius="md">
              <Text fw={700} size="xs" mb="xs">
                Tiến trình phê duyệt
              </Text>
              {selectedLeave.approvalSteps && selectedLeave.approvalSteps.length > 0 ? (
                <Stack gap="xs">
                  {selectedLeave.approvalSteps.map((step) => (
                    <Paper key={step.id || step.stepOrder} p="xs" radius="sm" withBorder bg="gray.0">
                      <Group justify="space-between" wrap="nowrap" mb={2}>
                        <Text size="xs" fw={600}>
                          Cấp {step.stepOrder}: {labelFrom(APPROVAL_STEP_LABELS, step.stepCode) || step.stepName}
                        </Text>
                        <StatusTag status={step.status} />
                      </Group>
                      {step.note ? (
                        <Text size="xs" c="dimmed">Ghi chú: {step.note}</Text>
                      ) : null}
                      {step.reviewedAt ? (
                        <Text size="xs" c="dimmed">
                          Duyệt lúc: {formatDate(step.reviewedAt)}
                        </Text>
                      ) : null}
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Text size="xs" c="dimmed">
                  Chưa có thông tin các cấp phê duyệt.
                </Text>
              )}
            </Paper>
          </Stack>
        )}
      </Drawer>

      <Modal
        opened={previewAttachment !== null}
        onClose={() => setPreviewAttachment(null)}
        title={
          <Text fw={700} size="sm">
            {previewAttachment?.title ?? 'Chi tiết chứng từ đính kèm'}
          </Text>
        }
        size="lg"
        centered
      >
        {previewAttachment && (
          <Stack gap="sm">
            <Group justify="space-between" wrap="nowrap">
              <Text size="xs" c="dimmed">
                Nhân sự: <strong>{previewAttachment.employeeName ?? '-'}</strong>
              </Text>
              <a
                href={previewAttachment.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '11px', color: 'var(--mantine-color-blue-6)', textDecoration: 'none', fontWeight: 600 }}
              >
                Mở file gốc ↗
              </a>
            </Group>
            <Box
              style={{
                background: 'var(--mantine-color-gray-0)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                border: '1px solid var(--mantine-color-gray-3)',
              }}
            >
              <img
                src={previewAttachment.url}
                alt="Chứng từ đính kèm"
                style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '4px' }}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <Text size="xs" c="dimmed" mt={6} style={{ wordBreak: 'break-all' }}>
                {previewAttachment.url}
              </Text>
            </Box>
          </Stack>
        )}
      </Modal>

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
    </Stack>
  );
}
