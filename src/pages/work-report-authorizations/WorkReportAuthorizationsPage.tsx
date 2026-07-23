import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Button, Checkbox, Drawer, Group, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconRefresh } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../features/auth/useAuth';
import {
  applyBusinessBatch, createBusinessGrant, getCorporation, listBusinessDepartments, listBusinessEmployees, listBusinessUnits,
  listMatrix, previewBusinessBatch, previewBusinessGrant, type BusinessAction, type BusinessGrant, type BusinessPermission, type MatrixRow,
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

const splitActivePermissions = (row: MatrixRow | null) => {
  const departmentActions: Record<string, BusinessAction[]> = {};
  const unitActions: Record<string, BusinessAction[]> = {};
  let corporateActions: BusinessAction[] = [];
  for (const permission of row?.permissions ?? []) {
    if (permission.type === 'DEPARTMENT_REPORT') departmentActions[permission.scopeId] = permission.actions;
    if (permission.type === 'UNIT_REPORT') unitActions[permission.scopeId] = permission.actions;
    if (permission.type === 'CORPORATE_REPORT') corporateActions = permission.actions;
  }
  return { departmentActions, unitActions, corporateActions };
};

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
  const [departmentActions, setDepartmentActions] = useState<Record<string, BusinessAction[]>>({});
  const [unitActions, setUnitActions] = useState<Record<string, BusinessAction[]>>({});
  const [corporateActions, setCorporateActions] = useState<BusinessAction[]>([]);
  const [previewed, setPreviewed] = useState(false);
  const [debounced] = useDebouncedValue(search, 300);

  const matrix = useQuery({ queryKey: ['work-report-matrix', page, debounced, departmentId, unitId], queryFn: () => listMatrix({ page, pageSize: 20, search: debounced || undefined, departmentId: departmentId ?? undefined, unitId: unitId ?? undefined }) });
  const departments = useQuery({ queryKey: ['work-report-options', 'departments'], queryFn: () => listBusinessDepartments() });
  const units = useQuery({ queryKey: ['work-report-options', 'units'], queryFn: () => listBusinessUnits() });
  const employeeOptions = useQuery({ queryKey: ['work-report-options', 'employees'], queryFn: () => listBusinessEmployees() });
  const corporation = useQuery({ queryKey: ['work-report-options', 'corporation'], queryFn: getCorporation, retry: false });
  const permissions = useMemo<BusinessPermission[]>(() => [
    ...Object.entries(departmentActions).filter(([, actions]) => actions.length).map(([scopeId, actions]) => ({ type: 'DEPARTMENT_REPORT' as const, scopeId, actions })),
    ...Object.entries(unitActions).filter(([, actions]) => actions.length).map(([scopeId, actions]) => ({ type: 'UNIT_REPORT' as const, scopeId, actions })),
    ...(corporation.data && corporateActions.length ? [{ type: 'CORPORATE_REPORT' as const, scopeId: corporation.data.rootUnitId, actions: corporateActions }] : []),
  ], [corporation.data, corporateActions, departmentActions, unitActions]);
  const effectiveEmployeeId = selectedEmployeeId ?? subject?.employeeId ?? null;
  const employeeSelectData = useMemo(() => {
    const options = employeeOptions.data ?? [];
    if (!subject || !effectiveEmployeeId || options.some((item) => item.id === effectiveEmployeeId)) return options;
    return [{ id: effectiveEmployeeId, label: `${subject.fullName} · ${subject.employeeCode}` }, ...options];
  }, [effectiveEmployeeId, employeeOptions.data, subject]);
  const payload = (): BusinessGrant => {
    if (!effectiveEmployeeId) throw new Error('Chọn nhân sự trước khi tiếp tục.');
    if (!permissions.length) throw new Error('Chọn ít nhất một quyền tổng hợp.');
    return { employeeId: effectiveEmployeeId, permissions };
  };
  const refresh = () => { void client.invalidateQueries({ queryKey: ['work-report-matrix'] }); };
  const preview = useMutation({ mutationFn: () => previewBusinessGrant(payload()), onSuccess: () => { setPreviewed(true); notifications.show({ color: 'blue', message: 'Bản xem trước hợp lệ. Xác nhận để cấp quyền.' }); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể kiểm tra phân quyền.' }) });
  const grant = useMutation({ mutationFn: () => createBusinessGrant(payload()), onSuccess: () => { notifications.show({ color: 'green', message: `Đã cấp quyền cho ${subject?.fullName ?? 'nhân sự'}.` }); setDrawer(false); setPreviewed(false); refresh(); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể cấp quyền. Vui lòng thử lại.' }) });
  const batchPreview = useMutation({ mutationFn: () => previewBusinessBatch({ employeeIds: [...selectedIds], permissions }), onSuccess: (result) => { setPreviewed(true); notifications.show({ color: 'blue', message: `Có thể áp dụng cho ${result.eligibleSubjects}/${result.totalSubjects} nhân sự.` }); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể xem trước thao tác hàng loạt.' }) });
  const batchApply = useMutation({ mutationFn: () => applyBusinessBatch({ employeeIds: [...selectedIds], permissions, idempotencyKey: crypto.randomUUID() }), onSuccess: () => { notifications.show({ color: 'green', message: 'Đã tạo và hoàn tất thao tác hàng loạt.' }); setDrawer(false); setPreviewed(false); setSelectedIds(new Set()); refresh(); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể áp dụng thao tác hàng loạt.' }) });
  const toggleAction = (set: React.Dispatch<React.SetStateAction<Record<string, BusinessAction[]>>>, scopeId: string, action: BusinessAction) => set((current) => { const actions = new Set(current[scopeId] ?? []); if (actions.has(action)) actions.delete(action); else { if (action === 'SUBMIT') actions.add('READ'); actions.add(action); } return { ...current, [scopeId]: [...actions].sort() as BusinessAction[] }; });
  const toggleCorporate = (action: BusinessAction) => setCorporateActions((current) => { const actions = new Set(current); if (actions.has(action)) actions.delete(action); else { if (action === 'SUBMIT') actions.add('READ'); actions.add(action); } return [...actions].sort() as BusinessAction[]; });
  const hydrateActivePermissions = (row: MatrixRow | null) => {
    const active = splitActivePermissions(row);
    setDepartmentActions(active.departmentActions);
    setUnitActions(active.unitActions);
    setCorporateActions(active.corporateActions);
  };
  const openDrawer = (row: MatrixRow | null, batch = false) => { setBatchMode(batch); setSubject(row); setSelectedEmployeeId(row?.employeeId ?? null); hydrateActivePermissions(batch ? null : row); setPreviewed(false); setDrawer(true); };
  const columns: DataTableColumn<MatrixRow>[] = [
    { key: 'employee', header: 'Nhân sự', render: (row) => <Stack gap={0}><Text fw={600} size="sm">{row.fullName}</Text><Text size="xs" c="dimmed">{row.email ?? row.employeeCode}</Text></Stack> },
    { key: 'organization', header: 'Đơn vị / phòng ban', render: (row) => <Text size="sm">{row.unitName ?? 'Chưa xác định'}<br />{row.departmentName ?? 'Chưa xác định'}</Text> },
    { key: 'personal', header: 'Quyền mặc định', render: (row) => <Badge color={row.accountStatus === 'ACTIVE' ? 'green' : 'gray'}>{row.accountStatus === 'ACTIVE' ? 'Cá nhân & tuần' : 'Chưa sẵn sàng'}</Badge> },
    { key: 'managed', header: 'Quyền tổng hợp', render: (row) => row.permissions.length ? <Badge color="green" variant="light">Đang hiệu lực: {permissionSummary(row)}</Badge> : <Text size="sm" c="dimmed">Chưa cấp</Text> },
    { key: 'actions', header: 'Thao tác', render: (row) => can(MANAGE) ? <Button size="compact-sm" variant="light" onClick={() => openDrawer(row)}>Cấp / thêm quyền</Button> : '—' },
  ];
  const items = matrix.data?.items ?? [];
  return <Stack gap="lg">
    <PageHeader title="Phân quyền báo cáo công việc" subtitle="Quản lý quyền tổng hợp báo cáo theo phòng ban, đơn vị và Tổng công ty. Quyền cá nhân không tạo bản ghi cấp quyền quản trị." actions={<Group><ActionIcon aria-label="Làm mới" variant="default" onClick={refresh}><IconRefresh size={16} /></ActionIcon>{can(MANAGE) && <Button leftSection={<IconPlus size={16} />} onClick={() => openDrawer(null)}>Cấp quyền</Button>}{can(MANAGE) && <Button variant="default" onClick={() => openDrawer(null, true)} disabled={!selectedIds.size}>Cấp quyền hàng loạt ({selectedIds.size})</Button>}</Group>} />
    <Group align="end"><TextInput label="Tìm nhân sự" placeholder="Tên, mã nhân sự hoặc email" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} w={360} /><Select clearable label="Phòng ban" data={(departments.data ?? []).map((item) => ({ value: item.id, label: item.label }))} value={departmentId} onChange={(value) => { setDepartmentId(value); setPage(1); }} w={250} /><Select clearable label="Đơn vị" data={(units.data ?? []).map((item) => ({ value: item.id, label: item.label }))} value={unitId} onChange={(value) => { setUnitId(value); setPage(1); }} w={250} /></Group>
    <DataTable data={items} columns={columns} rowKey={(row) => row.employeeId} loading={matrix.isLoading} error={matrix.error} onRetry={() => matrix.refetch()} meta={matrix.data ? { page: matrix.data.page, pageSize: matrix.data.pageSize, total: matrix.data.total, totalPages: Math.max(1, Math.ceil(matrix.data.total / matrix.data.pageSize)), hasNextPage: matrix.data.hasNext, hasPreviousPage: matrix.data.page > 1 } : undefined} onPageChange={setPage} selectedIds={selectedIds} onSelectionChange={setSelectedIds} emptyTitle="Chưa có nhân sự phù hợp" />
    <Drawer opened={drawer} onClose={() => setDrawer(false)} title={batchMode ? 'Cấp quyền báo cáo hàng loạt' : 'Cấp quyền báo cáo công việc'} position="right" size="xl"><Stack gap="lg">
      {batchMode ? <Text fw={600}>Đã chọn {selectedIds.size} nhân sự trên các trang đã xem.</Text> : <Select searchable label="Nhân sự" placeholder="Chọn nhân sự" data={employeeSelectData.map((item) => ({ value: item.id, label: item.label }))} value={effectiveEmployeeId} onChange={(value) => { if (value === null && subject) return; setSelectedEmployeeId(value); const current = items.find((row) => row.employeeId === value) ?? null; setSubject(current); hydrateActivePermissions(current); setPreviewed(false); }} />}
      {subject && <Text size="sm">{subject.fullName} · {subject.employeeCode} · {subject.departmentName ?? 'Chưa xác định phòng ban'}</Text>}
      {!batchMode && subject?.permissions.length ? <Text size="sm" c="green">Đang hiển thị {subject.permissions.length} quyền tổng hợp ACTIVE từ Chat Auth. Các checkbox đã chọn là quyền hiệu lực hiện tại.</Text> : null}
      <Text fw={600}>Tổng hợp cấp phòng</Text><Table withTableBorder><Table.Thead><Table.Tr><Table.Th>Phòng ban</Table.Th><Table.Th>Đọc báo cáo</Table.Th><Table.Th>Gửi báo cáo</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{(departments.data ?? []).map((item) => <Table.Tr key={item.id}><Table.Td>{item.label}</Table.Td><Table.Td><Checkbox checked={(departmentActions[item.id] ?? []).includes('READ')} onChange={() => { toggleAction(setDepartmentActions, item.id, 'READ'); setPreviewed(false); }} /></Table.Td><Table.Td><Checkbox checked={(departmentActions[item.id] ?? []).includes('SUBMIT')} onChange={() => { toggleAction(setDepartmentActions, item.id, 'SUBMIT'); setPreviewed(false); }} /></Table.Td></Table.Tr>)}</Table.Tbody></Table>
      <Text fw={600}>Báo cáo lãnh đạo đơn vị</Text><Table withTableBorder><Table.Thead><Table.Tr><Table.Th>Đơn vị</Table.Th><Table.Th>Đọc báo cáo</Table.Th><Table.Th>Gửi báo cáo</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{(units.data ?? []).map((item) => <Table.Tr key={item.id}><Table.Td>{item.label}</Table.Td><Table.Td><Checkbox checked={(unitActions[item.id] ?? []).includes('READ')} onChange={() => { toggleAction(setUnitActions, item.id, 'READ'); setPreviewed(false); }} /></Table.Td><Table.Td><Checkbox checked={(unitActions[item.id] ?? []).includes('SUBMIT')} onChange={() => { toggleAction(setUnitActions, item.id, 'SUBMIT'); setPreviewed(false); }} /></Table.Td></Table.Tr>)}</Table.Tbody></Table>
      <Text fw={600}>Tổng hợp Tổng công ty</Text><Group><Text>{corporation.data ? `${corporation.data.label} — DV001` : 'Không khả dụng'}</Text><Checkbox label="Đọc báo cáo toàn Tổng công ty" checked={corporateActions.includes('READ')} disabled={!corporation.data} onChange={() => { toggleCorporate('READ'); setPreviewed(false); }} /><Checkbox label="Gửi báo cáo tổng hợp Tổng công ty" checked={corporateActions.includes('SUBMIT')} disabled={!corporation.data} onChange={() => { toggleCorporate('SUBMIT'); setPreviewed(false); }} /></Group>
      {corporation.isError && <Text c="red" size="sm">Không thể cấp quyền Tổng công ty: phạm vi canonical chưa được cấu hình. Quyền phòng ban và đơn vị vẫn sẵn sàng.</Text>}
      <Text size="sm" c="dimmed">Quyền cá nhân và công việc tuần được suy ra từ trạng thái tài khoản HR-linked đang hoạt động. Các lựa chọn trên chỉ thêm quyền tổng hợp canonical tại Chat Auth.</Text>
      <Group justify="flex-end"><Button variant="default" onClick={() => batchMode ? batchPreview.mutate() : preview.mutate()} loading={batchMode ? batchPreview.isPending : preview.isPending} disabled={batchMode ? !selectedIds.size || !permissions.length : !effectiveEmployeeId || !permissions.length}>Xem trước</Button><Button onClick={() => batchMode ? batchApply.mutate() : grant.mutate()} loading={batchMode ? batchApply.isPending : grant.isPending} disabled={!previewed}>Xác nhận cấp quyền</Button></Group>
    </Stack></Drawer>
  </Stack>;
}
