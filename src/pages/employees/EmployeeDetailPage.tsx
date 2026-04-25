import { Card, Col, Descriptions, Row, Table, Tabs, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useParams } from 'react-router-dom';

import type { AttendanceRecord } from '../../features/attendance/attendanceTypes';
import type { AuditLog } from '../../features/audit/auditTypes';
import type { Contract } from '../../features/contracts/contractTypes';
import { useEmployeeDetail } from '../../features/employees/useEmployeeDetail';
import type { LeaveRequest } from '../../features/leave/leaveTypes';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate, formatDateTime } from '../../shared/utils/date';

export function EmployeeDetailPage() {
  const { id } = useParams();
  const { data, isLoading, error, refetch } = useEmployeeDetail(id);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const assignmentColumns: ColumnsType<(typeof data.assignments)[number]> = [
    { title: 'Legal entity', render: (_, record) => record.legalEntityName },
    { title: 'Org unit', render: (_, record) => record.orgUnitName },
    { title: 'Position', render: (_, record) => record.positionName },
    { title: 'Job title', render: (_, record) => record.jobTitle },
    { title: 'Manager', render: (_, record) => record.managerName },
  ];

  return (
    <>
      <PageHeader
        title={`${data.employee.employeeCode} - ${data.employee.fullName}`}
        subtitle={data.employee.currentAssignment.jobTitle}
        breadcrumbs={['Employees', data.employee.employeeCode]}
      />

      <Card className="page-card" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={18}>
            <Descriptions column={{ xs: 1, md: 2, xl: 4 }}>
              <Descriptions.Item label="Status">
                <StatusTag status={data.employee.employmentStatus} />
              </Descriptions.Item>
              <Descriptions.Item label="Legal entity">{data.employee.currentAssignment.legalEntityName}</Descriptions.Item>
              <Descriptions.Item label="Org unit">{data.employee.currentAssignment.orgUnitName}</Descriptions.Item>
              <Descriptions.Item label="Manager">{data.employee.currentAssignment.managerName}</Descriptions.Item>
              <Descriptions.Item label="Company email">{data.employee.companyEmail ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{data.employee.phone ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Hire date">{formatDate(data.employee.hireDate)}</Descriptions.Item>
              <Descriptions.Item label="Date of birth">{formatDate(data.employee.dateOfBirth)}</Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

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
