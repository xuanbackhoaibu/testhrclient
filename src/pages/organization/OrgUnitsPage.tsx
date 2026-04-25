import { useState } from 'react';
import { Button, Card, Drawer, Form, Input, Popconfirm, Select, Space, Table, Tree, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createOrgUnit, updateOrgUnit } from '../../features/organization/orgUnitsApi';
import type { OrgUnit } from '../../features/organization/organizationTypes';
import { useOrgUnits } from '../../features/organization/useOrgUnits';
import { mockLegalEntities, mockOrgUnits } from '../../shared/mocks/mockOrganization';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';

export function OrgUnitsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<Omit<OrgUnit, 'id'>>();
  const [params, setParams] = useState({ page: 1, pageSize: 10, search: '', legalEntityId: undefined as string | undefined, status: undefined as string | undefined });
  const [editing, setEditing] = useState<OrgUnit | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading, error, refetch } = useOrgUnits(params);

  const mutation = useMutation({
    mutationFn: async (values: Omit<OrgUnit, 'id'>) => {
      if (editing) {
        return updateOrgUnit(editing.id, values);
      }
      return createOrgUnit(values);
    },
    onSuccess: async () => {
      message.success(editing ? 'Đã cập nhật org unit.' : 'Đã tạo org unit.');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['org-units'] });
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
        title="Org Units"
        subtitle="Hiển thị song song table và tree để demo organizational structure."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Create
          </Button>
        }
      />
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card className="page-card">
          <Space wrap style={{ marginBottom: 16 }}>
            <Input.Search placeholder="Search code or name" allowClear onSearch={(search) => setParams((current) => ({ ...current, search }))} />
            <Select
              allowClear
              placeholder="Legal entity"
              style={{ width: 220 }}
              options={mockLegalEntities.map((item) => ({ value: item.id, label: item.name }))}
              onChange={(value) => setParams((current) => ({ ...current, legalEntityId: value }))}
            />
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
              { title: 'Type', dataIndex: 'type' },
              { title: 'Effective from', dataIndex: 'effectiveFrom' },
              { title: 'Effective to', dataIndex: 'effectiveTo' },
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
                      <Popconfirm title="Inactive org unit?" onConfirm={() => mutation.mutate({ ...record, status: 'INACTIVE' })}>
                        <Button danger>Inactive</Button>
                      </Popconfirm>
                    ) : null}
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Card title="Org Unit Tree" className="page-card">
          <Tree
            treeData={data.tree.map((node) => ({
              key: node.id,
              title: `${node.name} (${node.code})`,
              children:
                node.children?.map((child) => ({
                  key: child.id,
                  title: `${child.name} (${child.code})`,
                })) ?? [],
            }))}
          />
        </Card>
      </Space>

      <Drawer
        title={editing ? 'Edit org unit' : 'Create org unit'}
        open={open}
        width={460}
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
        <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)} initialValues={{ status: 'ACTIVE', effectiveFrom: '2026-04-25' }}>
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="legalEntityId" label="Legal entity" rules={[{ required: true }]}>
            <Select options={mockLegalEntities.map((item) => ({ value: item.id, label: item.name }))} />
          </Form.Item>
          <Form.Item name="parentId" label="Parent org unit">
            <Select allowClear options={mockOrgUnits.map((item) => ({ value: item.id, label: item.name }))} />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="effectiveFrom" label="Effective from" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="effectiveTo" label="Effective to">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={[{ value: 'ACTIVE' }, { value: 'INACTIVE' }]} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}

