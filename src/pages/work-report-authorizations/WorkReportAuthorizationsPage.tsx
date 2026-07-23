import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Drawer,
  Group,
  Paper,
  Select,
  Stack,
  Stepper,
  Table,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../features/auth/useAuth';
import {
  applyBusinessBatch,
  createBusinessGrant,
  getCorporation,
  listBusinessDepartments,
  listBusinessEmployees,
  listBusinessUnits,
  listMatrix,
  previewBusinessBatch,
  previewBusinessGrant,
  type BusinessAction,
  type BusinessGrant,
  type BusinessPermission,
  type DepartmentOption,
  type MatrixRow,
  type UnitOption,
} from '../../features/work-report-authorizations/canonicalWorkReportAuthorizationsApi';
import { departmentScopeLabel, toggleScopeAction, unitScopeLabel } from '../../features/work-report-authorizations/scopeSelectionPolicy';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';

const MANAGE = 'admin.work_report_authorization.manage';
const canonicalDepartmentLabel = departmentScopeLabel;
const canonicalUnitLabel = unitScopeLabel;
const permissionLabel: Record<BusinessPermission['type'], string> = {
  DEPARTMENT_REPORT: 'Tổng hợp cấp phòng',
  UNIT_REPORT: 'Báo cáo lãnh đạo đơn vị',
  CORPORATE_REPORT: 'Tổng hợp Tổng công ty',
};

type DepartmentScopeDraft = DepartmentOption & { actions: BusinessAction[] };
type UnitScopeDraft = UnitOption & { actions: BusinessAction[] };

const actionsFrom = (actions: BusinessAction[], action: BusinessAction, confirmReadRemoval = false): BusinessAction[] => {
  const current = new Set(actions);
  if (current.has(action)) {
    if (action === 'READ' && current.has('SUBMIT')) {
      if (confirmReadRemoval && !window.confirm('Bỏ quyền Đọc sẽ đồng thời bỏ quyền Gửi của phạm vi này. Tiếp tục?')) return actions;
      current.delete('SUBMIT');
    }
    current.delete(action);
  } else {
    if (action === 'SUBMIT') current.add('READ');
    current.add(action);
  }
  return toggleScopeAction(actions, action);
};

const summary = (row: MatrixRow) => row.permissions.length
  ? row.permissions.map((permission) => permissionLabel[permission.type]).join(', ')
  : 'Chưa cấp';

