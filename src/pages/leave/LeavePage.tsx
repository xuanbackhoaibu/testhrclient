import { useState } from 'react';
import { Button, Card, Col, Drawer, Form, Input, InputNumber, Row, Select, Space, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { approveLeaveRequest, cancelLeaveRequest, createLeaveRequest, rejectLeaveRequest, submitLeaveRequest } from '../../features/leave/leaveApi';
import type { LeaveRequestPayload } from '../../features/leave/leaveTypes';
import { useLeaveRequests, useLeaveTypes } from '../../features/leave/useLeaveRequests';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { LEAVE_TYPE_OPTIONS } from '../../shared/constants/statuses';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate } from '../../shared/utils/date';
import { useAuth } from '../../features/auth/useAuth';
import { HR_PERMISSIONS } from '../../features/auth/permissions';

export function LeavePage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [form] = Form.useForm<LeaveRequestPayload>();
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState({ page: 1, pageSize: 10, employeeId: undefined as string | undefined, leaveType: undefined as string | undefined, status: undefined as string | undefined });
  const { data, isLoading, error, refetch } = useLeaveRequests(params);
  const { data: leaveTypes = [], isLoading: isLeaveTypesLoading } = useLeaveTypes();

  const createMutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: async () => {
      message.success('Đã tạo leave request.');
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
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
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const currentApprovalStep = (record: { status: string; approvalSteps?: Array<{ stepOrder: number; stepName: string; status: string }> }) =>
    record.status === 'SUBMITTED' ? (record.approvalSteps?.find((step) => step.status === 'SUBMITTED') ?? null) : null;

  return (
    <>
      <PageHeader title="Leave" subtitle="Leave workflow" actions={can(HR_PERMISSIONS.LEAVE_CREATE) ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Create</Button> : undefined} />
      <Card className="page-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Select allowClear placeholder="Employee" style={{ width: '100%' }} options={mockEmployees.map((item) => ({ value: item.id, label: item.fullName }))} onChange={(value) => setParams((current) => ({ ...current, employeeId: value }))} />
            </Col>
            <Col xs={24} md={8}>
              <Select allowClear placeholder="Leave type" style={{ width: '100%' }} options={LEAVE_TYPE_OPTIONS.map((item) => ({ value: item, label: item }))} onChange={(value) => setParams((current) => ({ ...current, leaveType: value }))} />
            </Col>
            <Col xs={24} md={8}>
              <Select allowClear placeholder="Status" style={{ width: '100%' }} options={['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'].map((item) => ({ value: item, label: item }))} onChange={(value) => setParams((current) => ({ ...current, status: value }))} />
            </Col>
          </Row>

          <Table
            rowKey="id"
            dataSource={data.items}
            pagination={{
              current: data.pagination.page,
              pageSize: data.pagination.pageSize,
              total: data.pagination.total,
              onChange: (page, pageSize) => setParams((current) => ({ ...current, page, pageSize })),
            }}
            columns={[
              {
                title: 'Employee',
                render: (_, record) => record.employeeName ?? record.employee?.fullName ?? record.employeeId,
              },
              { title: 'Type', dataIndex: 'leaveType' },
              { title: 'Start date', render: (_, record) => formatDate(record.startDate) },
              { title: 'End date', render: (_, record) => formatDate(record.endDate) },
              { title: 'Total days', dataIndex: 'totalDays' },
              { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
              {
                title: 'Approval',
                render: (_, record) => {
                  const step = currentApprovalStep(record);
                  return step ? `Cap ${step.stepOrder}: ${step.stepName}` : '-';
                },
              },
              {
                title: 'Actions',
                render: (_, record) => (
                  <Space wrap>
                    {record.status === 'DRAFT' && can(HR_PERMISSIONS.LEAVE_SUBMIT) ? <Button onClick={() => statusMutation.mutate({ id: record.id, action: 'submit' })}>Submit</Button> : null}
                    {record.status === 'SUBMITTED' && can(HR_PERMISSIONS.LEAVE_APPROVE) ? <Button onClick={() => statusMutation.mutate({ id: record.id, action: 'approve' })}>Approve</Button> : null}
                    {record.status === 'SUBMITTED' && can(HR_PERMISSIONS.LEAVE_REJECT) ? <Button danger onClick={() => statusMutation.mutate({ id: record.id, action: 'reject' })}>Reject</Button> : null}
                    {['DRAFT', 'SUBMITTED'].includes(record.status) && can(HR_PERMISSIONS.LEAVE_CANCEL) ? <Button onClick={() => statusMutation.mutate({ id: record.id, action: 'cancel' })}>Cancel</Button> : null}
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Card className="page-card" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          dataSource={leaveTypes}
          loading={isLeaveTypesLoading}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Symbol', dataIndex: 'displaySymbol', width: 90 },
            { title: 'Code', dataIndex: 'code', width: 180 },
            { title: 'Name', dataIndex: 'name' },
            {
              title: 'Day value',
              render: (_, record) => record.dayValue ?? '-',
              width: 110,
            },
            {
              title: 'Quota',
              dataIndex: 'quotaMode',
              width: 190,
            },
            {
              title: 'Status',
              render: (_, record) => <StatusTag status={record.hrRuleStatus} />,
              width: 170,
            },
            {
              title: 'Annual leave',
              render: (_, record) => (record.deductsAnnualLeave ? 'Yes' : 'No'),
              width: 130,
            },
          ]}
        />
      </Card>

      <Drawer title="Create leave request" open={open} width={500} destroyOnClose onClose={() => { setOpen(false); form.resetFields(); }} extra={<Button type="primary" loading={createMutation.isPending} onClick={() => void form.submit()}>Save</Button>}>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
            <Select options={mockEmployees.map((item) => ({ value: item.id, label: item.fullName }))} />
          </Form.Item>
          <Form.Item name="leaveType" label="Leave type" rules={[{ required: true }]}>
            <Select options={LEAVE_TYPE_OPTIONS.map((item) => ({ value: item, label: item }))} />
          </Form.Item>
          <Form.Item name="startDate" label="Start date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item
            name="endDate"
            label="End date"
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const startDate = getFieldValue('startDate');
                  if (!startDate || !value || !dayjs(value).isBefore(dayjs(startDate), 'day')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('endDate phải lớn hơn hoặc bằng startDate.'));
                },
              }),
            ]}
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item name="totalDays" label="Total days" rules={[{ required: true, type: 'number', min: 1 }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
