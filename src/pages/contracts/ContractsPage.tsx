import { useState } from 'react';
import { Button, Card, Col, Drawer, Form, Input, Modal, Row, Select, Space, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createContract, terminateContract } from '../../features/contracts/contractsApi';
import type { ContractPayload } from '../../features/contracts/contractTypes';
import { useContracts } from '../../features/contracts/useContracts';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { CONTRACT_TYPE_OPTIONS } from '../../shared/constants/statuses';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate } from '../../shared/utils/date';

export function ContractsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ContractPayload>();
  const [terminateForm] = Form.useForm<{ endDate: string }>();
  const [open, setOpen] = useState(false);
  const [terminateId, setTerminateId] = useState<string | null>(null);
  const [params, setParams] = useState({ page: 1, pageSize: 10, employeeId: undefined as string | undefined, status: undefined as string | undefined });
  const { data, isLoading, error, refetch } = useContracts(params);

  const createMutation = useMutation({
    mutationFn: createContract,
    onSuccess: async () => {
      message.success('Đã tạo contract.');
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) => terminateContract(id, { endDate }),
    onSuccess: async () => {
      message.success('Đã terminate contract.');
      setTerminateId(null);
      terminateForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
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
      <PageHeader title="Contracts" subtitle="Contract metadata demo cho HRM phase 1." actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Create</Button>} />
      <Card className="page-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={12}>
            <Col xs={24} md={10}>
              <Select allowClear placeholder="Employee" style={{ width: '100%' }} options={mockEmployees.map((item) => ({ value: item.id, label: item.fullName }))} onChange={(value) => setParams((current) => ({ ...current, employeeId: value }))} />
            </Col>
            <Col xs={24} md={6}>
              <Select allowClear placeholder="Status" style={{ width: '100%' }} options={['ACTIVE', 'COMPLETED', 'TERMINATED'].map((item) => ({ value: item, label: item }))} onChange={(value) => setParams((current) => ({ ...current, status: value }))} />
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
              { title: 'Contract no', dataIndex: 'contractNo' },
              { title: 'Type', dataIndex: 'contractType' },
              { title: 'Start date', render: (_, record) => formatDate(record.startDate) },
              { title: 'End date', render: (_, record) => formatDate(record.endDate) },
              { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
              {
                title: 'Actions',
                render: (_, record) => (
                  record.status !== 'TERMINATED' ? <Button onClick={() => setTerminateId(record.id)}>Terminate</Button> : null
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Drawer title="Create contract" open={open} width={460} destroyOnClose onClose={() => { setOpen(false); form.resetFields(); }} extra={<Button type="primary" loading={createMutation.isPending} onClick={() => void form.submit()}>Save</Button>}>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)} initialValues={{ status: 'ACTIVE' }}>
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
            <Select options={mockEmployees.map((item) => ({ value: item.id, label: item.fullName }))} />
          </Form.Item>
          <Form.Item name="contractNo" label="Contract no" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contractType" label="Contract type" rules={[{ required: true }]}>
            <Select options={CONTRACT_TYPE_OPTIONS.map((item) => ({ value: item, label: item }))} />
          </Form.Item>
          <Form.Item name="startDate" label="Start date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="endDate" label="End date">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={['ACTIVE', 'COMPLETED'].map((item) => ({ value: item, label: item }))} />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal open={Boolean(terminateId)} title="Terminate contract" onCancel={() => setTerminateId(null)} onOk={() => void terminateForm.submit()} confirmLoading={terminateMutation.isPending}>
        <Form form={terminateForm} layout="vertical" onFinish={(values) => terminateId && terminateMutation.mutate({ id: terminateId, endDate: values.endDate })}>
          <Form.Item name="endDate" label="End date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
