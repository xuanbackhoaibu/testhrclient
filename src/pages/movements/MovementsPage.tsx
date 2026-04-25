import { useState } from 'react';
import { Button, Card, Col, Drawer, Form, Input, Modal, Row, Select, Space, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { approveMovement, cancelMovement, createMovement, rejectMovement, submitMovement } from '../../features/movements/movementsApi';
import type { Movement, MovementPayload } from '../../features/movements/movementTypes';
import { useMovements } from '../../features/movements/useMovements';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { MOVEMENT_TYPE_OPTIONS } from '../../shared/constants/statuses';
import { formatDate } from '../../shared/utils/date';

export function MovementsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<MovementPayload>();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Movement | null>(null);
  const [params, setParams] = useState({ page: 1, pageSize: 10, employeeId: undefined as string | undefined, movementType: undefined as string | undefined, status: undefined as string | undefined });
  const { data, isLoading, error, refetch } = useMovements(params);

  const createMutation = useMutation({
    mutationFn: createMovement,
    onSuccess: async () => {
      message.success('Đã tạo movement.');
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['movements'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'submit' | 'approve' | 'reject' | 'cancel' }) => {
      switch (action) {
        case 'submit':
          return submitMovement(id);
        case 'approve':
          return approveMovement(id);
        case 'reject':
          return rejectMovement(id);
        default:
          return cancelMovement(id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movements'] });
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
      <PageHeader title="Movements" subtitle="Movement workflow demo với trạng thái submit/approve/reject/cancel." actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Create</Button>} />
      <Card className="page-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Select allowClear placeholder="Employee" style={{ width: '100%' }} options={mockEmployees.map((item) => ({ value: item.id, label: item.fullName }))} onChange={(value) => setParams((current) => ({ ...current, employeeId: value }))} />
            </Col>
            <Col xs={24} md={8}>
              <Select allowClear placeholder="Movement type" style={{ width: '100%' }} options={MOVEMENT_TYPE_OPTIONS.map((item) => ({ value: item, label: item }))} onChange={(value) => setParams((current) => ({ ...current, movementType: value }))} />
            </Col>
            <Col xs={24} md={8}>
              <Select allowClear placeholder="Status" style={{ width: '100%' }} options={['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'].map((item) => ({ value: item, label: item }))} onChange={(value) => setParams((current) => ({ ...current, status: value }))} />
            </Col>
          </Row>

          <Table
            rowKey="id"
            dataSource={data.data}
            pagination={{
              current: data.meta.page,
              pageSize: data.meta.pageSize,
              total: data.meta.total,
              onChange: (page, pageSize) => setParams((current) => ({ ...current, page, pageSize })),
            }}
            columns={[
              { title: 'Employee', dataIndex: 'employeeName' },
              { title: 'Type', dataIndex: 'movementType' },
              { title: 'Effective date', render: (_, record) => formatDate(record.effectiveDate) },
              { title: 'Reason', dataIndex: 'reason' },
              { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
              {
                title: 'Actions',
                render: (_, record) => (
                  <Space wrap>
                    <Button onClick={() => setSelected(record)}>Detail</Button>
                    {record.status === 'DRAFT' ? <Button onClick={() => statusMutation.mutate({ id: record.id, action: 'submit' })}>Submit</Button> : null}
                    {record.status === 'SUBMITTED' ? <Button onClick={() => statusMutation.mutate({ id: record.id, action: 'approve' })}>Approve</Button> : null}
                    {record.status === 'SUBMITTED' ? <Button danger onClick={() => statusMutation.mutate({ id: record.id, action: 'reject' })}>Reject</Button> : null}
                    {['DRAFT', 'SUBMITTED'].includes(record.status) ? <Button onClick={() => statusMutation.mutate({ id: record.id, action: 'cancel' })}>Cancel</Button> : null}
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Drawer title="Create movement" open={open} width={520} destroyOnClose onClose={() => { setOpen(false); form.resetFields(); }} extra={<Button type="primary" loading={createMutation.isPending} onClick={() => void form.submit()}>Save</Button>}>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)} initialValues={{ afterJson: '{\n  "orgUnitId": "ou-sales"\n}' }}>
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
            <Select options={mockEmployees.map((item) => ({ value: item.id, label: item.fullName }))} />
          </Form.Item>
          <Form.Item name="movementType" label="Movement type" rules={[{ required: true }]}>
            <Select options={MOVEMENT_TYPE_OPTIONS.map((item) => ({ value: item, label: item }))} />
          </Form.Item>
          <Form.Item name="effectiveDate" label="Effective date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="afterJson"
            label="afterJson"
            extra={'TRANSFER: {"orgUnitId":"ou-sales"} | STATUS_CHANGE: {"employmentStatus":"ACTIVE"} | TERMINATION: {"employmentStatus":"TERMINATED"}'}
            rules={[
              { required: true },
              {
                validator: async (_, value) => {
                  try {
                    JSON.parse(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('afterJson phải là JSON hợp lệ.'));
                  }
                },
              },
            ]}
          >
            <Input.TextArea rows={8} />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal open={Boolean(selected)} title="Movement detail" footer={null} onCancel={() => setSelected(null)}>
        <pre className="json-block">{JSON.stringify(selected?.afterJson ?? {}, null, 2)}</pre>
      </Modal>
    </>
  );
}
