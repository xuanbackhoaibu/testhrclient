import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CopyButton,
  Divider,
  Group,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Timeline,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconBriefcase,
  IconCalendarTime,
  IconCheck,
  IconCopy,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconFileText,
  IconHistory,
  IconId,
  IconKey,
  IconMail,
  IconShieldCheck,
  IconUser,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import type { AttendanceRecord } from '../../features/attendance/attendanceTypes';
import type { AuditLog } from '../../features/audit/auditTypes';
import { useAuth } from '../../features/auth/useAuth';
import type { Contract } from '../../features/contracts/contractTypes';
import { useEmployeeDetail } from '../../features/employees/useEmployeeDetail';
import type { Employee } from '../../features/employees/employeeTypes';
import { updateEmployeeBioTimeCode } from '../../features/employees/employeesApi';
import type { LeaveRequest } from '../../features/leave/leaveTypes';
import type { Movement } from '../../features/movements/movementTypes';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { ROUTES } from '../../shared/constants/routes';
import { formatDate, formatDateTime } from '../../shared/utils/date';
import { AccountTab } from './tabs/AccountTab';
import { AccessTab } from './tabs/AccessTab';

const workStatusMap: Record<string, { color: string; label: string; dotClass: string }> = {
  ACTIVE: { color: 'green', label: 'Đang làm việc', dotClass: 'is-active' },
  WORKING: { color: 'green', label: 'Đang làm việc', dotClass: 'is-active' },
  PROBATION: { color: 'yellow', label: 'Thử việc', dotClass: 'is-probation' },
  TERMINATED: { color: 'red', label: 'Đã nghỉ việc', dotClass: 'is-terminated' },
  INACTIVE: { color: 'red', label: 'Ngừng làm việc', dotClass: 'is-terminated' },
};

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start" className="employee-detail-info-row">
      <Text size="sm" c="dimmed" className="employee-detail-info-label">
        {label}
      </Text>
      <Box fz="sm" fw={600} className="employee-detail-info-value">
        {children}
      </Box>
    </Group>
  );
}

function DetailEmpty({ children }: { children: ReactNode }) {
  return (
    <Text c="dimmed" size="sm" className="employee-detail-empty">
      {children}
    </Text>
  );
}

function DetailTable({ children }: { children: ReactNode }) {
  return (
    <ScrollArea type="auto" offsetScrollbars className="employee-detail-table-scroll">
      <Table striped highlightOnHover miw={720} className="employee-detail-table">
        {children}
      </Table>
    </ScrollArea>
  );
}

function SensitiveInfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const displayValue = value || '-';
  const maskedValue = value ? '••••••••' : '-';

  return (
    <InfoRow label={label}>
      <Group gap={6} wrap="nowrap" className="employee-detail-sensitive">
        <Text component="span" size="sm" fw={650}>
          {visible ? displayValue : maskedValue}
        </Text>
        {value && (
          <>
            <Tooltip label={visible ? 'Ẩn thông tin' : 'Hiện thông tin'}>
              <ActionIcon
                aria-label={visible ? `Ẩn ${label}` : `Hiện ${label}`}
                size="sm"
                variant="subtle"
                onClick={() => setVisible((current) => !current)}
              >
                {visible ? <IconEyeOff size={15} /> : <IconEye size={15} />}
              </ActionIcon>
            </Tooltip>
            <CopyButton value={value}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Đã copy' : 'Copy'}>
                  <ActionIcon aria-label={`Copy ${label}`} size="sm" variant="subtle" color={copied ? 'green' : undefined} onClick={copy}>
                    {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </>
        )}
      </Group>
    </InfoRow>
  );
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card withBorder className="employee-detail-section">
      <Group justify="space-between" align="center" mb="md">
        <Title order={5}>{title}</Title>
        {action}
      </Group>
      {children}
    </Card>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getWorkStatus(status?: string | null) {
  return workStatusMap[(status ?? '').toUpperCase()] ?? {
    color: 'gray',
    label: status || 'Chưa rõ',
    dotClass: 'is-muted',
  };
}

function getAccountLabel(employee: Employee) {
  if (employee.accountDisplayStatus) return employee.accountDisplayStatus;
  if (employee.hasAccount || employee.authUserId || employee.account?.linked) {
    return employee.accountStatus === 'ACTIVE' ? 'Đã liên kết' : employee.accountStatus ?? 'Đã liên kết';
  }
  return 'Chưa cấp tài khoản';
}

function daysUntil(date?: string) {
  if (!date) return null;
  const end = new Date(date);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
}

function ContractExpiryBadge({ contract }: { contract: Contract }) {
  const remaining = daysUntil(contract.endDate);
  if (remaining === null) return <Badge color="gray" variant="light">Không thời hạn</Badge>;
  if (contract.status !== 'ACTIVE') return <StatusTag status={contract.status} />;
  if (remaining <= 15) {
    return (
      <Badge color="red" variant="filled" className="contract-expiry-critical">
        Còn {remaining} ngày
      </Badge>
    );
  }
  if (remaining <= 30) return <Badge color="yellow" variant="light">Còn {remaining} ngày</Badge>;
  return <Badge color="green" variant="light">Còn hiệu lực</Badge>;
}

function getAttendanceKind(record?: AttendanceRecord, leave?: LeaveRequest) {
  if (leave) return 'leave';
  if (!record) return 'empty';
  const checkIn = record.checkIn ? new Date(record.checkIn) : null;
  if (!checkIn || Number.isNaN(checkIn.getTime())) return 'absent';
  const lateBoundary = new Date(checkIn);
  lateBoundary.setHours(8, 15, 0, 0);
  return checkIn.getTime() > lateBoundary.getTime() ? 'late' : 'ok';
}

function MiniAttendanceCalendar({
  records,
  leaves,
}: {
  records: AttendanceRecord[];
  leaves: LeaveRequest[];
}) {
  const baseDate = records[0]?.workDate ? new Date(records[0].workDate) : new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const recordByDate = new Map(records.map((item) => [item.workDate.slice(0, 10), item]));

  const days = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    if (index < firstWeekday) return null;
    return index - firstWeekday + 1;
  });

  return (
    <Box>
      <Group justify="space-between" mb="sm">
        <Text fw={700}>Lịch tháng {month + 1}/{year}</Text>
        <Group gap="xs">
          <Badge size="xs" color="green" variant="light">Đủ công</Badge>
          <Badge size="xs" color="yellow" variant="light">Muộn</Badge>
          <Badge size="xs" color="red" variant="light">Vắng</Badge>
          <Badge size="xs" color="gray" variant="light">Nghỉ</Badge>
        </Group>
      </Group>
      <div className="employee-detail-mini-calendar">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
          <div key={day} className="employee-detail-calendar-head">{day}</div>
        ))}
        {days.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="employee-detail-calendar-cell is-blank" />;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = recordByDate.get(dateKey);
          const leave = leaves.find((item) => dateKey >= item.startDate.slice(0, 10) && dateKey <= item.endDate.slice(0, 10));
          const kind = getAttendanceKind(record, leave);
          return (
            <Tooltip
              key={dateKey}
              label={
                record
                  ? `Check-in: ${formatDateTime(record.checkIn, 'HH:mm')} · Check-out: ${formatDateTime(record.checkOut, 'HH:mm')}`
                  : leave
                    ? `${leave.leaveType} · ${leave.totalDays} ngày`
                    : 'Chưa có dữ liệu'
              }
            >
              <div className={`employee-detail-calendar-cell is-${kind}`}>
                <span>{day}</span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </Box>
  );
}

function LeaveQuotaCard({ leaves }: { leaves: LeaveRequest[] }) {
  const used = leaves
    .filter((item) => item.leaveType === 'ANNUAL' && item.status !== 'REJECTED')
    .reduce((sum, item) => sum + (item.totalDays ?? 0), 0);
  const quota = 12;
  const remaining = Math.max(quota - used, 0);
  const percent = Math.min((used / quota) * 100, 100);

  return (
    <Paper withBorder p="md" className="employee-detail-quota-card">
      <Group justify="space-between" align="flex-start" mb="sm">
        <Box>
          <Text fw={700}>Quỹ phép năm</Text>
          <Text size="sm" c="dimmed">Đã dùng / còn lại / sắp hết hạn</Text>
        </Box>
        <Badge color={remaining <= 2 ? 'red' : 'blue'} variant="light">
          Còn {remaining} ngày
        </Badge>
      </Group>
      <Progress value={percent} radius="xl" size="lg" mb="xs" />
      <Group justify="space-between">
        <Text size="sm">Đã dùng: <b>{used}</b> ngày</Text>
        <Text size="sm">Tổng quỹ: <b>{quota}</b> ngày</Text>
      </Group>
    </Paper>
  );
}

function afterJsonLabel(value: Record<string, unknown>) {
  const entries = Object.entries(value);
  if (entries.length === 0) return 'Không có thay đổi chi tiết';
  return entries
    .slice(0, 3)
    .map(([key, item]) => `${key}: ${String(item)}`)
    .join(' · ');
}

