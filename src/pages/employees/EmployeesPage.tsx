import { useMemo, useState } from 'react';
import { Button, Card, Col, Drawer, Form, Input, Row, Select, Space, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { createEmployee } from '../../features/employees/employeesApi';
import type { Employee, EmployeePayload } from '../../features/employees/employeeTypes';
import { useEmployees } from '../../features/employees/useEmployees';
import { mockLegalEntities, mockOrgUnits } from '../../shared/mocks/mockOrganization';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';

export function EmployeesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<EmployeePayload>();
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    search: '',
    status: undefined as string | undefined,
    legalEntityId: undefined as string | undefined,
    orgUnitId: undefined as string | undefined,
  });

  const { data, isLoading, error, refetch } = useEmployees(params);

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: async () => {
      message.success('Đã tạo nhân sự mới.');
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const columns = useMemo<ColumnsType<Employee>>(
    () => [
      { title: 'Employee code', dataIndex: 'employeeCode', key: 'employeeCode' },
      { title: 'Full name', dataIndex: 'fullName', key: 'fullName' },
      { title: 'Company email', dataIndex: 'companyEmail', key: 'companyEmail' },
      { title: 'Phone', dataIndex: 'phone', key: 'phone' },
      {
        title: 'Status',
        dataIndex: 'employmentStatus',
        key: 'employmentStatus',
        render: (value: string) => <StatusTag status={value} />,
      },
      {
        title: 'Legal entity',
        key: 'legalEntityName',
        render: (_, record) => record.currentAssignment.legalEntityName,
      },
      {
        title: 'Org unit',
        key: 'orgUnitName',
        render: (_, record) => record.currentAssignment.orgUnitName,
      },
      {
        title: 'Job title',
        key: 'jobTitle',
        render: (_, record) => record.currentAssignment.jobTitle,
      },
      {
        title: 'Manager',
        key: 'managerName',
        render: (_, record) => record.currentAssignment.managerName,
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/employees/${record.id}`)}>
            View
          </Button>
        ),
      },
    ],
    [navigate],
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle="Employee master demo. Tạo mới chỉ lưu dữ liệu masked cho citizenId."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Create Employee
          </Button>
        }
      />

      <Card className="page-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={12}>
            <Col xs={24} md={10}>
              <Input.Search
                placeholder="Search code, name, email"
                allowClear
                onSearch={(value) => setParams((current) => ({ ...current, search: value, page: 1 }))}
              />
            </Col>
            <Col xs={24} md={4}>
              <Select
                placeholder="Status"
                allowClear
                style={{ width: '100%' }}
                options={[
                  { value: 'ACTIVE', label: 'ACTIVE' },
                  { value: 'PROBATION', label: 'PROBATION' },
                  { value: 'INACTIVE', label: 'INACTIVE' },
                  { value: 'TERMINATED', label: 'TERMINATED' },
                ]}
                onChange={(value) => setParams((current) => ({ ...current, status: value, page: 1 }))}
              />
            </Col>
            <Col xs={24} md={5}>
              <Select
                placeholder="Legal entity"
                allowClear
                style={{ width: '100%' }}
                options={mockLegalEntities.map((item) => ({ value: item.id, label: item.name }))}
                onChange={(value) => setParams((current) => ({ ...current, legalEntityId: value, page: 1 }))}
              />
            </Col>
            <Col xs={24} md={5}>
              <Select
                placeholder="Org unit"
                allowClear
                style={{ width: '100%' }}
                options={mockOrgUnits.map((item) => ({ value: item.id, label: item.name }))}
                onChange={(value) => setParams((current) => ({ ...current, orgUnitId: value, page: 1 }))}
              />
            </Col>
          </Row>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={data.data}
            onRow={(record) => ({
              onClick: () => navigate(`/employees/${record.id}`),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              current: data.meta.page,
              pageSize: data.meta.pageSize,
              total: data.meta.total,
              onChange: (page, pageSize) => setParams((current) => ({ ...current, page, pageSize })),
            }}
          />
        </Space>
      </Card>

      <Drawer
        title="Create Employee"
        open={open}
        width={520}
        destroyOnClose
        onClose={() => {
          setOpen(false);
          form.resetFields();
        }}
        extra={
          <Button type="primary" loading={createMutation.isPending} onClick={() => void form.submit()}>
            Save
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
          initialValues={{ employmentStatus: 'ACTIVE' }}
        >
          <Form.Item name="employeeCode" label="Employee code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="fullName" label="Full name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="companyEmail" label="Company email" rules={[{ type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="personalEmail" label="Personal email" rules={[{ type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="Gender">
            <Select allowClear options={[{ value: 'MALE' }, { value: 'FEMALE' }, { value: 'OTHER' }]} />
          </Form.Item>
          <Form.Item name="dateOfBirth" label="Date of birth">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="hireDate" label="Hire date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="employmentStatus" label="Employment status" rules={[{ required: true }]}>
            <Select options={[{ value: 'ACTIVE' }, { value: 'PROBATION' }, { value: 'INACTIVE' }, { value: 'TERMINATED' }]} />
          </Form.Item>
          <Form.Item name="citizenId" label="Citizen ID">
            <Input />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
