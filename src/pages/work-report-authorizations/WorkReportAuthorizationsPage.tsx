import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Button, Drawer, Group, MultiSelect, Select, Stack, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconRefresh } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../features/auth/useAuth';
import {
  applyBusinessBatch, createBusinessGrant, getCorporation, listBusinessDepartments, listBusinessEmployees, listBusinessUnits,
  listMatrix, previewBusinessBatch, previewBusinessGrant, type BusinessGrant, type BusinessPermission, type MatrixRow,
} from '../../features/work-report-authorizations/canonicalWorkReportAuthorizationsApi';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';

const MANAGE = 'admin.work_report_authorization.manage';
const permissionLabel: Record<BusinessPermission['type'], string> = {
  DEPARTMENT_REPORT: 'Tổng hợp cấp phòng', UNIT_REPORT: 'Báo cáo lãnh đạo đơn vị', CORPORATE_REPORT: 'Tổng hợp Tổng công ty',
};

const permissionSummary = (row: MatrixRow) => row.permissions.length
  ? row.permissions.map((permission) => permissionLabel[permission.type]).join(', ')
  : 'Chưa cấp';

export function WorkReportAuthorizationsPage() {
  const client = useQueryClient();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [subject, setSubject] = useState<MatrixRow | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [corporate, setCorporate] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [debounced] = useDebouncedValue(search, 300);

  const matrix = useQuery({ queryKey: ['work-report-matrix', page, debounced, departmentId, unitId], queryFn: () => listMatrix({ page, pageSize: 20, search: debounced || undefined, departmentId: departmentId ?? undefined, unitId: unitId ?? undefined }) });
  const departments = useQuery({ queryKey: ['work-report-options', 'departments'], queryFn: () => listBusinessDepartments() });
  const units = useQuery({ queryKey: ['work-report-options', 'units'], queryFn: () => listBusinessUnits() });
  const employeeOptions = useQuery({ queryKey: ['work-report-options', 'employees'], queryFn: () => listBusinessEmployees() });
  const corporation = useQuery({ queryKey: ['work-report-options', 'corporation'], queryFn: getCorporation, retry: false });
  const permissions = useMemo<BusinessPermission[]>(() => [
    ...(departmentIds.length ? [{ type: 'DEPARTMENT_REPORT' as const, departmentIds }] : []),
    ...(unitIds.length ? [{ type: 'UNIT_REPORT' as const, unitIds }] : []),
    ...(corporate ? [{ type: 'CORPORATE_REPORT' as const }] : []),
  ], [departmentIds, unitIds, corporate]);
  const payload = (): BusinessGrant => {
    if (!selectedEmployeeId) throw new Error('Chọn nhân sự trước khi tiếp tục.');
    if (!permissions.length) throw new Error('Chọn ít nhất một quyền tổng hợp.');
    return { employeeId: selectedEmployeeId, permissions };
  };
  const refresh = () => { void client.invalidateQueries({ queryKey: ['work-report-matrix'] }); };
  const preview = useMutation({ mutationFn: () => previewBusinessGrant(payload()), onSuccess: () => { setPreviewed(true); notifications.show({ color: 'blue', message: 'Bản xem trước hợp lệ. Xác nhận để cấp quyền.' }); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể kiểm tra phân quyền.' }) });
  const grant = useMutation({ mutationFn: () => createBusinessGrant(payload()), onSuccess: () => { notifications.show({ color: 'green', message: `Đã cấp quyền cho ${subject?.fullName ?? 'nhân sự'}.` }); setDrawer(false); setPreviewed(false); refresh(); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể cấp quyền. Vui lòng thử lại.' }) });
  const batchPreview = useMutation({ mutationFn: () => previewBusinessBatch({ employeeIds: [...selectedIds], permissions }), onSuccess: (result) => { setPreviewed(true); notifications.show({ color: 'blue', message: `Có thể áp dụng cho ${result.eligibleSubjects}/${result.totalSubjects} nhân sự.` }); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể xem trước thao tác hàng loạt.' }) });
  const batchApply = useMutation({ mutationFn: () => applyBusinessBatch({ employeeIds: [...selectedIds], permissions, idempotencyKey: crypto.randomUUID() }), onSuccess: () => { notifications.show({ color: 'green', message: 'Đã tạo và hoàn tất thao tác hàng loạt.' }); setDrawer(false); setPreviewed(false); setSelectedIds(new Set()); refresh(); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể áp dụng thao tác hàng loạt.' }) });
  const openDrawer = (row: MatrixRow | null, batch = false) => { setBatchMode(batch); setSubject(row); setSelectedEmployeeId(row?.employeeId ?? null); setDepartmentIds([]); setUnitIds([]); setCorporate(false); setPreviewed(false); setDrawer(true); };
  const columns: DataTableColumn<MatrixRow>[] = [
    { key: 'employee', header: 'Nhân sự', render: (row) => <Stack gap={0}><Text fw={600} size="sm">{row.fullName}</Text><Text size="xs" c="dimmed">{row.email ?? row.employeeCode}</Text></Stack> },
    { key: 'organization', header: 'Đơn vị / phòng ban', render: (row) => <Text size="sm">{row.unitName ?? 'Chưa xác định'}<br />{row.departmentName ?? 'Chưa xác định'}</Text> },
    { key: 'personal', header: 'Quyền mặc định', render: (row) => <Badge color={row.accountStatus === 'ACTIVE' ? 'green' : 'gray'}>{row.accountStatus === 'ACTIVE' ? 'Cá nhân & tuần' : 'Chưa sẵn sàng'}</Badge> },
    { key: 'managed', header: 'Quyền tổng hợp', render: (row) => <Text size="sm">{permissionSummary(row)}</Text> },
    { key: 'actions', header: 'Thao tác', render: (row) => can(MANAGE) ? <Button size="compact-sm" variant="light" onClick={() => openDrawer(row)}>Cấp / thêm quyền</Button> : '—' },
  ];
  const items = matrix.data?.items ?? [];
  return <Stack gap="lg">
    <PageHeader title="Phân quyền báo cáo công việc" subtitle="Quản lý quyền tổng hợp báo cáo theo phòng ban, đơn vị và Tổng công ty. Quyền cá nhân không tạo bản ghi cấp quyền quản trị." actions={<Group><ActionIcon aria-label="Làm mới" variant="default" onClick={refresh}><IconRefresh size={16} /></ActionIcon>{can(MANAGE) && <Button leftSection={<IconPlus size={16} />} onClick={() => openDrawer(null)}>Cấp quyền</Button>}{can(MANAGE) && <Button variant="default" onClick={() => openDrawer(null, true)} disabled={!selectedIds.size}>Cấp quyền hàng loạt ({selectedIds.size})</Button>}</Group>} />
    <Group align="end"><TextInput label="Tìm nhân sự" placeholder="Tên, mã nhân sự hoặc email" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} w={360} /><Select clearable label="Phòng ban" data={(departments.data ?? []).map((item) => ({ value: item.id, label: item.label }))} value={departmentId} onChange={(value) => { setDepartmentId(value); setPage(1); }} w={250} /><Select clearable label="Đơn vị" data={(units.data ?? []).map((item) => ({ value: item.id, label: item.label }))} value={unitId} onChange={(value) => { setUnitId(value); setPage(1); }} w={250} /></Group>
    <DataTable data={items} columns={columns} rowKey={(row) => row.employeeId} loading={matrix.isLoading} error={matrix.error} onRetry={() => matrix.refetch()} meta={matrix.data ? { page: matrix.data.page, pageSize: matrix.data.pageSize, total: matrix.data.total, totalPages: Math.max(1, Math.ceil(matrix.data.total / matrix.data.pageSize)), hasNextPage: matrix.data.hasNext, hasPreviousPage: matrix.data.page > 1 } : undefined} onPageChange={setPage} selectedIds={selectedIds} onSelectionChange={setSelectedIds} emptyTitle="Chưa có nhân sự phù hợp" />
    <Drawer opened={drawer} onClose={() => setDrawer(false)} title={batchMode ? 'Cấp quyền báo cáo hàng loạt' : 'Cấp quyền báo cáo công việc'} position="right" size="xl"><Stack gap="lg">
      {batchMode ? <Text fw={600}>Đã chọn {selectedIds.size} nhân sự trên các trang đã xem.</Text> : <Select searchable label="Nhân sự" placeholder="Chọn nhân sự" data={(employeeOptions.data ?? []).map((item) => ({ value: item.id, label: item.label }))} value={selectedEmployeeId} onChange={(value) => { setSelectedEmployeeId(value); const current = items.find((row) => row.employeeId === value); setSubject(current ?? null); setPreviewed(false); }} />}
      {subject && <Text size="sm">{subject.fullName} · {subject.employeeCode} · {subject.departmentName ?? 'Chưa xác định phòng ban'}</Text>}
      <MultiSelect label="Phạm vi phòng ban" description="Có thể chọn nhiều phòng ban." data={(departments.data ?? []).map((item) => ({ value: item.id, label: item.label }))} value={departmentIds} onChange={(value) => { setDepartmentIds(value); setPreviewed(false); }} />
      <MultiSelect label="Phạm vi đơn vị" description="Có thể chọn nhiều đơn vị." data={(units.data ?? []).map((item) => ({ value: item.id, label: item.label }))} value={unitIds} onChange={(value) => { setUnitIds(value); setPreviewed(false); }} />
      <Button variant={corporate ? 'filled' : 'default'} color="violet" loading={corporation.isLoading} onClick={() => { if (corporation.data) { setCorporate((value) => !value); setPreviewed(false); } }}>Tổng công ty: {corporation.data?.label ?? 'Không khả dụng'}</Button>
      {corporation.isError && <Text c="red" size="sm">Không thể xác định đơn vị gốc duy nhất đang hoạt động; quyền Tổng công ty không khả dụng.</Text>}
      <Text size="sm" c="dimmed">Quyền cá nhân và công việc tuần được suy ra từ trạng thái tài khoản HR-linked đang hoạt động. Các lựa chọn trên chỉ thêm quyền tổng hợp canonical tại Chat Auth.</Text>
      <Group justify="flex-end"><Button variant="default" onClick={() => batchMode ? batchPreview.mutate() : preview.mutate()} loading={batchMode ? batchPreview.isPending : preview.isPending} disabled={batchMode ? !selectedIds.size || !permissions.length : !selectedEmployeeId || !permissions.length}>Xem trước</Button><Button onClick={() => batchMode ? batchApply.mutate() : grant.mutate()} loading={batchMode ? batchApply.isPending : grant.isPending} disabled={!previewed}>Xác nhận cấp quyền</Button></Group>
    </Stack></Drawer>
  </Stack>;
}