export function EmployeeDetailPage() {
  const { id: employeeId } = useParams();
  const navigate = useNavigate();
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

  const attendanceStats = useMemo(() => {
    const late = data?.attendanceRecords.filter((item) => getAttendanceKind(item) === 'late').length ?? 0;
    return {
      total: data?.attendanceRecords.length ?? 0,
      late,
      leave: data?.leaveRequests.filter((item) => item.status !== 'REJECTED').reduce((sum, item) => sum + item.totalDays, 0) ?? 0,
    };
  }, [data]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const { employee } = data;
  const assignment = employee.currentEmployeeAssignment;
  const workStatus = getWorkStatus(employee.employmentStatus);
  const accountLabel = getAccountLabel(employee);
  const sortedContracts = [...data.contracts].sort((a, b) => (daysUntil(a.endDate) ?? 9999) - (daysUntil(b.endDate) ?? 9999));
  const recentLeaves = [...data.leaveRequests].sort((a, b) => b.startDate.localeCompare(a.startDate)).slice(0, 5);
  const movements = [...(data.movements as Movement[])].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  const auditLogs = [...data.auditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader
        title="Chi tiết nhân viên"
        subtitle={`${employee.employeeCode} · ${employee.fullName}`}
        breadcrumbs={['Nhân sự', employee.employeeCode]}
        actions={
          <Button variant="default" onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        }
      />

      <Paper withBorder p="lg" mb="md" className="employee-detail-hero">
        <Group justify="space-between" align="flex-start" gap="lg">
          <Group align="center" gap="lg" className="employee-detail-hero-main">
            <Box className="employee-detail-avatar-wrap">
              <Avatar size={92} radius={999} color="blue" className="employee-detail-avatar">
                {getInitials(employee.fullName)}
              </Avatar>
              <span className={`employee-detail-status-dot ${workStatus.dotClass}`} aria-label={workStatus.label} />
            </Box>
            <Box>
              <Group gap="xs" mb={6}>
                <Badge color={workStatus.color} variant="light">{workStatus.label}</Badge>
                <Badge color={employee.hasAccount || employee.authUserId ? 'blue' : 'gray'} variant="light">
                  {accountLabel}
                </Badge>
              </Group>
              <Title order={2} className="employee-detail-name">{employee.fullName}</Title>
              <Text c="dimmed" fw={600}>{employee.employeeCode}</Text>
              <Text size="sm" mt={4}>
                {assignment?.jobTitle ?? assignment?.positionName ?? 'Chưa có chức danh'} · {assignment?.unitName ?? employee.unitName ?? 'Chưa có đơn vị'} / {assignment?.departmentName ?? employee.departmentName ?? 'Chưa có phòng ban'}
              </Text>
            </Box>
          </Group>

          <Group gap="xs" className="employee-detail-actions">
            <Button variant="light" leftSection={<IconEdit size={16} />} onClick={() => navigate(`${ROUTES.employees}?search=${encodeURIComponent(employee.employeeCode)}`)}>
              Sửa hồ sơ
            </Button>
            <Button variant="light" leftSection={<IconMail size={16} />} component="a" href={`mailto:${employee.companyEmail ?? employee.personalEmail ?? ''}`}>
              Gửi email
            </Button>
            <Button variant="light" leftSection={<IconCalendarTime size={16} />} onClick={() => navigate(`${ROUTES.timesheetGrid}?employeeId=${encodeURIComponent(employee.id)}`)}>
              Xem bảng công
            </Button>
            <Button variant="light" leftSection={<IconFileText size={16} />} onClick={() => navigate(`${ROUTES.contracts}?employeeId=${encodeURIComponent(employee.id)}`)}>
              Xem hợp đồng
            </Button>
          </Group>
        </Group>
      </Paper>

      <Tabs defaultValue="personal" className="employee-detail-tabs">
        <Tabs.List mb="md">
          <Tabs.Tab value="personal" leftSection={<IconUser size={15} />}>Thông tin cá nhân</Tabs.Tab>
          <Tabs.Tab value="assignment" leftSection={<IconBriefcase size={15} />}>Phân công</Tabs.Tab>
          <Tabs.Tab value="contracts" leftSection={<IconFileText size={15} />}>Hợp đồng</Tabs.Tab>
          <Tabs.Tab value="attendance" leftSection={<IconCalendarTime size={15} />}>Chấm công</Tabs.Tab>
          <Tabs.Tab value="leave" leftSection={<IconId size={15} />}>Nghỉ phép</Tabs.Tab>
          <Tabs.Tab value="movements" leftSection={<IconHistory size={15} />}>Điều chuyển</Tabs.Tab>
          <Tabs.Tab value="account" leftSection={<IconKey size={15} />}>Tài khoản</Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconShieldCheck size={15} />}>Lịch sử</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="personal">
          <SectionCard title="Thông tin cá nhân">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" className="employee-detail-info-grid">
              <InfoRow label="Họ tên">{employee.fullName}</InfoRow>
              <InfoRow label="Giới tính">{employee.gender ?? '-'}</InfoRow>
              <SensitiveInfoRow label="Ngày sinh" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : null} />
              <SensitiveInfoRow label="CCCD/CMND" value={employee.citizenIdMasked} />
              <InfoRow label="Email công ty">{employee.companyEmail ?? '-'}</InfoRow>
              <InfoRow label="Email cá nhân">{employee.personalEmail ?? '-'}</InfoRow>
              <SensitiveInfoRow label="Số điện thoại cá nhân" value={employee.phone} />
              <InfoRow label="Ngày vào làm">{formatDate(employee.hireDate)}</InfoRow>
              <InfoRow label="Mã chấm công BioTime">
                {bioTimeEditing ? (
                  <Group gap="xs" wrap="nowrap">
                    <TextInput
                      size="xs"
                      placeholder="108"
                      value={bioTimeInput}
                      onChange={(event) => setBioTimeInput(event.currentTarget.value)}
                      w={110}
                    />
                    <Button size="xs" onClick={() => bioTimeMutation.mutate(bioTimeInput.trim() || null)} loading={bioTimeMutation.isPending}>
                      Lưu
                    </Button>
                    <Button size="xs" variant="subtle" onClick={() => { closeBioTimeEdit(); setBioTimeInput(''); }}>
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
            </SimpleGrid>
          </SectionCard>
        </Tabs.Panel>

        <Tabs.Panel value="assignment">
          <Stack gap="md">
            <SectionCard title="Phân công hiện tại">
              <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
                <InfoRow label="Đơn vị">{assignment?.unitName ?? '-'}</InfoRow>
                <InfoRow label="Phòng ban">{assignment?.departmentName ?? '-'}</InfoRow>
                <InfoRow label="Chức danh">{assignment?.positionName ?? '-'}</InfoRow>
                <InfoRow label="Job title">{assignment?.jobTitle ?? '-'}</InfoRow>
                <InfoRow label="Quản lý">{assignment?.managerName ?? '-'}</InfoRow>
              </SimpleGrid>
            </SectionCard>

            <SectionCard title="Lịch sử phân công">
              {data.assignments.length === 0 ? (
                <DetailEmpty>Chưa có lịch sử phân công.</DetailEmpty>
              ) : (
                <Timeline active={data.assignments.length - 1} bulletSize={26} lineWidth={2}>
                  {data.assignments.map((item, index) => (
                    <Timeline.Item key={`${item.positionId}-${index}`} title={item.jobTitle || item.positionName}>
                      <Text size="sm">{item.unitName} · {item.departmentName}</Text>
                      <Text size="xs" c="dimmed">Quản lý: {item.managerName || '-'}</Text>
                    </Timeline.Item>
                  ))}
                </Timeline>
              )}
            </SectionCard>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="contracts">
          <SectionCard
            title="Hợp đồng"
            action={<Button size="xs" variant="light" onClick={() => navigate(`${ROUTES.contracts}?employeeId=${encodeURIComponent(employee.id)}&action=renew`)}>Gia hạn nhanh</Button>}
          >
            {sortedContracts.length === 0 ? (
              <DetailEmpty>Chưa có hợp đồng cho nhân viên này.</DetailEmpty>
            ) : (
              <DetailTable>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Số HĐ</Table.Th>
                    <Table.Th>Loại</Table.Th>
                    <Table.Th>Ngày bắt đầu</Table.Th>
                    <Table.Th>Ngày kết thúc</Table.Th>
                    <Table.Th>Tình trạng</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sortedContracts.map((contract) => (
                    <Table.Tr key={contract.id}>
                      <Table.Td>{contract.contractNo}</Table.Td>
                      <Table.Td>{contract.contractType}</Table.Td>
                      <Table.Td>{formatDate(contract.startDate)}</Table.Td>
                      <Table.Td>{formatDate(contract.endDate)}</Table.Td>
                      <Table.Td><ContractExpiryBadge contract={contract} /></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </DetailTable>
            )}
          </SectionCard>
        </Tabs.Panel>

        <Tabs.Panel value="attendance">
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Paper withBorder p="md" className="employee-detail-stat-card">
                <Text size="xs" c="dimmed" fw={700}>Tổng công</Text>
                <Title order={3}>{attendanceStats.total}</Title>
              </Paper>
              <Paper withBorder p="md" className="employee-detail-stat-card">
                <Text size="xs" c="dimmed" fw={700}>Đi muộn</Text>
                <Title order={3}>{attendanceStats.late}</Title>
              </Paper>
              <Paper withBorder p="md" className="employee-detail-stat-card">
                <Text size="xs" c="dimmed" fw={700}>Nghỉ phép</Text>
                <Title order={3}>{attendanceStats.leave}</Title>
              </Paper>
            </SimpleGrid>
            <SectionCard title="Mini lịch chấm công">
              <MiniAttendanceCalendar records={data.attendanceRecords} leaves={data.leaveRequests} />
            </SectionCard>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="leave">
          <Stack gap="md">
            <LeaveQuotaCard leaves={data.leaveRequests} />
            <SectionCard title="Đơn nghỉ gần nhất">
              {recentLeaves.length === 0 ? (
                <DetailEmpty>Chưa có đơn nghỉ phép gần đây.</DetailEmpty>
              ) : (
                <DetailTable>
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
                    {recentLeaves.map((request) => (
                      <Table.Tr key={request.id}>
                        <Table.Td>{request.leaveType}</Table.Td>
                        <Table.Td>{formatDate(request.startDate)}</Table.Td>
                        <Table.Td>{formatDate(request.endDate)}</Table.Td>
                        <Table.Td>{request.totalDays}</Table.Td>
                        <Table.Td><StatusTag status={request.status} /></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </DetailTable>
              )}
            </SectionCard>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="movements">
          <SectionCard title="Lịch sử điều chuyển">
            {movements.length === 0 ? (
              <DetailEmpty>Chưa có lịch sử điều chuyển.</DetailEmpty>
            ) : (
              <Timeline bulletSize={28} lineWidth={2}>
                {movements.map((movement) => (
                  <Timeline.Item
                    key={movement.id}
                    title={
                      <Group gap="xs">
                        <Badge variant="light">{movement.movementType}</Badge>
                        <Text fw={700}>{formatDate(movement.effectiveDate)}</Text>
                      </Group>
                    }
                  >
                    <Text size="sm">{movement.reason}</Text>
                    <Text size="xs" c="dimmed">{afterJsonLabel(movement.afterJson)}</Text>
                    <StatusTag status={movement.status} />
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </SectionCard>
        </Tabs.Panel>

        <Tabs.Panel value="account">
          <Stack gap="md">
            <SectionCard
              title="Trạng thái tài khoản"
              action={
                !employee.hasAccount && !employee.authUserId ? (
                  <Button size="xs" variant="light" onClick={() => navigate(`${ROUTES.accounts}?employeeCode=${encodeURIComponent(employee.employeeCode)}`)}>
                    Cấp tài khoản
                  </Button>
                ) : null
              }
            >
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                <InfoRow label="Liên kết">{employee.hasAccount || employee.authUserId ? 'Đã liên kết' : 'Chưa liên kết'}</InfoRow>
                <InfoRow label="Trạng thái"><StatusTag status={employee.accountStatus ?? 'NOT_CREATED'} /></InfoRow>
                <InfoRow label="Email đăng nhập">{employee.account?.email ?? employee.companyEmail ?? '-'}</InfoRow>
              </SimpleGrid>
            </SectionCard>
            <Card withBorder className="employee-detail-section">
              <AccountTab employee={employee} />
              <Divider my="lg" />
              <AccessTab employee={employee} />
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <SectionCard title="Lịch sử thay đổi hồ sơ">
            {auditLogs.length === 0 ? (
              <DetailEmpty>Chưa có nhật ký thao tác cho nhân viên này.</DetailEmpty>
            ) : (
              <Timeline bulletSize={30} lineWidth={2}>
                {auditLogs.map((log: AuditLog) => (
                  <Timeline.Item
                    key={log.id}
                    bullet={
                      <ThemeIcon size={24} radius="xl" variant="light">
                        <IconHistory size={14} />
                      </ThemeIcon>
                    }
                    title={
                      <Group gap="xs">
                        <Badge variant="light">{log.action}</Badge>
                        <Text fw={700}>{log.actorName ?? 'Hệ thống'}</Text>
                      </Group>
                    }
                  >
                    <Text size="sm" c="dimmed">{formatDateTime(log.createdAt)}</Text>
                    <Text size="xs" mt={4}>{afterJsonLabel((log.afterJson ?? {}) as Record<string, unknown>)}</Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </SectionCard>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
