import { useState } from 'react';
import { Button, Card, Drawer, Form, Modal, Select, Space, Table, Tabs, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { completeOnboardingInstance, createOnboardingInstance, updateOnboardingItem } from '../../features/onboarding/onboardingApi';
import type { OnboardingInstance, OnboardingInstancePayload } from '../../features/onboarding/onboardingTypes';
import { useOnboarding } from '../../features/onboarding/useOnboarding';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate } from '../../shared/utils/date';

export function OnboardingPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<OnboardingInstancePayload>();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<OnboardingInstance | null>(null);
  const { data, isLoading, error, refetch } = useOnboarding({ page: 1, pageSize: 50 });

  const createMutation = useMutation({
    mutationFn: createOnboardingInstance,
    onSuccess: async () => {
      message.success('Đã tạo onboarding instance.');
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  const itemMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateOnboardingItem(id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeOnboardingInstance,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      setSelected(null);
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
      <PageHeader title="Onboarding" subtitle="Templates và instances cho employee onboarding." actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Create instance</Button>} />
      <Tabs
        items={[
          {
            key: 'instances',
            label: 'Instances',
            children: (
              <Card className="page-card">
                <Table
                  rowKey="id"
                  dataSource={data.instances}
                  pagination={false}
                  columns={[
                    { title: 'Employee', dataIndex: 'employeeName' },
                    { title: 'Template', dataIndex: 'templateName' },
                    { title: 'Start date', render: (_, record) => formatDate(record.startDate) },
                    { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
                    { title: 'Actions', render: (_, record) => <Button onClick={() => setSelected(record)}>View checklist</Button> },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'templates',
            label: 'Templates',
            children: (
              <Card className="page-card">
                <Table
                  rowKey="id"
                  dataSource={data.templates}
                  pagination={false}
                  columns={[
                    { title: 'Name', dataIndex: 'name' },
                    { title: 'Item count', dataIndex: 'itemCount' },
                    { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Drawer title="Create onboarding instance" open={open} width={420} destroyOnClose onClose={() => { setOpen(false); form.resetFields(); }} extra={<Button type="primary" loading={createMutation.isPending} onClick={() => void form.submit()}>Save</Button>}>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
            <Select options={mockEmployees.map((item) => ({ value: item.id, label: item.fullName }))} />
          </Form.Item>
          <Form.Item name="templateName" label="Template" rules={[{ required: true }]}>
            <Select options={data.templates.map((item) => ({ value: item.name, label: item.name }))} />
          </Form.Item>
          <Form.Item name="startDate" label="Start date" rules={[{ required: true }]}>
            <Select options={[{ value: '2026-04-25', label: '2026-04-25' }, { value: '2026-05-01', label: '2026-05-01' }]} />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal open={Boolean(selected)} title="Onboarding checklist" footer={null} width={760} onCancel={() => setSelected(null)}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Table
            rowKey="id"
            dataSource={selected?.items ?? []}
            pagination={false}
            columns={[
              { title: 'Item', dataIndex: 'title' },
              { title: 'Owner', dataIndex: 'owner' },
              { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
              {
                title: 'Actions',
                render: (_, record) => (
                  <Select
                    size="small"
                    style={{ width: 150 }}
                    value={record.status}
                    options={['DRAFT', 'IN_PROGRESS', 'COMPLETED'].map((item) => ({ value: item, label: item }))}
                    onChange={(value) => itemMutation.mutate({ id: record.id, status: value })}
                  />
                ),
              },
            ]}
          />
          {selected && selected.status !== 'COMPLETED' ? (
            <Button type="primary" onClick={() => completeMutation.mutate(selected.id)}>
              Complete instance
            </Button>
          ) : null}
        </Space>
      </Modal>
    </>
  );
}

