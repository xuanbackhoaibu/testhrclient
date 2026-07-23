import { useState } from 'react';
import { ActionIcon, Badge, Button, Drawer, Group, Select, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconRefresh } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../features/auth/useAuth';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';
import { createAssignment, deactivateAssignment, listAssignments, revokeAssignment, type Assignment, type AssignmentWrite, activateAssignment } from '../../features/work-report-authorizations/canonicalWorkReportAuthorizationsApi';

const MANAGE = 'admin.work_report_authorization.manage';
const AUDIT = 'admin.work_report_authorization.audit';
const initial: AssignmentWrite = { authUserId: '', employeeId: '', roleKey: 'REPORTER', actions: ['SUBMIT'], effect: 'ALLOW', scopeType: 'SELF', scopeId: '', reportingTargetType: 'EMPLOYEE', reportingTargetId: '', sourceType: 'DIRECT' };

export function WorkReportAuthorizationsPage() {
  const client = useQueryClient(); const { can } = useAuth();
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [status, setStatus] = useState<string | null>(''); const [opened, setOpened] = useState(false); const [form, setForm] = useState(initial);
  const [debounced] = useDebouncedValue(search, 300);
  const query = useQuery({ queryKey: ['work-report-authorizations', page, debounced, status], queryFn: () => listAssignments({ page, pageSize: 20, status: status || undefined, authUserId: debounced || undefined }) });
  const refresh = () => client.invalidateQueries({ queryKey: ['work-report-authorizations'] });
  const mutation = useMutation({ mutationFn: createAssignment, onSuccess: () => { notifications.show({ color: 'green', message: 'Đã cấp phân quyền báo cáo công việc' }); setOpened(false); setForm(initial); refresh(); }, onError: () => notifications.show({ color: 'red', message: 'Không thể cấp phân quyền. Kiểm tra dữ liệu và quyền hiện tại.' }) });
  const transition = useMutation({ mutationFn: async ({ row, action }: { row: Assignment; action: 'activate' | 'deactivate' | 'revoke' }) => action === 'activate' ? activateAssignment(row.id, row.assignmentVersion) : action === 'deactivate' ? deactivateAssignment(row.id, row.assignmentVersion) : revokeAssignment(row.id, row.assignmentVersion, 'Thu hồi theo yêu cầu quản trị'), onSuccess: refresh, onError: () => notifications.show({ color: 'red', message: 'Thao tác bị từ chối hoặc bản ghi đã thay đổi. Hãy tải lại.' }) });
  const columns: DataTableColumn<Assignment>[] = [
    { key: 'subject', header: 'Đối tượng', render: r => <Stack gap={0}><Text size="sm" fw={600}>{r.employeeId}</Text><Text size="xs" c="dimmed">{r.authUserId}</Text></Stack> },
    { key: 'role', header: 'Vai trò / hành động', render: r => <><Text size="sm">{r.roleKey}</Text><Text size="xs" c="dimmed">{r.actions.join(', ')}</Text></> },
    { key: 'scope', header: 'Phạm vi', render: r => <Text size="sm">{r.scopeType}: {r.scopeId || '—'}</Text> },
    { key: 'status', header: 'Trạng thái', render: r => <Badge color={r.status === 'ACTIVE' ? 'green' : r.status === 'REVOKED' ? 'red' : 'yellow'}>{r.status}</Badge> },
    { key: 'actions', header: 'Thao tác', render: r => can(MANAGE) ? <Group gap={4}><Button size="compact-xs" variant="subtle" onClick={() => transition.mutate({ row: r, action: r.status === 'ACTIVE' ? 'deactivate' : 'activate' })}>{r.status === 'ACTIVE' ? 'Tắt' : 'Bật'}</Button><Button size="compact-xs" color="red" variant="subtle" onClick={() => transition.mutate({ row: r, action: 'revoke' })}>Thu hồi</Button></Group> : '—' },
  ];
  return <Stack gap="lg"><PageHeader title="Phân quyền báo cáo công việc" subtitle="Quản lý assignment canonical tại Chat Auth qua HR API BFF; mọi thay đổi được audit theo delegated actor." actions={<Group><ActionIcon variant="default" onClick={refresh}><IconRefresh size={16} /></ActionIcon>{can(MANAGE) && <Button leftSection={<IconPlus size={16} />} onClick={() => setOpened(true)}>Cấp quyền</Button>}</Group>} />
    <Group align="end"><TextInput label="Tìm auth user ID" value={search} onChange={e => { setSearch(e.currentTarget.value); setPage(1); }} w={320} /><Select label="Trạng thái" value={status} onChange={v => { setStatus(v); setPage(1); }} data={[{ value: '', label: 'Tất cả' }, 'ACTIVE', 'INACTIVE', 'REVOKED']} w={180} /><Text size="xs" c="dimmed">Audit endpoint yêu cầu quyền {AUDIT}.</Text></Group>
    <DataTable data={query.data?.items ?? []} columns={columns} rowKey={r => r.id} loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} meta={query.data ? { page: query.data.page, pageSize: query.data.pageSize, total: query.data.total, totalPages: Math.max(1, Math.ceil(query.data.total / query.data.pageSize)), hasNextPage: query.data.hasNext, hasPreviousPage: query.data.page > 1 } : undefined} onPageChange={p => setPage(p)} />
    <Drawer opened={opened} onClose={() => setOpened(false)} title="Cấp quyền báo cáo công việc" position="right" size="lg"><Stack><TextInput required label="Auth user ID" value={form.authUserId} onChange={e => setForm({ ...form, authUserId: e.currentTarget.value })} /><TextInput required label="Employee ID" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.currentTarget.value })} /><Select label="Vai trò" value={form.roleKey} onChange={v => setForm({ ...form, roleKey: v ?? 'REPORTER' })} data={['REPORTER', 'REVIEWER', 'APPROVER', 'MANAGER']} /><Select label="Hành động" value={form.actions[0]} onChange={v => setForm({ ...form, actions: [v ?? 'SUBMIT'] })} data={['SUBMIT', 'VIEW', 'COMMENT', 'APPROVE', 'REJECT']} /><Select label="Phạm vi" value={form.scopeType} onChange={v => setForm({ ...form, scopeType: v ?? 'SELF' })} data={['SELF', 'EMPLOYEE', 'DEPARTMENT', 'ORG_UNIT', 'COMPANY']} /><TextInput label="Scope ID (để trống cho SELF)" value={form.scopeId} onChange={e => setForm({ ...form, scopeId: e.currentTarget.value })} /><Select label="Đối tượng báo cáo" value={form.reportingTargetType} onChange={v => setForm({ ...form, reportingTargetType: v ?? 'EMPLOYEE' })} data={['EMPLOYEE', 'DEPARTMENT', 'ORG_UNIT', 'COMPANY']} /><TextInput label="Reporting target ID" value={form.reportingTargetId} onChange={e => setForm({ ...form, reportingTargetId: e.currentTarget.value })} /><Textarea label="Lý do" value={form.reason ?? ''} onChange={e => setForm({ ...form, reason: e.currentTarget.value })} /><Button loading={mutation.isPending} onClick={() => mutation.mutate(form)} disabled={!form.authUserId || !form.employeeId}>Xác nhận cấp quyền</Button></Stack></Drawer>
  </Stack>;
}
