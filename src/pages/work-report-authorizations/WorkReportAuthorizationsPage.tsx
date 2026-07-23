import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Button, Drawer, Group, Radio, Stack, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconRefresh } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../features/auth/useAuth';
import { listEmployees } from '../../features/employees/employeesApi';
import type { Employee } from '../../features/employees/employeeTypes';
import { createAssignment, listAssignments, type AssignmentWrite } from '../../features/work-report-authorizations/canonicalWorkReportAuthorizationsApi';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';

const MANAGE = 'admin.work_report_authorization.manage';
type BusinessPermission = 'DEPARTMENT' | 'UNIT' | 'CORPORATE';
const labels: Record<BusinessPermission, { title: string; description: string }> = {
  DEPARTMENT: { title: 'Tổng hợp cấp phòng', description: 'Xem và tổng hợp báo cáo của nhân sự trong phòng.' },
  UNIT: { title: 'Báo cáo lãnh đạo đơn vị', description: 'Xem báo cáo tổng hợp của các phòng trong đơn vị.' },
  CORPORATE: { title: 'Tổng hợp Tổng công ty', description: 'Xem và tổng hợp báo cáo của các đơn vị.' },
};

function businessPayload(employee: Employee, permission: BusinessPermission): AssignmentWrite | null {
  if (!employee.authUserId) return null;
  const assignment = employee.currentEmployeeAssignment;
  if (permission === 'DEPARTMENT' && assignment?.departmentId) return { authUserId: employee.authUserId, employeeId: employee.id, roleKey: 'MANAGER', actions: ['VIEW', 'COMMENT'], effect: 'ALLOW', scopeType: 'DEPARTMENT', scopeId: assignment.departmentId, reportingTargetType: 'DEPARTMENT', reportingTargetId: assignment.departmentId, sourceType: 'DIRECT' };
  if (permission === 'UNIT' && assignment?.unitId) return { authUserId: employee.authUserId, employeeId: employee.id, roleKey: 'MANAGER', actions: ['VIEW', 'COMMENT'], effect: 'ALLOW', scopeType: 'ORG_UNIT', scopeId: assignment.unitId, reportingTargetType: 'ORG_UNIT', reportingTargetId: assignment.unitId, sourceType: 'DIRECT' };
  return null;
}

