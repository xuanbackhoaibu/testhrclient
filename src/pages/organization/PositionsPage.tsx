import { useState } from 'react';
import { Button, Card, Drawer, Form, Input, Select, Space, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createPosition, updatePosition } from '../../features/organization/positionsApi';
import type { Position } from '../../features/organization/organizationTypes';
import { usePositions } from '../../features/organization/usePositions';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';

export function PositionsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<Omit<Position, 'id'>>();
  const [editing, setEditing] = useState<Position | null>(null);
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState({ page: 1, pageSize: 10, search: '', status: undefined as string | undefined });
  const { data, isLoading, error, refetch } = usePositions(params);

  const mutation = useMutation({
    mutationFn: async (values: Omit<Position, 'id'>) => {
      if (editing) {
        return updatePosition(editing.id, values);
      }
      return createPosition(values);
    },
    onSuccess: async () => {
      message.success(editing ? 'Đã cập nhật position.' : 'Đã tạo position.');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['positions'] });
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
      <PageHeader
        title="Positions"
        subtitle="Position master với basic search và status filter."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Create
          </Button>
        }
      />

      <Card className="page-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space wrap>
            <Input.Search placeholder="Search code, name, job function" allowClear onSearch={(search) => setParams((current) => ({ ...current, search }))} />
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 160 }}
              options={[{ value: 'ACTIVE' }, { value: 'INACTIVE' }]}
              onChange={(value) => setParams((current) => ({ ...current, status: value }))}
            />
          </Space>

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
              { title: 'Code', dataIndex: 'code' },
              { title: 'Name', dataIndex: 'name' },
              { title: 'Job function', dataIndex: 'jobFunction' },
              { title: 'Grade', dataIndex: 'grade' },
              { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
              {
                title: 'Actions',
                render: (_, record) => (
                  <Button
                    onClick={() => {
                      setEditing(record);
                      form.setFieldsValue(record);
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

      <Drawer
        title={editing ? 'Edit position' : 'Create position'}
        open={open}
        width={420}
        destroyOnClose
        onClose={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        extra={
          <Button type="primary" loading={mutation.isPending} onClick={() => void form.submit()}>
            Save
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)} initialValues={{ status: 'ACTIVE' }}>
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="jobFunction" label="Job function" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="grade" label="Grade" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={[{ value: 'ACTIVE' }, { value: 'INACTIVE' }]} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}

