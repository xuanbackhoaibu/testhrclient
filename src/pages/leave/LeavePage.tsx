import { useState } from 'react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  rejectLeaveRequest,
  submitLeaveRequest,
} from '../../features/leave/leaveApi';
import type {
  LeaveApprovalStep,
  LeavePolicyType,
  LeaveRequest,
  LeaveRequestPayload,
} from '../../features/leave/leaveTypes';
import { useLeaveRequests, useLeaveTypes } from '../../features/leave/useLeaveRequests';
import { getLeaveDurationErrorMessage } from '../../features/leave/leaveDurationErrorMessage';
import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { useAuth } from '../../features/auth/useAuth';
import { LEAVE_TYPE_OPTIONS } from '../../shared/constants/statuses';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { formatDate } from '../../shared/utils/date';

const { Text } = Typography;

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
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [form] = Form.useForm<LeaveRequestPayload>();
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    employeeId: undefined as string | undefined,
    leaveType: undefined as string | undefined,
    status: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = useLeaveRequests(params);
  const { data: leaveTypes = [], isLoading: isLeaveTypesLoading } = useLeaveTypes();

  const createMutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: async () => {
      message.success('Đã tạo đơn nghỉ phép.');
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
    onError: (error) => {
      message.error(
        getLeaveDurationErrorMessage(error) ?? 'Không tạo được đơn nghỉ phép. Kiểm tra lại thông tin và thử lại.',
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'submit' | 'approve' | 'reject' | 'cancel' }) => {
      switch (action) {
        case 'submit':
          return submitLeaveRequest(id);
        case 'approve':
          return approveLeaveRequest(id);
        case 'reject':
          return rejectLeaveRequest(id);
        default:
          return cancelLeaveRequest(id);
      }
    },
    onSuccess: async () => {
      message.success('Đã cập nhật trạng thái đơn nghỉ phép.');
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
    onError: () => {
      message.error('Không cập nhật được trạng thái đơn.');
    },
  });

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
    { title: 'Trạng thái', width: 150, render: (_, record) => <StatusTag status={record.status} /> },
    { title: 'Luồng duyệt', width: 220, render: (_, record) => approvalLabel(currentApprovalStep(record)) },
    {
      title: 'Thao tác',
      width: 280,
      render: (_, record) => (
        <Space wrap size={[8, 8]}>
          {record.status === 'DRAFT' && can(HR_PERMISSIONS.LEAVE_SUBMIT) ? (
            <Button
              size="small"
              icon={<SendOutlined />}
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ id: record.id, action: 'submit' })}
            >
              Trình duyệt
            </Button>
          ) : null}
          {record.status === 'SUBMITTED' && can(HR_PERMISSIONS.LEAVE_APPROVE) ? (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ id: record.id, action: 'approve' })}
            >
              Duyệt
            </Button>
          ) : null}
          {record.status === 'SUBMITTED' && can(HR_PERMISSIONS.LEAVE_REJECT) ? (
            <Button
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ id: record.id, action: 'reject' })}
            >
              Từ chối
            </Button>
          ) : null}
          {['DRAFT', 'SUBMITTED'].includes(record.status) && can(HR_PERMISSIONS.LEAVE_CANCEL) ? (
            <Button
              size="small"
              icon={<StopOutlined />}
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ id: record.id, action: 'cancel' })}
            >
              Hủy
            </Button>
          ) : null}
        </Space>
      ),
    },
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
        subtitle="Tạo đơn, trình duyệt và theo dõi quy tắc ký hiệu nghỉ phép trước khi đối chiếu bảng công."
        actions={
          can(HR_PERMISSIONS.LEAVE_CREATE) ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Tạo đơn
            </Button>
          ) : undefined
        }
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
                options={mockEmployees.map((item) => ({ value: item.id, label: item.fullName }))}
                onChange={(value) => setParams((current) => ({ ...current, page: 1, employeeId: value }))}
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

      <Drawer
        title="Tạo đơn nghỉ phép"
        open={open}
        size="large"
        destroyOnClose
        onClose={() => {
          setOpen(false);
          form.resetFields();
        }}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="primary" loading={createMutation.isPending} onClick={() => void form.submit()}>
              Lưu đơn
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true, message: 'Chọn nhân viên.' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={mockEmployees.map((item) => ({ value: item.id, label: item.fullName }))}
            />
          </Form.Item>
          <Form.Item name="leaveType" label="Loại nghỉ" rules={[{ required: true, message: 'Chọn loại nghỉ.' }]}>
            <Select options={leaveTypeOptions} />
          </Form.Item>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true, message: 'Nhập ngày bắt đầu.' }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="endDate"
                label="Đến ngày"
                rules={[
                  { required: true, message: 'Nhập ngày kết thúc.' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const startDate = getFieldValue('startDate');
                      if (!startDate || !value || !dayjs(value).isBefore(dayjs(startDate), 'day')) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.'));
                    },
                  }),
                ]}
              >
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="startHalfDaySession" label="Buổi bắt đầu" initialValue="FULL_DAY">
                <Select options={HALF_DAY_SESSION_OPTIONS.map((item) => ({ value: item.value, label: item.label }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="endHalfDaySession" label="Buổi kết thúc" initialValue="FULL_DAY">
                <Select options={HALF_DAY_SESSION_OPTIONS.map((item) => ({ value: item.value, label: item.label }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="totalDays" label="Tổng số ngày" rules={[{ required: true, type: 'number', min: 0.5, message: 'Tổng số ngày tối thiểu là 0.5.' }]}>
            <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Nhập lý do nghỉ phép.' }]}>
            <Input.TextArea rows={3} placeholder="Nhập lý do để lưu vết phê duyệt" />
          </Form.Item>
          <Form.Item name="attachmentUrl" label="Link chứng từ">
            <Input placeholder="Bắt buộc với nghỉ ốm từ 3 ngày theo quy tắc hiện tại" />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
