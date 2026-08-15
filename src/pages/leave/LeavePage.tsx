import { useMemo, useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { Button, Card, Col, message, Popconfirm, Row, Select, Space, Table, Typography } from 'antd';

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
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate } from '../../shared/utils/date';

const { Text } = Typography;
const EMPLOYEE_SELECT_PAGE_SIZE = 20;

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
      message.success('Đã xóa đơn nghỉ phép đã hủy.');
    } catch {
      message.error('Không xóa được đơn. Đơn chỉ được xóa khi đã hủy.');
    }
  }

  const requestColumns: TableColumnsType<LeaveRequest> = [
    {
      title: 'Nhân viên',
      width: 220,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.employeeName ?? record.employee?.fullName ?? record.employeeId}</Text>
          <Text type="secondary">{record.employee?.employeeCode ?? record.employeeId}</Text>
        </Space>
      ),
    },
    {
      title: 'Loại nghỉ',
      dataIndex: 'leaveType',
      width: 170,
      render: (value: string) => labelFrom(LEAVE_TYPE_LABELS, value),
    },
    { title: 'Từ ngày', width: 120, render: (_, record) => formatDate(record.startDate) },
    { title: 'Đến ngày', width: 120, render: (_, record) => formatDate(record.endDate) },
    { title: 'Buổi nghỉ', width: 170, render: (_, record) => sessionRangeLabel(record) },
    { title: 'Số ngày', dataIndex: 'totalDays', width: 95 },
    { title: 'Báo trước', width: 130, render: (_, record) => noticeLabel(record) },
    {
      title: 'Trạng thái',
      width: 150,
      render: (_, record) => (
        <Space size={4}>
          <StatusTag status={record.status} />
          {record.status === 'CANCELLED' && canDeleteCancelled ? (
            <Popconfirm
              title='Xóa đơn đã hủy?'
              description='Đơn sẽ bị xóa khỏi danh sách và không thể khôi phục.'
              okText='Xóa'
              cancelText='Hủy'
              okButtonProps={{ danger: true, loading: deleteCancelledLeaveRequest.isPending }}
              onConfirm={() => handleDeleteCancelledRequest(record)}
            >
              <Button
                type='text'
                danger
                size='small'
                icon={<DeleteOutlined />}
                aria-label={'Xóa đơn nghỉ phép đã hủy của ' + (record.employeeName ?? record.employee?.fullName ?? record.employeeId)}
                disabled={deleteCancelledLeaveRequest.isPending}
              />
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
    { title: 'Luồng duyệt', width: 220, render: (_, record) => approvalLabel(currentApprovalStep(record)) },
  ];

  const catalogColumns: TableColumnsType<LeavePolicyType> = [
    {
      title: 'Ký hiệu',
      dataIndex: 'displaySymbol',
      width: 90,
      render: (value: string) => <Text strong>{value}</Text>,
    },
    { title: 'Mã', dataIndex: 'code', width: 160 },
    {
      title: 'Tên ký hiệu',
      width: 260,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text>{policyName(record)}</Text>
          {record.note ? <Text type="secondary">{record.note}</Text> : null}
        </Space>
      ),
    },
    { title: 'Giá trị ngày', width: 120, render: (_, record) => record.dayValue ?? '-' },
    {
      title: 'Quỹ phép',
      dataIndex: 'quotaMode',
      width: 190,
      render: (value: string) => labelFrom(QUOTA_MODE_LABELS, value),
    },
    { title: 'Quy tắc HR', width: 160, render: (_, record) => <StatusTag status={record.hrRuleStatus} /> },
    { title: 'Trừ phép năm', width: 140, render: (_, record) => (record.deductsAnnualLeave ? 'Có' : 'Không') },
    { title: 'Chứng từ', width: 130, render: (_, record) => (record.requiresAttachment ? 'Bắt buộc' : 'Không') },
  ];

  return (
    <>
      <PageHeader
        title="Quản lý nghỉ phép"
        subtitle="Theo dõi trạng thái đơn và quy tắc ký hiệu nghỉ phép trước khi đối chiếu bảng công. Tạo và xử lý đơn thực hiện trên Hacom Chat."
      />

      <Card className="page-card leave-page-card" title="Danh sách đơn nghỉ phép">
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Select
                allowClear
                showSearch
                placeholder="Nhân viên"
                style={{ width: '100%' }}
                optionFilterProp="label"
                filterOption={false}
                loading={employeesQuery.isFetching}
                notFoundContent={employeesQuery.isFetching ? 'Đang tải nhân viên...' : 'Không tìm thấy nhân viên'}
                options={employeeOptions}
                onClear={() => setEmployeeSearch('')}
                onSearch={setEmployeeSearch}
                onChange={(value) => {
                  setSelectedEmployee(employeeOptions.find((option) => option.value === value) ?? null);
                  setParams((current) => ({ ...current, page: 1, employeeId: value }));
                }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Select
                allowClear
                placeholder="Loại nghỉ"
                style={{ width: '100%' }}
                options={leaveTypeOptions}
                onChange={(value) => setParams((current) => ({ ...current, page: 1, leaveType: value }))}
              />
            </Col>
            <Col xs={24} md={8}>
              <Select
                allowClear
                placeholder="Trạng thái"
                style={{ width: '100%' }}
                options={statusOptions}
                onChange={(value) => setParams((current) => ({ ...current, page: 1, status: value }))}
              />
            </Col>
          </Row>

          <Table
            rowKey="id"
            dataSource={data.items}
            columns={requestColumns}
            scroll={{ x: 1650 }}
            locale={{ emptyText: 'Chưa có đơn nghỉ phép' }}
            pagination={{
              current: data.pagination.page,
              pageSize: data.pagination.pageSize,
              total: data.pagination.total,
              showSizeChanger: true,
              onChange: (page, pageSize) => setParams((current) => ({ ...current, page, pageSize })),
            }}
          />
        </Space>
      </Card>

      <Card className="page-card leave-page-card" title="Danh mục ký hiệu nghỉ phép" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          dataSource={leaveTypes}
          loading={isLeaveTypesLoading}
          columns={catalogColumns}
          scroll={{ x: 1250 }}
          locale={{ emptyText: 'Chưa có ký hiệu nghỉ phép' }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </Card>

    </>
  );
}
