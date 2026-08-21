import type { ComponentProps } from 'react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import type { AttendanceRecord } from '../../features/attendance/attendanceTypes';
import type { AuditLog } from '../../features/audit/auditTypes';
import { useAuth } from '../../features/auth/useAuth';
import type { Contract } from '../../features/contracts/contractTypes';
import type { LeaveRequest } from '../../features/leave/leaveTypes';
import { useEmployeeDetail } from '../../features/employees/useEmployeeDetail';
import { updateEmployeeBioTimeCode } from '../../features/employees/employeesApi';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate, formatDateTime } from '../../shared/utils/date';
import { AccountTab } from './tabs/AccountTab';
import { AccessTab } from './tabs/AccessTab';
import { InfoRow as InfoRowBase } from '../../shared/components/InfoRow';

/** InfoRow của màn này: cố định bề rộng nhãn để các dòng thẳng cột. */
function InfoRow(props: Omit<ComponentProps<typeof InfoRowBase>, 'labelWidth'>) {
  return <InfoRowBase labelWidth={140} {...props} />;
}


export function EmployeeDetailPage() {
  const { id: employeeId } = useParams();
  const { can } = useAuth();
  const canReadAccount = can('auth.user.read');

  const { data, isLoading, error, refetch } = useEmployeeDetail(employeeId, {
    includeAccount: canReadAccount,
  });

  const queryClient = useQueryClient();
  const [bioTimeEditing, { open: openBioTimeEdit, close: closeBioTimeEdit }] =
    useDisclosure(false);
  const [bioTimeInput, setBioTimeInput] = useState('');

  const bioTimeMutation = useMutation({
    mutationFn: (code: string | null) =>
      updateEmployeeBioTimeCode(employeeId!, code),
    onSuccess: () => {
      closeBioTimeEdit();
      setBioTimeInput('');
      void queryClient.invalidateQueries({ queryKey: ['employee-detail'] });
      notifications.show({
        color: 'green',
        title: 'Đã cập nhật mã chấm công',
        message: 'Mã chấm công BioTime đã được cập nhật.',
      });
    },
    onError: (err) => {
      notifications.show({
        color: 'red',
        title: 'Không cập nhật được mã chấm công',
        message: err instanceof Error ? err.message : 'Lỗi không xác định.',
      });
    },
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const { employee } = data;

  return (
    <>
      <PageHeader
        title={`${employee.employeeCode} — ${employee.fullName}`}
        subtitle={employee.currentEmployeeAssignment?.jobTitle ?? 'Chưa có phân công'}
        breadcrumbs={['Nhân sự', employee.employeeCode]}
      />

      <Card withBorder mb="md">
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="xs">
          <InfoRow label="Trạng thái nhân sự">
            <StatusTag status={employee.employmentStatus} />
          </InfoRow>
          <InfoRow label="Trạng thái tài khoản">
            <StatusTag status={employee.accountStatus ?? 'NOT_CREATED'} />
          </InfoRow>
          <InfoRow label="Mã nhân sự">{employee.employeeCode}</InfoRow>
          <InfoRow label="Mã chấm công BioTime">
            {bioTimeEditing ? (
              <Group gap="xs" wrap="nowrap">
                <TextInput
                  size="xs"
                  placeholder="108"
                  value={bioTimeInput}
                  onChange={(e) => setBioTimeInput(e.currentTarget.value)}
                  style={{ width: 100 }}
                />
                <Button
                  size="xs"
                  onClick={() =>
                    bioTimeMutation.mutate(bioTimeInput.trim() || null)
                  }
                  loading={bioTimeMutation.isPending}
                >
                  Lưu
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    closeBioTimeEdit();
                    setBioTimeInput('');
                  }}
                >
                  Hủy
                </Button>
              </Group>
            ) : (
              <Group gap="xs" wrap="nowrap">
                <Text size="sm" c={employee.biotimeEmployeeCode ? undefined : 'dimmed'}>
                  {employee.biotimeEmployeeCode ?? '—'}
                </Text>
                {can('hr.employee.update') && (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    onClick={() => {
                      setBioTimeInput(employee.biotimeEmployeeCode ?? '');
                      openBioTimeEdit();
                    }}
                  >
                    Sửa
                  </Button>
                )}
              </Group>
            )}
          </InfoRow>
          <InfoRow label="Đơn vị">{employee.currentEmployeeAssignment?.unitName ?? '-'}</InfoRow>
          <InfoRow label="Phòng ban">{employee.currentEmployeeAssignment?.departmentName ?? '-'}</InfoRow>
          <InfoRow label="Chức danh">{employee.currentEmployeeAssignment?.positionName ?? '-'}</InfoRow>
          <InfoRow label="Email công ty">{employee.companyEmail ?? '-'}</InfoRow>
          <InfoRow label="Số điện thoại">{employee.phone ?? '-'}</InfoRow>
          <InfoRow label="Ngày vào làm">{formatDate(employee.hireDate)}</InfoRow>
        </SimpleGrid>
      </Card>

      <Tabs defaultValue="profile">
        <Tabs.List mb="md">
          <Tabs.Tab value="profile">Hồ sơ</Tabs.Tab>
          <Tabs.Tab value="work">Công việc</Tabs.Tab>
          <Tabs.Tab value="account">Tài khoản</Tabs.Tab>
          <Tabs.Tab value="access">Quyền truy cập</Tabs.Tab>
          <Tabs.Tab value="history">Lịch sử</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile">
          <Card withBorder>
            <Title order={5} mb="md">Thông tin cá nhân</Title>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs">
              <InfoRow label="Họ tên">{employee.fullName}</InfoRow>
              <InfoRow label="Giới tính">{employee.gender ?? '-'}</InfoRow>
              <InfoRow label="Ngày sinh">{formatDate(employee.dateOfBirth)}</InfoRow>
              <InfoRow label="CCCD/CMND">{employee.citizenIdMasked ?? '●●●●●●'}</InfoRow>
              <InfoRow label="Email công ty">{employee.companyEmail ?? '-'}</InfoRow>
              <InfoRow label="Email cá nhân">{employee.personalEmail ?? '-'}</InfoRow>
              <InfoRow label="Số điện thoại">{employee.phone ?? '-'}</InfoRow>
              <InfoRow label="Ngày vào làm">{formatDate(employee.hireDate)}</InfoRow>
            </SimpleGrid>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="work">
          <Stack gap="md">
            <Card withBorder>
              <Title order={5} mb="sm">Phân công</Title>
              {data.assignments.length === 0 ? (
                <Text c="dimmed" size="sm">Chưa có phân công</Text>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Đơn vị</Table.Th>
                      <Table.Th>Phòng ban</Table.Th>
                      <Table.Th>Chức danh</Table.Th>
                      <Table.Th>Job title</Table.Th>
                      <Table.Th>Quản lý</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.assignments.map((a, i) => (
                      <Table.Tr key={a.positionId ?? i}>
                        <Table.Td>{a.unitName ?? '-'}</Table.Td>
                        <Table.Td>{a.departmentName ?? '-'}</Table.Td>
                        <Table.Td>{a.positionName ?? '-'}</Table.Td>
                        <Table.Td>{a.jobTitle ?? '-'}</Table.Td>
                        <Table.Td>{a.managerName ?? '-'}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>

            <Card withBorder>
              <Title order={5} mb="sm">Hợp đồng</Title>
              {data.contracts.length === 0 ? (
                <Text c="dimmed" size="sm">Chưa có hợp đồng</Text>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Số HĐ</Table.Th>
                      <Table.Th>Loại</Table.Th>
                      <Table.Th>Ngày bắt đầu</Table.Th>
                      <Table.Th>Ngày kết thúc</Table.Th>
                      <Table.Th>Trạng thái</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.contracts.map((c: Contract) => (
                      <Table.Tr key={c.id}>
                        <Table.Td>{c.contractNo ?? '-'}</Table.Td>
                        <Table.Td>{c.contractType ?? '-'}</Table.Td>
                        <Table.Td>{formatDate(c.startDate)}</Table.Td>
                        <Table.Td>{formatDate(c.endDate)}</Table.Td>
                        <Table.Td><StatusTag status={c.status} /></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="account">
          <Card withBorder>
            <AccountTab employee={employee} />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="access">
          <Card withBorder>
            <AccessTab employee={employee} />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <Stack gap="md">
            <Card withBorder>
              <Title order={5} mb="sm">Nghỉ phép</Title>
              {data.leaveRequests.length === 0 ? (
                <Text c="dimmed" size="sm">Chưa có đơn nghỉ phép</Text>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Loại nghỉ</Table.Th>
                      <Table.Th>Từ ngày</Table.Th>
                      <Table.Th>Đến ngày</Table.Th>
                      <Table.Th>Số ngày</Table.Th>
                      <Table.Th>Trạng thái</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.leaveRequests.map((r: LeaveRequest) => (
                      <Table.Tr key={r.id}>
                        <Table.Td>{r.leaveType ?? '-'}</Table.Td>
                        <Table.Td>{formatDate(r.startDate)}</Table.Td>
                        <Table.Td>{formatDate(r.endDate)}</Table.Td>
                        <Table.Td>{r.totalDays ?? '-'}</Table.Td>
                        <Table.Td><StatusTag status={r.status} /></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>

            <Card withBorder>
              <Title order={5} mb="sm">Chấm công</Title>
              {data.attendanceRecords.length === 0 ? (
                <Text c="dimmed" size="sm">Chưa có dữ liệu chấm công</Text>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Ngày</Table.Th>
                      <Table.Th>Check in</Table.Th>
                      <Table.Th>Check out</Table.Th>
                      <Table.Th>Nguồn</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.attendanceRecords.map((r: AttendanceRecord) => (
                      <Table.Tr key={r.id}>
                        <Table.Td>{formatDate(r.workDate)}</Table.Td>
                        <Table.Td>{formatDateTime(r.checkIn, 'HH:mm')}</Table.Td>
                        <Table.Td>{formatDateTime(r.checkOut, 'HH:mm')}</Table.Td>
                        <Table.Td>{r.source ?? '-'}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>

            <Card withBorder>
              <Title order={5} mb="sm">Nhật ký thao tác</Title>
              {data.auditLogs.length === 0 ? (
                <Text c="dimmed" size="sm">Chưa có nhật ký</Text>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Hành động</Table.Th>
                      <Table.Th>Người thực hiện</Table.Th>
                      <Table.Th>Thời gian</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.auditLogs.map((r: AuditLog) => (
                      <Table.Tr key={r.id}>
                        <Table.Td><Badge variant="light">{r.action}</Badge></Table.Td>
                        <Table.Td>{r.actorName ?? '-'}</Table.Td>
                        <Table.Td>{formatDateTime(r.createdAt)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
