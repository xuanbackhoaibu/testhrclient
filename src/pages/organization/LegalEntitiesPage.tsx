import { useState } from 'react';
import { Button, Card, Drawer, Form, Input, Popconfirm, Select, Space, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createLegalEntity, updateLegalEntity } from '../../features/organization/legalEntitiesApi';
import type { LegalEntity } from '../../features/organization/organizationTypes';
import { useLegalEntities } from '../../features/organization/useLegalEntities';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';

export function LegalEntitiesPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<Omit<LegalEntity, 'id'>>();
  const [params, setParams] = useState({ page: 1, pageSize: 10, search: '', status: undefined as string | undefined });
  const [editing, setEditing] = useState<LegalEntity | null>(null);
  const [open, setOpen] = useState(false);
  const { data, isLoading, error, refetch } = useLegalEntities(params);

  const mutation = useMutation({
    mutationFn: async (values: Omit<LegalEntity, 'id'>) => {
      if (editing) {
        return updateLegalEntity(editing.id, values);
      }
      return createLegalEntity(values);
    },
    onSuccess: async () => {
      message.success(editing ? 'Đã cập nhật legal entity.' : 'Đã tạo legal entity.');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['legal-entities'] });
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
        title="Legal Entities"
        subtitle="Quản lý legal entity master cho HRM."
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            Create
          </Button>
        }
      />

      <Card className="page-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space wrap>
            <Input.Search placeholder="Search code or name" allowClear onSearch={(search) => setParams((current) => ({ ...current, search }))} />
            <Select
              placeholder="Status"
              allowClear
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
              { title: 'Short name', dataIndex: 'shortName' },
              { title: 'Tax code', dataIndex: 'taxCode' },
              { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
              {
                title: 'Actions',
                render: (_, record) => (
                  <Space>
                    <Button
                      onClick={() => {
                        setEditing(record);
                        form.setFieldsValue(record);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    {record.status !== 'INACTIVE' ? (
                      <Popconfirm title="Inactive legal entity?" onConfirm={() => mutation.mutate({ ...record, status: 'INACTIVE' })}>
                        <Button danger>Inactive</Button>
                      </Popconfirm>
                    ) : null}
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Drawer
        title={editing ? 'Edit legal entity' : 'Create legal entity'}
        open={open}
        destroyOnClose
        width={440}
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
          <Form.Item name="shortName" label="Short name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="taxCode" label="Tax code" rules={[{ required: true }]}>
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

