import { Button, Card, Col, Descriptions, Popconfirm, Row, Select, Space, Table, Tabs, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import type { AttendanceRecord } from '../../features/attendance/attendanceTypes';
import type { AuditLog } from '../../features/audit/auditTypes';
import { canAssignRole, canManageAccount, HRM_ROLES } from '../../features/auth/permissions';
import { useAuth } from '../../features/auth/useAuth';
import type { Contract } from '../../features/contracts/contractTypes';
import {
  createEmployeeAccount,
  lockEmployeeAccount,
  unlockEmployeeAccount,
} from '../../features/employees/employeesApi';
import type { EmployeeAccountRole } from '../../features/employees/employeeTypes';
import { useEmployeeDetail } from '../../features/employees/useEmployeeDetail';
import type { LeaveRequest } from '../../features/leave/leaveTypes';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate, formatDateTime } from '../../shared/utils/date';

export function EmployeeDetailPage() {
  const { id } = useParams();
  const [selectedRole, setSelectedRole] = useState<EmployeeAccountRole>('HR');
  const { user } = useAuth();
  const mayManageAccount = canManageAccount(user);
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useEmployeeDetail(id, {
    includeAccount: mayManageAccount,
  });
  const refreshDetail = async () => {
    await queryClient.invalidateQueries({ queryKey: ['employee-detail', id] });
  };
  const createAccountMutation = useMutation({
    mutationFn: (roleCode: EmployeeAccountRole) => createEmployeeAccount(id!, roleCode),
    onSuccess: async () => {
      message.success('Da tao tai khoan nhan su.');
      await refreshDetail();
    },
    onError: (mutationError) => message.error(mutationError instanceof Error ? mutationError.message : 'Tao tai khoan that bai.'),
  });
  const lockAccountMutation = useMutation({
    mutationFn: () => lockEmployeeAccount(id!),
    onSuccess: async () => {
      message.success('Da khoa tai khoan.');
      await refreshDetail();
    },
    onError: (mutationError) => message.error(mutationError instanceof Error ? mutationError.message : 'Khoa tai khoan that bai.'),
  });
  const unlockAccountMutation = useMutation({
    mutationFn: () => unlockEmployeeAccount(id!),
    onSuccess: async () => {
      message.success('Da mo khoa tai khoan.');
      await refreshDetail();
    },
    onError: (mutationError) => message.error(mutationError instanceof Error ? mutationError.message : 'Mo khoa tai khoan that bai.'),
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const assignmentColumns: ColumnsType<(typeof data.assignments)[number]> = [
    { title: 'Đơn vị', render: (_, record) => record.unitName },
    { title: 'Phòng ban', render: (_, record) => record.departmentName },
    { title: 'Position', render: (_, record) => record.positionName },
    { title: 'Job title', render: (_, record) => record.jobTitle },
    { title: 'Manager', render: (_, record) => record.managerName },
  ];
  const account = data.account;
  const roleOptions = [
    { label: 'HR', value: HRM_ROLES.HR },
    { label: 'Admin', value: HRM_ROLES.ADMIN },
    { label: 'Super Admin', value: HRM_ROLES.SUPER_ADMIN },
    { label: 'Ban lãnh đạo', value: HRM_ROLES.BAN_LANH_DAO },
    { label: 'Ban lãnh đạo đơn vị', value: HRM_ROLES.BAN_LANH_DAO_DON_VI },
  ].filter((option) => canAssignRole(user, option.value));
  const accountLocked = Boolean(account && (account.accountStatus === 'LOCKED' || account.accountStatus === 'BLOCKED' || account.accountStatus === 'DISABLED'));
  const accountBusy = createAccountMutation.isPending || lockAccountMutation.isPending || unlockAccountMutation.isPending;

  return (
    <>
      <PageHeader
        title={`${data.employee.employeeCode} - ${data.employee.fullName}`}
        subtitle={data.employee.currentEmployeeAssignment?.jobTitle ?? 'Chua co phan cong'}
        breadcrumbs={['Employees', data.employee.employeeCode]}
      />

      <Card className="page-card" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={18}>
            <Descriptions column={{ xs: 1, md: 2, xl: 4 }}>
              <Descriptions.Item label="Status">
                <StatusTag status={data.employee.employmentStatus} />
              </Descriptions.Item>
              <Descriptions.Item label="Đơn vị">{data.employee.currentEmployeeAssignment?.unitName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Phòng ban">{data.employee.currentEmployeeAssignment?.departmentName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Manager">{data.employee.currentEmployeeAssignment?.managerName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Company email">{data.employee.companyEmail ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{data.employee.phone ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Hire date">{formatDate(data.employee.hireDate)}</Descriptions.Item>
              <Descriptions.Item label="Date of birth">{formatDate(data.employee.dateOfBirth)}</Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      {mayManageAccount && account ? (
      <Card className="page-card" title="Tai khoan dang nhap" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, md: 2, xl: 4 }}>
          <Descriptions.Item label="Trang thai">
            <StatusTag status={account.accountStatus} />
          </Descriptions.Item>
          <Descriptions.Item label="Auth user ID">{account.authUserId ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="Email">{account.email ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="Role HRM">{account.roles.length ? account.roles.join(', ') : '-'}</Descriptions.Item>
        </Descriptions>
        <Space wrap style={{ marginTop: 16 }}>
          {!account.linked ? (
            <Popconfirm
              title="Tao tai khoan dang nhap cho nhan su nay?"
              onConfirm={() => createAccountMutation.mutate(selectedRole)}
            >
              <Button type="primary" loading={createAccountMutation.isPending}>
                Tao tai khoan
              </Button>
            </Popconfirm>
          ) : accountLocked ? (
            <Popconfirm title="Mo khoa tai khoan nay?" onConfirm={() => unlockAccountMutation.mutate()}>
              <Button loading={unlockAccountMutation.isPending}>Mo khoa</Button>
            </Popconfirm>
          ) : (
            <Popconfirm title="Khoa tai khoan nay?" onConfirm={() => lockAccountMutation.mutate()}>
              <Button danger loading={lockAccountMutation.isPending}>Khoa tai khoan</Button>
            </Popconfirm>
          )}
          <Select<EmployeeAccountRole>
            value={selectedRole}
            disabled={accountBusy || account.linked}
            style={{ width: 180 }}
            options={roleOptions}
            onChange={setSelectedRole}
          />
        </Space>
      </Card>
      ) : null}

      <Tabs
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Card className="page-card">
                <Typography.Paragraph>
                  HR profile, legal identity mapping và assignment hiện tại được hiển thị ở đây. Citizen ID raw không được render lại trong UI sau khi lưu.
                </Typography.Paragraph>
              </Card>
            ),
          },
          {
            key: 'assignments',
            label: 'Assignments',
            children: <Table rowKey="positionId" columns={assignmentColumns} dataSource={data.assignments} pagination={false} />,
          },
          {
            key: 'contracts',
            label: 'Contracts',
            children: (
              <Table<Contract>
                rowKey="id"
                columns={[
                  { title: 'Contract no', dataIndex: 'contractNo' },
                  { title: 'Type', dataIndex: 'contractType' },
                  { title: 'Start date', render: (_, record) => formatDate(record.startDate) },
                  { title: 'End date', render: (_, record) => formatDate(record.endDate) },
                  { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
                ]}
                dataSource={data.contracts}
                pagination={false}
              />
            ),
          },
          {
            key: 'leave',
            label: 'Leave',
            children: (
              <Table<LeaveRequest>
                rowKey="id"
                columns={[
                  { title: 'Type', dataIndex: 'leaveType' },
                  { title: 'Start', render: (_, record) => formatDate(record.startDate) },
                  { title: 'End', render: (_, record) => formatDate(record.endDate) },
                  { title: 'Days', dataIndex: 'totalDays' },
                  { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
                ]}
                dataSource={data.leaveRequests}
                pagination={false}
              />
            ),
          },
          {
            key: 'attendance',
            label: 'Attendance',
            children: (
              <Table<AttendanceRecord>
                rowKey="id"
                columns={[
                  { title: 'Work date', render: (_, record) => formatDate(record.workDate) },
                  { title: 'Check in', render: (_, record) => formatDateTime(record.checkIn) },
                  { title: 'Check out', render: (_, record) => formatDateTime(record.checkOut) },
                  { title: 'Source', dataIndex: 'source' },
                  { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
                ]}
                dataSource={data.attendanceRecords}
                pagination={false}
              />
            ),
          },
          {
            key: 'audit',
            label: 'Audit Logs',
            children: (
              <Table<AuditLog>
                rowKey="id"
                columns={[
                  { title: 'Action', dataIndex: 'action' },
                  { title: 'Actor', dataIndex: 'actorName' },
                  { title: 'Created at', render: (_, record) => formatDateTime(record.createdAt) },
                ]}
                dataSource={data.auditLogs}
                pagination={false}
              />
            ),
          },
        ]}
      />
    </>
  );
}