export function WorkReportAuthorizationsPage() {
  const client = useQueryClient();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentId] = useState<string | null>(null);
  const [unitId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [step, setStep] = useState(0);
  const [subject, setSubject] = useState<MatrixRow | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [departmentDrafts, setDepartmentDrafts] = useState<Record<string, DepartmentScopeDraft>>({});
  const [unitDrafts, setUnitDrafts] = useState<Record<string, UnitScopeDraft>>({});
  const [corporateActions, setCorporateActions] = useState<BusinessAction[]>([]);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [departmentUnitFilter, setDepartmentUnitFilter] = useState<string | null>(null);
  const [scopeStatus, setScopeStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [previewed, setPreviewed] = useState(false);
  const [debouncedMatrix] = useDebouncedValue(search, 300);
  const [debouncedDepartmentSearch] = useDebouncedValue(departmentSearch, 300);
  const [debouncedUnitSearch] = useDebouncedValue(unitSearch, 300);
  const existingDepartmentIds = useMemo(() => (subject?.permissions ?? []).filter((permission) => permission.type === 'DEPARTMENT_REPORT').map((permission) => permission.scopeId), [subject]);
  const existingUnitIds = useMemo(() => (subject?.permissions ?? []).filter((permission) => permission.type === 'UNIT_REPORT').map((permission) => permission.scopeId), [subject]);

  const matrix = useQuery({
    queryKey: ['work-report-matrix', page, debouncedMatrix, departmentId, unitId],
    queryFn: () => listMatrix({ page, pageSize: 20, search: debouncedMatrix || undefined, departmentId: departmentId ?? undefined, unitId: unitId ?? undefined }),
  });
  const filterUnits = useQuery({ queryKey: ['work-report-options', 'units', 'filter'], queryFn: () => listBusinessUnits({ pageSize: 100 }) });
  const departments = useQuery({
    queryKey: ['work-report-options', 'departments', debouncedDepartmentSearch, departmentUnitFilter, scopeStatus],
    queryFn: () => listBusinessDepartments({ search: debouncedDepartmentSearch || undefined, unitId: departmentUnitFilter ?? undefined, status: scopeStatus, pageSize: 25 }),
    enabled: drawer,
  });
  const units = useQuery({
    queryKey: ['work-report-options', 'units', debouncedUnitSearch, scopeStatus],
    queryFn: () => listBusinessUnits({ search: debouncedUnitSearch || undefined, status: scopeStatus, pageSize: 25 }),
    enabled: drawer,
  });
  const existingDepartments = useQuery({
    queryKey: ['work-report-options', 'departments', 'existing', existingDepartmentIds],
    queryFn: () => listBusinessDepartments({ ids: existingDepartmentIds.join(','), pageSize: 100 }),
    enabled: drawer && existingDepartmentIds.length > 0,
  });
  const existingUnits = useQuery({
    queryKey: ['work-report-options', 'units', 'existing', existingUnitIds],
    queryFn: () => listBusinessUnits({ ids: existingUnitIds.join(','), pageSize: 100 }),
    enabled: drawer && existingUnitIds.length > 0,
  });
  const employeeOptions = useQuery({ queryKey: ['work-report-options', 'employees'], queryFn: () => listBusinessEmployees() });
  const corporation = useQuery({ queryKey: ['work-report-options', 'corporation'], queryFn: getCorporation, retry: false, enabled: drawer });

  const permissions = useMemo<BusinessPermission[]>(() => [
    ...Object.values(departmentDrafts).filter((scope) => scope.actions.length).map((scope) => ({ type: 'DEPARTMENT_REPORT' as const, scopeId: scope.departmentId, actions: scope.actions })),
    ...Object.values(unitDrafts).filter((scope) => scope.actions.length).map((scope) => ({ type: 'UNIT_REPORT' as const, scopeId: scope.unitId, actions: scope.actions })),
    ...(corporation.data && corporateActions.length ? [{ type: 'CORPORATE_REPORT' as const, scopeId: corporation.data.rootUnitId, actions: corporateActions }] : []),
  ], [corporation.data, corporateActions, departmentDrafts, unitDrafts]);
  const effectiveEmployeeId = selectedEmployeeId ?? subject?.employeeId ?? null;
  const employeeSelectData = useMemo(() => {
    const options = employeeOptions.data ?? [];
    if (!subject || !effectiveEmployeeId || options.some((item) => item.id === effectiveEmployeeId)) return options;
    return [{ id: effectiveEmployeeId, label: `${subject.fullName} · ${subject.employeeCode}` }, ...options];
  }, [effectiveEmployeeId, employeeOptions.data, subject]);
  const selectedDepartmentCount = Object.keys(departmentDrafts).length;
  const selectedUnitCount = Object.keys(unitDrafts).length;

  useEffect(() => {
    const canonical = existingDepartments.data?.items;
    if (!canonical?.length) return;
    setDepartmentDrafts((current) => {
      const next = { ...current };
      for (const scope of canonical) if (next[scope.departmentId]) next[scope.departmentId] = { ...scope, actions: next[scope.departmentId].actions };
      return next;
    });
  }, [existingDepartments.data]);
  useEffect(() => {
    const canonical = existingUnits.data?.items;
    if (!canonical?.length) return;
    setUnitDrafts((current) => {
      const next = { ...current };
      for (const scope of canonical) if (next[scope.unitId]) next[scope.unitId] = { ...scope, actions: next[scope.unitId].actions };
      return next;
    });
  }, [existingUnits.data]);

  const payload = (): BusinessGrant => {
    if (!effectiveEmployeeId) throw new Error('Chọn nhân sự trước khi tiếp tục.');
    if (!permissions.length) throw new Error('Chọn ít nhất một quyền tổng hợp.');
    return { employeeId: effectiveEmployeeId, permissions };
  };
  const refresh = () => { void client.invalidateQueries({ queryKey: ['work-report-matrix'] }); };
  const preview = useMutation({ mutationFn: () => previewBusinessGrant(payload()), onSuccess: () => { setPreviewed(true); setStep(2); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể kiểm tra phân quyền.' }) });
  const grant = useMutation({ mutationFn: () => createBusinessGrant(payload()), onSuccess: () => { notifications.show({ color: 'green', message: 'Đã lưu quyền Báo cáo công việc.' }); setDrawer(false); refresh(); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể cấp quyền. Vui lòng thử lại.' }) });
  const batchPreview = useMutation({ mutationFn: () => previewBusinessBatch({ employeeIds: [...selectedIds], permissions }), onSuccess: () => { setPreviewed(true); setStep(2); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể xem trước thao tác hàng loạt.' }) });
  const batchApply = useMutation({ mutationFn: () => applyBusinessBatch({ employeeIds: [...selectedIds], permissions, idempotencyKey: crypto.randomUUID() }), onSuccess: () => { notifications.show({ color: 'green', message: 'Đã hoàn tất cấp quyền hàng loạt.' }); setDrawer(false); setSelectedIds(new Set()); refresh(); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể áp dụng thao tác hàng loạt.' }) });

  const addDepartment = (scope: DepartmentOption) => {
    setDepartmentDrafts((current) => current[scope.departmentId] ? current : { ...current, [scope.departmentId]: { ...scope, actions: ['READ'] } });
    setPreviewed(false);
  };
  const addUnit = (scope: UnitOption) => {
    setUnitDrafts((current) => current[scope.unitId] ? current : { ...current, [scope.unitId]: { ...scope, actions: ['READ'] } });
    setPreviewed(false);
  };
  const updateDepartmentAction = (id: string, action: BusinessAction) => setDepartmentDrafts((current) => ({ ...current, [id]: { ...current[id], actions: actionsFrom(current[id].actions, action, true) } }));
  const updateUnitAction = (id: string, action: BusinessAction) => setUnitDrafts((current) => ({ ...current, [id]: { ...current[id], actions: actionsFrom(current[id].actions, action, true) } }));
  const hydrateActivePermissions = (row: MatrixRow | null) => {
    // Labels are added from canonical option search results. Existing scopes stay
    // in form state and are never replaced by the currently filtered result set.
    const departmentActions: Record<string, DepartmentScopeDraft> = {};
    const unitActions: Record<string, UnitScopeDraft> = {};
    let corporate: BusinessAction[] = [];
    for (const permission of row?.permissions ?? []) {
      if (permission.type === 'DEPARTMENT_REPORT') departmentActions[permission.scopeId] = { departmentId: permission.scopeId, departmentCode: 'Phạm vi đã cấp', departmentName: 'Phòng ban đã chọn', unitId: '', unitCode: '', unitName: 'Đang tải thông tin đơn vị', status: 'ACTIVE', actions: permission.actions };
      if (permission.type === 'UNIT_REPORT') unitActions[permission.scopeId] = { unitId: permission.scopeId, unitCode: 'Phạm vi đã cấp', unitName: 'Đơn vị đã chọn', status: 'ACTIVE', actions: permission.actions };
      if (permission.type === 'CORPORATE_REPORT') corporate = permission.actions;
    }
    setDepartmentDrafts(departmentActions);
    setUnitDrafts(unitActions);
    setCorporateActions(corporate);
  };
  const openDrawer = (row: MatrixRow | null, batch = false) => {
    setBatchMode(batch); setSubject(row); setSelectedEmployeeId(row?.employeeId ?? null); hydrateActivePermissions(batch ? null : row); setPreviewed(false); setStep(0); setDrawer(true);
  };

  const columns: DataTableColumn<MatrixRow>[] = [
    { key: 'employee', header: 'Nhân sự', render: (row) => <Stack gap={0}><Text fw={600} size="sm">{row.fullName}</Text><Text size="xs" c="dimmed">{row.email ?? row.employeeCode}</Text></Stack> },
    { key: 'organization', header: 'Đơn vị / phòng ban', render: (row) => <Text size="sm">{row.unitName ?? 'Chưa xác định'}<br />{row.departmentName ?? 'Chưa xác định'}</Text> },
    { key: 'personal', header: 'Quyền mặc định', render: (row) => <Badge color={row.accountStatus === 'ACTIVE' ? 'green' : 'gray'}>{row.accountStatus === 'ACTIVE' ? 'Cá nhân & tuần' : 'Chưa sẵn sàng'}</Badge> },
    { key: 'managed', header: 'Quyền tổng hợp', render: (row) => row.permissions.length ? <Badge color="green" variant="light">{summary(row)}</Badge> : <Text size="sm" c="dimmed">Chưa cấp</Text> },
    { key: 'actions', header: 'Thao tác', render: (row) => can(MANAGE) ? <Button size="compact-sm" variant="light" onClick={() => openDrawer(row)}>Cấp / chỉnh sửa</Button> : '—' },
  ];
  const departmentOptions = useMemo(() => Object.values((departments.data?.items ?? []).reduce<Record<string, { group: string; items: { value: string; label: string }[] }>>((groups, scope) => {
    const group = `${scope.unitName} — ${scope.unitCode}`;
    (groups[group] ??= { group, items: [] }).items.push({ value: scope.departmentId, label: `${scope.departmentName} · ${scope.departmentCode}` });
    return groups;
  }, {})), [departments.data]);
  const departmentById = new Map((departments.data?.items ?? []).map((scope) => [scope.departmentId, scope]));
  const unitById = new Map((units.data?.items ?? []).map((scope) => [scope.unitId, scope]));
  const items = matrix.data?.items ?? [];

  const renderScopeActions = (checked: BusinessAction[], onChange: (action: BusinessAction) => void, label: string) => <Group gap="md" wrap="nowrap"><Checkbox aria-label={`Đọc báo cáo: ${label}`} label="Đọc" checked={checked.includes('READ')} onChange={() => { onChange('READ'); setPreviewed(false); }} /><Checkbox aria-label={`Gửi báo cáo: ${label}`} label="Gửi" checked={checked.includes('SUBMIT')} onChange={() => { onChange('SUBMIT'); setPreviewed(false); }} /></Group>;

  return <Stack gap="lg">
    <PageHeader title="Phân quyền báo cáo công việc" subtitle="Quản lý quyền tổng hợp theo phòng ban, đơn vị và Tổng công ty." actions={<Group><ActionIcon aria-label="Làm mới" variant="default" onClick={refresh}><IconRefresh size={16} /></ActionIcon>{can(MANAGE) && <Button leftSection={<IconPlus size={16} />} onClick={() => openDrawer(null)}>Cấp quyền</Button>}{can(MANAGE) && <Button variant="default" onClick={() => openDrawer(null, true)} disabled={!selectedIds.size}>Cấp hàng loạt ({selectedIds.size})</Button>}</Group>} />
    <Group align="end"><TextInput label="Tìm nhân sự" placeholder="Tên, mã nhân sự hoặc email" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} w={360} /></Group>
    <DataTable data={items} columns={columns} rowKey={(row) => row.employeeId} loading={matrix.isLoading} error={matrix.error} onRetry={() => matrix.refetch()} meta={matrix.data ? { page: matrix.data.page, pageSize: matrix.data.pageSize, total: matrix.data.total, totalPages: Math.max(1, Math.ceil(matrix.data.total / matrix.data.pageSize)), hasNextPage: matrix.data.hasNext, hasPreviousPage: matrix.data.page > 1 } : undefined} onPageChange={setPage} selectedIds={selectedIds} onSelectionChange={setSelectedIds} emptyTitle="Chưa có nhân sự phù hợp" />
    <Drawer opened={drawer} onClose={() => setDrawer(false)} title={batchMode ? 'Cấp quyền báo cáo hàng loạt' : 'Cấp quyền báo cáo công việc'} position="right" size={900} styles={{ content: { maxWidth: '95vw' }, body: { paddingBottom: 84 } }}>
      <Stepper active={step} mb="lg" allowNextStepsSelect={false}><Stepper.Step label="Nhân sự" /><Stepper.Step label="Quyền và phạm vi" /><Stepper.Step label="Xem trước" /></Stepper>
      {step === 0 && <Stack><Text fw={600}>{batchMode ? `Đã chọn ${selectedIds.size} nhân sự.` : 'Chọn nhân sự cần cấp quyền.'}</Text>{!batchMode && <Select searchable label="Nhân sự" placeholder="Chọn nhân sự" data={employeeSelectData.map((item) => ({ value: item.id, label: item.label }))} value={effectiveEmployeeId} onChange={(value) => { if (value === null && subject) return; setSelectedEmployeeId(value); const current = items.find((row) => row.employeeId === value) ?? null; setSubject(current); hydrateActivePermissions(current); setPreviewed(false); }} />}{subject && <Text size="sm" c="dimmed">{subject.fullName} · {subject.employeeCode} · {subject.departmentName ?? 'Chưa xác định phòng ban'}</Text>}<Group justify="flex-end"><Button onClick={() => setStep(1)} disabled={!batchMode && !effectiveEmployeeId}>Tiếp tục</Button></Group></Stack>}
      {step === 1 && <Stack gap="md"><Alert color="blue" title="Phạm vi được giữ độc lập">Tìm để thêm phạm vi; thay đổi bộ lọc không xóa các phạm vi đang chọn. Bật Gửi luôn tự bật Đọc.</Alert><Tabs defaultValue="departments"><Tabs.List><Tabs.Tab value="departments">Cấp phòng ({selectedDepartmentCount})</Tabs.Tab><Tabs.Tab value="units">Cấp đơn vị ({selectedUnitCount})</Tabs.Tab><Tabs.Tab value="corporation">Tổng công ty</Tabs.Tab></Tabs.List><Tabs.Panel value="departments" pt="md"><Stack><Group align="end"><TextInput label="Thêm phòng ban" placeholder="Tìm theo tên phòng, mã phòng hoặc đơn vị" value={departmentSearch} onChange={(event) => setDepartmentSearch(event.currentTarget.value)} style={{ flex: 1 }} /><Select clearable searchable label="Đơn vị" placeholder="Tất cả đơn vị" data={(filterUnits.data?.items ?? []).map((unit) => ({ value: unit.unitId, label: canonicalUnitLabel(unit) }))} value={departmentUnitFilter} onChange={setDepartmentUnitFilter} w={260} /><Select label="Trạng thái" data={[{ value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'INACTIVE', label: 'Không hoạt động' }]} value={scopeStatus} onChange={(value) => setScopeStatus(value === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE')} w={160} /></Group><Select searchable nothingFoundMessage={departments.isFetching ? 'Đang tải danh sách phòng ban…' : 'Không tìm thấy phòng ban phù hợp.'} placeholder="Chọn phòng ban để thêm" data={departmentOptions} value={null} onChange={(value) => { const scope = value ? departmentById.get(value) : undefined; if (scope) addDepartment(scope); }} /><Text size="xs" c="dimmed">{departments.data?.total ?? 0} kết quả · {selectedDepartmentCount} phòng đã chọn</Text><SelectedDepartments scopes={departmentDrafts} onAction={updateDepartmentAction} onRemove={(id) => { setDepartmentDrafts((current) => { const next = { ...current }; delete next[id]; return next; }); setPreviewed(false); }} renderActions={renderScopeActions} /></Stack></Tabs.Panel><Tabs.Panel value="units" pt="md"><Stack><TextInput label="Thêm đơn vị" placeholder="Tìm theo tên hoặc mã đơn vị" value={unitSearch} onChange={(event) => setUnitSearch(event.currentTarget.value)} /><Select searchable nothingFoundMessage={units.isFetching ? 'Đang tải danh sách đơn vị…' : 'Không tìm thấy đơn vị phù hợp.'} placeholder="Chọn đơn vị để thêm" data={(units.data?.items ?? []).map((scope) => ({ value: scope.unitId, label: canonicalUnitLabel(scope) }))} value={null} onChange={(value) => { const scope = value ? unitById.get(value) : undefined; if (scope) addUnit(scope); }} /><SelectedUnits scopes={unitDrafts} onAction={updateUnitAction} onRemove={(id) => { setUnitDrafts((current) => { const next = { ...current }; delete next[id]; return next; }); setPreviewed(false); }} renderActions={renderScopeActions} /></Stack></Tabs.Panel><Tabs.Panel value="corporation" pt="md">{corporation.isError ? <Alert color="red" title="Chưa cấu hình Tổng công ty">Không thể cấp quyền Tổng công ty. Quyền phòng ban và đơn vị vẫn sẵn sàng.</Alert> : <Paper withBorder p="md"><Stack gap="xs"><Text fw={600}>{corporation.data?.label ?? 'Đang tải cấu hình…'}</Text><Text size="sm" c="dimmed">Mã đơn vị: DV001 · Phạm vi: Toàn Tổng công ty</Text>{renderScopeActions(corporateActions, (action) => setCorporateActions((current) => actionsFrom(current, action, true)), 'Tổng công ty')}</Stack></Paper>}</Tabs.Panel></Tabs><Group justify="space-between"><Button variant="default" onClick={() => setStep(0)}>Quay lại</Button><Button onClick={() => batchMode ? batchPreview.mutate() : preview.mutate()} loading={batchMode ? batchPreview.isPending : preview.isPending} disabled={!permissions.length}>Xem trước</Button></Group></Stack>}
      {step === 2 && <Stack><Text fw={600}>Xem trước thay đổi</Text><Preview scopes={departmentDrafts} units={unitDrafts} corporateActions={corporateActions} corporationName={corporation.data?.label} /><Text size="sm" c="dimmed">Máy chủ sẽ kiểm tra trùng lặp, phạm vi inactive và các thay đổi cần tạo/cập nhật trước khi áp dụng.</Text><Group justify="space-between"><Button variant="default" onClick={() => setStep(1)}>Chỉnh sửa</Button><Button onClick={() => batchMode ? batchApply.mutate() : grant.mutate()} loading={batchMode ? batchApply.isPending : grant.isPending} disabled={!previewed}>Xác nhận cấp quyền</Button></Group></Stack>}
    </Drawer>
  </Stack>;
}

function SelectedDepartments({ scopes, onAction, onRemove, renderActions }: { scopes: Record<string, DepartmentScopeDraft>; onAction: (id: string, action: BusinessAction) => void; onRemove: (id: string) => void; renderActions: (actions: BusinessAction[], onChange: (action: BusinessAction) => void, label: string) => ReactNode }) {
  const rows = Object.values(scopes);
  if (!rows.length) return <Text c="dimmed" size="sm">Chưa chọn phòng ban nào.</Text>;
  return <Paper withBorder p="sm"><Text fw={600} mb="xs">Phạm vi đã chọn</Text><Table.ScrollContainer minWidth={680}><Table><Table.Thead><Table.Tr><Table.Th>Phòng ban</Table.Th><Table.Th>Đơn vị</Table.Th><Table.Th>Quyền</Table.Th><Table.Th /></Table.Tr></Table.Thead><Table.Tbody>{rows.map((scope) => <Table.Tr key={scope.departmentId}><Table.Td><Text fw={600} size="sm">{scope.departmentName}</Text><Text size="xs" c="dimmed">{scope.departmentCode}</Text></Table.Td><Table.Td><Text size="sm">{scope.unitName}</Text><Text size="xs" c="dimmed">{scope.unitCode}</Text></Table.Td><Table.Td>{renderActions(scope.actions, (action) => onAction(scope.departmentId, action), canonicalDepartmentLabel(scope))}</Table.Td><Table.Td><ActionIcon color="red" variant="subtle" aria-label={`Xóa ${canonicalDepartmentLabel(scope)}`} onClick={() => onRemove(scope.departmentId)}><IconTrash size={16} /></ActionIcon></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer></Paper>;
}

function SelectedUnits({ scopes, onAction, onRemove, renderActions }: { scopes: Record<string, UnitScopeDraft>; onAction: (id: string, action: BusinessAction) => void; onRemove: (id: string) => void; renderActions: (actions: BusinessAction[], onChange: (action: BusinessAction) => void, label: string) => ReactNode }) {
  const rows = Object.values(scopes);
  if (!rows.length) return <Text c="dimmed" size="sm">Chưa chọn đơn vị nào.</Text>;
  return <Paper withBorder p="sm"><Text fw={600} mb="xs">Phạm vi đã chọn</Text><Table.ScrollContainer minWidth={600}><Table><Table.Thead><Table.Tr><Table.Th>Đơn vị</Table.Th><Table.Th>Quyền</Table.Th><Table.Th /></Table.Tr></Table.Thead><Table.Tbody>{rows.map((scope) => <Table.Tr key={scope.unitId}><Table.Td><Text fw={600} size="sm">{scope.unitName}</Text><Text size="xs" c="dimmed">{scope.unitCode}</Text></Table.Td><Table.Td>{renderActions(scope.actions, (action) => onAction(scope.unitId, action), canonicalUnitLabel(scope))}</Table.Td><Table.Td><ActionIcon color="red" variant="subtle" aria-label={`Xóa ${canonicalUnitLabel(scope)}`} onClick={() => onRemove(scope.unitId)}><IconTrash size={16} /></ActionIcon></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer></Paper>;
}

function Preview({ scopes, units, corporateActions, corporationName }: { scopes: Record<string, DepartmentScopeDraft>; units: Record<string, UnitScopeDraft>; corporateActions: BusinessAction[]; corporationName?: string }) {
  return <Stack gap="sm"><Divider label="Cấp phòng" labelPosition="left" />{Object.values(scopes).map((scope) => <Paper key={scope.departmentId} withBorder p="sm"><Text fw={600}>{scope.departmentName}</Text><Text size="sm" c="dimmed">{scope.unitName} — {scope.unitCode} · {scope.departmentCode}</Text><Text size="sm">Đọc: {scope.actions.includes('READ') ? 'Có' : 'Không'} · Gửi: {scope.actions.includes('SUBMIT') ? 'Có' : 'Không'}</Text></Paper>)}<Divider label="Cấp đơn vị" labelPosition="left" />{Object.values(units).map((scope) => <Paper key={scope.unitId} withBorder p="sm"><Text fw={600}>{scope.unitName} — {scope.unitCode}</Text><Text size="sm">Đọc: {scope.actions.includes('READ') ? 'Có' : 'Không'} · Gửi: {scope.actions.includes('SUBMIT') ? 'Có' : 'Không'}</Text></Paper>)}{corporateActions.length ? <><Divider label="Tổng công ty" labelPosition="left" /><Paper withBorder p="sm"><Text fw={600}>{corporationName ?? 'Tổng công ty'} — DV001</Text><Text size="sm">Đọc: {corporateActions.includes('READ') ? 'Có' : 'Không'} · Gửi: {corporateActions.includes('SUBMIT') ? 'Có' : 'Không'}</Text></Paper></> : null}</Stack>;
}