export function WorkReportAuthorizationsPage() {
  const client = useQueryClient(); const { can } = useAuth();
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [drawer, setDrawer] = useState(false); const [subject, setSubject] = useState<Employee | null>(null); const [permission, setPermission] = useState<BusinessPermission>('DEPARTMENT');
  const [debounced] = useDebouncedValue(search, 300);
  const employees = useQuery({ queryKey: ['work-report-matrix', page, debounced], queryFn: () => listEmployees({ page, pageSize: 20, search: debounced || undefined }) });
  const assignments = useQuery({ queryKey: ['work-report-assignments'], queryFn: () => listAssignments({ page: 1, pageSize: 100 }) });
  const assignmentByEmployee = useMemo(() => new Map((assignments.data?.items ?? []).map(item => [item.employeeId, item])), [assignments.data]);
  const refresh = () => { void client.invalidateQueries({ queryKey: ['work-report-matrix'] }); void client.invalidateQueries({ queryKey: ['work-report-assignments'] }); };
  const grant = useMutation({ mutationFn: async () => { if (!subject) throw new Error('Chọn nhân sự'); const payload = businessPayload(subject, permission); if (!payload) throw new Error('Không xác định được phạm vi hợp lệ từ hồ sơ nhân sự'); return createAssignment(payload); }, onSuccess: () => { notifications.show({ color: 'green', message: `Đã cấp quyền cho ${subject?.fullName ?? 'nhân sự'}.` }); setDrawer(false); refresh(); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể cấp quyền. Vui lòng thử lại.' }) });
  const columns: DataTableColumn<Employee>[] = [
    { key: 'employee', header: 'Nhân sự', render: e => <Stack gap={0}><Text fw={600} size="sm">{e.fullName}</Text><Text size="xs" c="dimmed">{e.companyEmail ?? e.personalEmail ?? 'Chưa có email'}</Text></Stack> },
    { key: 'code', header: 'Mã nhân sự', render: e => e.employeeCode },
    { key: 'unit', header: 'Đơn vị / phòng ban', render: e => <Text size="sm">{e.currentEmployeeAssignment?.unitName ?? 'Chưa xác định'}<br />{e.currentEmployeeAssignment?.departmentName ?? 'Chưa xác định'}</Text> },
    { key: 'personal', header: 'Báo cáo cá nhân', render: e => <Badge color={e.authUserId && e.employmentStatus === 'ACTIVE' ? 'green' : 'gray'}>Mặc định</Badge> },
    { key: 'weekly', header: 'Công việc tuần', render: () => <Badge color="green">Mặc định</Badge> },
    { key: 'managed', header: 'Quyền tổng hợp', render: e => { const a = assignmentByEmployee.get(e.id); return <Badge color={a?.status === 'ACTIVE' ? 'blue' : 'gray'}>{a?.status === 'ACTIVE' ? 'Đang hoạt động' : 'Chưa cấp'}</Badge>; } },
    { key: 'actions', header: 'Thao tác', render: e => can(MANAGE) ? <Button size="compact-sm" variant="light" onClick={() => { setSubject(e); setDrawer(true); }}>Cấp quyền</Button> : '—' },
  ];
  const items = employees.data?.data ?? employees.data?.items ?? [];
  const meta = employees.data?.meta ?? employees.data?.pagination;
  return <Stack gap="lg"><PageHeader title="Phân quyền báo cáo công việc" subtitle="Quản lý quyền tổng hợp báo cáo theo phòng ban, đơn vị và Tổng công ty." actions={<Group><ActionIcon variant="default" onClick={refresh}><IconRefresh size={16} /></ActionIcon>{can(MANAGE) && <Button leftSection={<IconPlus size={16} />} onClick={() => { setSubject(null); setDrawer(true); }}>Cấp quyền</Button>}<Button variant="default" disabled>Cấp quyền hàng loạt</Button><Button variant="default" disabled>Nhập từ Excel</Button><Button variant="default" disabled>Xuất danh sách</Button></Group>} />
    <TextInput label="Tìm nhân sự" placeholder="Tìm theo tên, mã nhân sự, email hoặc tài khoản" value={search} onChange={e => { setSearch(e.currentTarget.value); setPage(1); }} w={420} />
    <DataTable data={items} columns={columns} rowKey={e => e.id} loading={employees.isLoading} error={employees.error} onRetry={() => employees.refetch()} meta={meta} onPageChange={p => setPage(p)} emptyTitle="Chưa có nhân sự phù hợp" />
    <Drawer opened={drawer} onClose={() => setDrawer(false)} title="Cấp quyền báo cáo công việc" position="right" size="xl"><Stack gap="lg"><Text fw={600}>1. Chọn nhân sự</Text>{subject ? <Text>{subject.fullName} · {subject.employeeCode} · {subject.currentEmployeeAssignment?.departmentName ?? 'Chưa xác định phòng ban'}</Text> : <Text c="dimmed">Chọn một nhân sự từ bảng để cấp quyền.</Text>}<Text fw={600}>2. Chọn quyền cần phân công</Text><Radio.Group value={permission} onChange={value => setPermission(value as BusinessPermission)}>{(Object.keys(labels) as BusinessPermission[]).map(key => <Radio key={key} value={key} label={<><Text fw={500}>{labels[key].title}</Text><Text size="xs" c="dimmed">{labels[key].description}</Text></>} mb="sm" disabled={key === 'CORPORATE'} />)}</Radio.Group><Text size="xs" c="dimmed">Quyền Tổng công ty sẽ được mở khi API nghiệp vụ cấp Tổng công ty được phát hành.</Text><Text fw={600}>3. Xác nhận phân quyền</Text><Text size="sm">Báo cáo cá nhân và công việc tuần là quyền mặc định. Hệ thống chỉ thêm quyền tổng hợp bạn đã chọn.</Text><Button loading={grant.isPending} disabled={!subject || permission === 'CORPORATE'} onClick={() => grant.mutate()}>Xác nhận cấp quyền</Button></Stack></Drawer>
  </Stack>;
}
