import { Card, Col, Descriptions, Row, Table, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useParams } from 'react-router-dom';

import type { AttendanceRecord } from '../../features/attendance/attendanceTypes';
import type { AuditLog } from '../../features/audit/auditTypes';
import { useAuth } from '../../features/auth/useAuth';
import type { Contract } from '../../features/contracts/contractTypes';
import type { LeaveRequest } from '../../features/leave/leaveTypes';
import { useEmployeeDetail } from '../../features/employees/useEmployeeDetail';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate, formatDateTime } from '../../shared/utils/date';
import { AccountTab } from './tabs/AccountTab';
import { AccessTab } from './tabs/AccessTab';

export function EmployeeDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const canReadAccount = can('hr.account.read');

  const { data, isLoading, error, refetch } = useEmployeeDetail(id, {
    includeAccount: canReadAccount,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const { employee } = data;

  const assignmentColumns: ColumnsType<(typeof data.assignments)[number]> = [
    { title: 'Đơn vị', render: (_, record) => record.unitName },
    { title: 'Phòng ban', render: (_, record) => record.departmentName },
    { title: 'Chức vụ', render: (_, record) => record.positionName },
    { title: 'Job title', render: (_, record) => record.jobTitle },
    { title: 'Quản lý', render: (_, record) => record.managerName },
  ];

  return (
    <>
      <PageHeader
        title={`${employee.employeeCode} — ${employee.fullName}`}
        subtitle={employee.currentEmployeeAssignment?.jobTitle ?? 'Chưa có phân công'}
        breadcrumbs={['Nhân sự', employee.employeeCode]}
      />

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={18}>
            <Descriptions column={{ xs: 1, md: 2, xl: 3 }}>
              <Descriptions.Item label="Trạng thái nhân sự">
                <StatusTag status={employee.employmentStatus} />
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái tài khoản">
                <StatusTag status={employee.accountStatus ?? 'NOT_CREATED'} />
              </Descriptions.Item>
              <Descriptions.Item label="MNS">{employee.employeeCode}</Descriptions.Item>
              <Descriptions.Item label="Đơn vị">{employee.currentEmployeeAssignment?.unitName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Phòng ban">{employee.currentEmployeeAssignment?.departmentName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Chức vụ">{employee.currentEmployeeAssignment?.positionName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Email công ty">{employee.companyEmail ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{employee.phone ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày vào làm">{formatDate(employee.hireDate)}</Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      <Tabs
        items={[
          {
            key: 'profile',
            label: 'Hồ sơ',
            children: (
              <Card>
                <Descriptions column={{ xs: 1, md: 2 }} bordered>
                  <Descriptions.Item label="Họ tên">{employee.fullName}</Descriptions.Item>
                  <Descriptions.Item label="Giới tính">{employee.gender ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="Ngày sinh">{formatDate(employee.dateOfBirth)}</Descriptions.Item>
                  <Descriptions.Item label="CCCD/CMND">{employee.citizenIdMasked ?? '●●●●●●'}</Descriptions.Item>
                  <Descriptions.Item label="Email công ty">{employee.companyEmail ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="Email cá nhân">{employee.personalEmail ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">{employee.phone ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="Ngày vào làm">{formatDate(employee.hireDate)}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'work',
            label: 'Công việc',
            children: (
              <Card>
                <Table
                  rowKey="positionId"
                  columns={assignmentColumns}
                  dataSource={data.assignments}
                  pagination={false}
                  locale={{ emptyText: 'Chưa có phân công' }}
                />
                <div style={{ marginTop: 24 }}>
                  <Table<Contract>
                    title={() => 'Hợp đồng'}
                    rowKey="id"
                    columns={[
                      { title: 'Số HĐ', dataIndex: 'contractNo' },
                      { title: 'Loại', dataIndex: 'contractType' },
                      { title: 'Ngày bắt đầu', render: (_, r) => formatDate(r.startDate) },
                      { title: 'Ngày kết thúc', render: (_, r) => formatDate(r.endDate) },
                      { title: 'Trạng thái', render: (_, r) => <StatusTag status={r.status} /> },
                    ]}
                    dataSource={data.contracts}
                    pagination={false}
                    locale={{ emptyText: 'Chưa có hợp đồng' }}
                  />
                </div>
              </Card>
            ),
          },
          {
            key: 'account',
            label: 'Tài khoản',
            children: (
              <Card>
                <AccountTab employee={employee} />
              </Card>
            ),
          },
          {
            key: 'access',
            label: 'Quyền truy cập',
            children: (
              <Card>
                <AccessTab employee={employee} />
              </Card>
            ),
          },
          {
            key: 'history',
            label: 'Lịch sử',
            children: (
              <Card>
                <Table<LeaveRequest>
                  title={() => 'Nghỉ phép'}
                  rowKey="id"
                  columns={[
                    { title: 'Loại nghỉ', dataIndex: 'leaveType' },
                    { title: 'Từ ngày', render: (_, r) => formatDate(r.startDate) },
                    { title: 'Đến ngày', render: (_, r) => formatDate(r.endDate) },
                    { title: 'Số ngày', dataIndex: 'totalDays' },
                    { title: 'Trạng thái', render: (_, r) => <StatusTag status={r.status} /> },
                  ]}
                  dataSource={data.leaveRequests}
                  pagination={false}
                  locale={{ emptyText: 'Chưa có đơn nghỉ phép' }}
                />
                <div style={{ marginTop: 24 }}>
                  <Table<AttendanceRecord>
                    title={() => 'Chấm công'}
                    rowKey="id"
                    columns={[
                      { title: 'Ngày', render: (_, r) => formatDate(r.workDate) },
                      { title: 'Check in', render: (_, r) => formatDateTime(r.checkIn) },
                      { title: 'Check out', render: (_, r) => formatDateTime(r.checkOut) },
                      { title: 'Nguồn', dataIndex: 'source' },
                      { title: 'Trạng thái', render: (_, r) => <StatusTag status={r.status} /> },
                    ]}
                    dataSource={data.attendanceRecords}
                    pagination={false}
                    locale={{ emptyText: 'Chưa có dữ liệu chấm công' }}
                  />
                </div>
                <div style={{ marginTop: 24 }}>
                  <Table<AuditLog>
                    title={() => 'Nhật ký thao tác'}
                    rowKey="id"
                    columns={[
                      { title: 'Hành động', dataIndex: 'action' },
                      { title: 'Người thực hiện', dataIndex: 'actorName' },
                      { title: 'Thời gian', render: (_, r) => formatDateTime(r.createdAt) },
                    ]}
                    dataSource={data.auditLogs}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: 'Chưa có nhật ký' }}
                  />
                </div>
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}
