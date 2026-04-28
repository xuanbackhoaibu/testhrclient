import { useState } from 'react';
import { Button, Card, Col, Drawer, Form, Input, Row, Select, Space, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { createAttendanceRecord, updateAttendanceRecord } from '../../features/attendance/attendanceApi';
import type { AttendancePayload, AttendanceRecord } from '../../features/attendance/attendanceTypes';
import { useAttendanceRecords } from '../../features/attendance/useAttendanceRecords';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { ATTENDANCE_SOURCE_OPTIONS } from '../../shared/constants/statuses';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate, formatDateTime } from '../../shared/utils/date';

export function AttendancePage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AttendancePayload>();
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState({ page: 1, pageSize: 10, employeeId: undefined as string | undefined, source: undefined as string | undefined, status: undefined as string | undefined, fromDate: undefined as string | undefined, toDate: undefined as string | undefined });
  const { data, isLoading, error, refetch } = useAttendanceRecords(params);

  const mutation = useMutation({
    mutationFn: async (values: AttendancePayload) => {
      if (editing) {
        return updateAttendanceRecord(editing.id, values);
      }
      return createAttendanceRecord(values);
    },
    onSuccess: async () => {
      message.success(editing ? 'Đã cập nhật attendance.' : 'Đã tạo attendance.');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
    },
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageHeader title="Attendance" subtitle="Attendance records demo với manual/import/machine sources." actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Create</Button>} />
      <Card className="page-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={12}>
            <Col xs={24} md={6}>
              <Select allowClear placeholder="Employee" style={{ width: '100%' }} options={mockEmployees.map((item) => ({ value: item.id, label: item.fullName }))} onChange={(value) => setParams((current) => ({ ...current, employeeId: value }))} />
            </Col>
            <Col xs={24} md={4}>
              <Input type="date" onChange={(event) => setParams((current) => ({ ...current, fromDate: event.target.value || undefined }))} />
            </Col>
            <Col xs={24} md={4}>
              <Input type="date" onChange={(event) => setParams((current) => ({ ...current, toDate: event.target.value || undefined }))} />
            </Col>
            <Col xs={24} md={5}>
              <Select allowClear placeholder="Source" style={{ width: '100%' }} options={ATTENDANCE_SOURCE_OPTIONS.map((item) => ({ value: item, label: item }))} onChange={(value) => setParams((current) => ({ ...current, source: value }))} />
            </Col>
            <Col xs={24} md={5}>
              <Select allowClear placeholder="Status" style={{ width: '100%' }} options={['DRAFT', 'SUBMITTED', 'APPROVED'].map((item) => ({ value: item, label: item }))} onChange={(value) => setParams((current) => ({ ...current, status: value }))} />
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
              { title: 'Employee', dataIndex: 'employeeName' },
              { title: 'Work date', render: (_, record) => formatDate(record.workDate) },
              { title: 'Check in', render: (_, record) => formatDateTime(record.checkIn) },
              { title: 'Check out', render: (_, record) => formatDateTime(record.checkOut) },
              { title: 'Source', dataIndex: 'source' },
              { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
              {
                title: 'Actions',
                render: (_, record) => (
                  <Button
                    onClick={() => {
                      setEditing(record);
                      form.setFieldsValue({
                        employeeId: record.employeeId,
                        workDate: record.workDate,
                        checkIn: record.checkIn?.slice(0, 16),
                        checkOut: record.checkOut?.slice(0, 16),
                        source: record.source,
                        status: record.status,
                      });
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Drawer title={editing ? 'Edit attendance' : 'Create attendance'} open={open} width={480} destroyOnClose onClose={() => { setOpen(false); setEditing(null); form.resetFields(); }} extra={<Button type="primary" loading={mutation.isPending} onClick={() => void form.submit()}>Save</Button>}>
        <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)} initialValues={{ source: 'MANUAL', status: 'DRAFT' }}>
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
            <Select options={mockEmployees.map((item) => ({ value: item.id, label: item.fullName }))} />
          </Form.Item>
          <Form.Item name="workDate" label="Work date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="checkIn" label="Check in">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item
            name="checkOut"
            label="Check out"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const checkIn = getFieldValue('checkIn');
                  if (!checkIn || !value || !dayjs(value).isBefore(dayjs(checkIn))) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('checkOut phải lớn hơn hoặc bằng checkIn.'));
                },
              }),
            ]}
          >
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="source" label="Source" rules={[{ required: true }]}>
            <Select options={ATTENDANCE_SOURCE_OPTIONS.map((item) => ({ value: item, label: item }))} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={['DRAFT', 'SUBMITTED', 'APPROVED'].map((item) => ({ value: item, label: item }))} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
