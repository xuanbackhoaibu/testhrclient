import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  SegmentedControl,
  Stack,
  Stepper,
  Tabs,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEye, IconPencil, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
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
import { workReportAuthorizationToEmployeePermissionViewModel, type EmployeePermissionViewModel, type PermissionPresentation } from '../../features/work-report-authorizations/workReportAuthorizationViewModel';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';

const MANAGE = 'admin.work_report_authorization.manage';
const canonicalDepartmentLabel = departmentScopeLabel;
const canonicalUnitLabel = unitScopeLabel;
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

export function WorkReportAuthorizationsPage() {
  const client = useQueryClient();
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const search = searchParams.get('search') ?? '';
  const departmentId = searchParams.get('departmentId');
  const unitId = searchParams.get('unitId');
  const permissionFilter = searchParams.get('permission') ?? '';
  const updateListQuery = (changes: Record<string, string | null>) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    return next;
  });
  const [drawer, setDrawer] = useState(false);
  const [detail, setDetail] = useState<MatrixRow | null>(null);
  const [step, setStep] = useState(0);
  const [subject, setSubject] = useState<MatrixRow | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [departmentDrafts, setDepartmentDrafts] = useState<Record<string, DepartmentScopeDraft>>({});
  const [unitDrafts, setUnitDrafts] = useState<Record<string, UnitScopeDraft>>({});
  const [removedPermissions, setRemovedPermissions] = useState<BusinessPermission[]>([]);
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
  const matrixScopeIds = useMemo(() => {
    const permissions = matrix.data?.items.flatMap((row) => row.permissions) ?? [];
    return { departments: permissions.filter((item) => item.type === 'DEPARTMENT_REPORT').map((item) => item.scopeId), units: permissions.filter((item) => item.type === 'UNIT_REPORT').map((item) => item.scopeId) };
  }, [matrix.data]);
  const matrixDepartments = useQuery({ queryKey: ['work-report-options', 'departments', 'matrix', matrixScopeIds.departments], queryFn: () => listBusinessDepartments({ ids: matrixScopeIds.departments.join(','), pageSize: 100 }), enabled: matrixScopeIds.departments.length > 0 });
  const matrixUnits = useQuery({ queryKey: ['work-report-options', 'units', 'matrix', matrixScopeIds.units], queryFn: () => listBusinessUnits({ ids: matrixScopeIds.units.join(','), pageSize: 100 }), enabled: matrixScopeIds.units.length > 0 });
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
    ...(corporation.data && corporateActions.length ? [{ type: 'CORPORATE_REPORT' as const, scopeId: corporation.data.scopeId, actions: corporateActions }] : []),
  ], [corporation.data, corporateActions, departmentDrafts, unitDrafts]);
  const effectiveEmployeeId = selectedEmployeeId ?? subject?.employeeId ?? null;
  const employeeSelectData = useMemo(() => {
    const options = employeeOptions.data ?? [];
    if (!subject || !effectiveEmployeeId || options.some((item) => item.id === effectiveEmployeeId)) return options;
    return [{ id: effectiveEmployeeId, label: `${subject.fullName} · ${subject.employeeCode}` }, ...options];
  }, [effectiveEmployeeId, employeeOptions.data, subject]);
  const selectedDepartmentCount = Object.keys(departmentDrafts).length;
  const selectedUnitCount = Object.keys(unitDrafts).length;

  const displayDepartmentDrafts = useMemo(() => {
    const canonical = new Map((existingDepartments.data?.items ?? []).map((scope) => [scope.departmentId, scope]));
    return Object.fromEntries(Object.entries(departmentDrafts).map(([id, draft]) => [id, canonical.has(id) ? { ...canonical.get(id)!, actions: draft.actions } : draft]));
  }, [departmentDrafts, existingDepartments.data]);
  const displayUnitDrafts = useMemo(() => {
    const canonical = new Map((existingUnits.data?.items ?? []).map((scope) => [scope.unitId, scope]));
    return Object.fromEntries(Object.entries(unitDrafts).map(([id, draft]) => [id, canonical.has(id) ? { ...canonical.get(id)!, actions: draft.actions } : draft]));
  }, [existingUnits.data, unitDrafts]);

  const payload = (): BusinessGrant => {
    if (!effectiveEmployeeId) throw new Error('Chọn nhân sự trước khi tiếp tục.');
    if (!permissions.length && !removedPermissions.length) throw new Error('Chọn ít nhất một thay đổi quyền.');
    return { employeeId: effectiveEmployeeId, permissions, removedPermissions };
  };
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['work-report-matrix'] });
    void client.invalidateQueries({ queryKey: ['work-report-options'] });
  };
  const preview = useMutation({ mutationFn: () => previewBusinessGrant(payload()), onSuccess: () => { setPreviewed(true); setStep(2); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể kiểm tra phân quyền.' }) });
  const grant = useMutation({ mutationFn: () => createBusinessGrant(payload()), onSuccess: () => { notifications.show({ color: 'green', message: 'Đã lưu quyền Báo cáo công việc.' }); setDrawer(false); refresh(); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể cấp quyền. Vui lòng thử lại.' }) });
  const batchPreview = useMutation({ mutationFn: () => previewBusinessBatch({ employeeIds: [...selectedIds], permissions }), onSuccess: () => { setPreviewed(true); setStep(2); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể xem trước thao tác hàng loạt.' }) });
  const batchApply = useMutation({ mutationFn: () => applyBusinessBatch({ employeeIds: [...selectedIds], permissions, idempotencyKey: crypto.randomUUID() }), onSuccess: () => { notifications.show({ color: 'green', message: 'Đã hoàn tất cấp quyền hàng loạt.' }); setDrawer(false); setSelectedIds(new Set()); refresh(); }, onError: (error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Không thể áp dụng thao tác hàng loạt.' }) });

  const addDepartment = (scope: DepartmentOption) => {
    setDepartmentDrafts((current) => current[scope.departmentId] ? current : { ...current, [scope.departmentId]: { ...scope, actions: ['READ'] } });
    setRemovedPermissions((current) => current.filter((item) => !(item.type === 'DEPARTMENT_REPORT' && item.scopeId === scope.departmentId)));
    setPreviewed(false);
  };
  const addUnit = (scope: UnitOption) => {
    setUnitDrafts((current) => current[scope.unitId] ? current : { ...current, [scope.unitId]: { ...scope, actions: ['READ'] } });
    setRemovedPermissions((current) => current.filter((item) => !(item.type === 'UNIT_REPORT' && item.scopeId === scope.unitId)));
    setPreviewed(false);
  };
  const updateDepartmentAction = (id: string, action: BusinessAction) => setDepartmentDrafts((current) => ({ ...current, [id]: { ...current[id], actions: actionsFrom(current[id].actions, action, true) } }));
  const updateUnitAction = (id: string, action: BusinessAction) => setUnitDrafts((current) => ({ ...current, [id]: { ...current[id], actions: actionsFrom(current[id].actions, action, true) } }));
  const markRemoved = (type: BusinessPermission['type'], scopeId: string) => {
    const existing = (subject?.permissions ?? []).find((permission) => permission.type === type && permission.scopeId === scopeId);
    if (!existing) return;
    setRemovedPermissions((current) => current.some((permission) => permission.type === type && permission.scopeId === scopeId)
      ? current
      : [...current, existing]);
  };
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
    setBatchMode(batch); setSubject(row); setSelectedEmployeeId(row?.employeeId ?? null); hydrateActivePermissions(batch ? null : row); setRemovedPermissions([]); setPreviewed(false); setStep(row && !batch ? 1 : 0); setDrawer(true);
  };

  const viewModels = useMemo(() => new Map((matrix.data?.items ?? []).map((row) => [row.employeeId, workReportAuthorizationToEmployeePermissionViewModel(row, matrixDepartments.data?.items, matrixUnits.data?.items)])), [matrix.data, matrixDepartments.data, matrixUnits.data]);
  const filteredItems = useMemo(() => (matrix.data?.items ?? []).filter((row) => {
    const view = viewModels.get(row.employeeId);
    if (!view || !permissionFilter) return true;
    if (permissionFilter === 'unassigned') return row.permissions.length === 0;
    if (permissionFilter === 'department') return view.summary.departmentScopeCount > 0;
    if (permissionFilter === 'unit') return view.summary.unitScopeCount > 0;
    if (permissionFilter === 'corporation') return view.summary.hasCorporationScope;
    if (permissionFilter === 'inactive') return view.summary.inactiveCount > 0;
    if (permissionFilter === 'read') return view.summary.readOnlyCount > 0;
    return permissionFilter === 'submit' ? view.summary.readSubmitCount > 0 : true;
  }), [matrix.data, permissionFilter, viewModels]);
  const columns: DataTableColumn<MatrixRow>[] = [
    { key: 'employee', header: 'Nhân sự', minWidth: 250, render: (row) => <UnstyledButton className="work-report-employee-cell" onClick={() => setDetail(row)}><Stack gap={2} align="flex-start"><Text fw={600} size="sm">{row.fullName}</Text><Text size="xs" c="dimmed">{row.employeeCode} · {row.email ?? 'Chưa có email'}</Text><Badge size="xs" color={row.accountStatus === 'ACTIVE' ? 'green' : 'gray'}>{row.accountStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'}</Badge></Stack></UnstyledButton> },
    { key: 'organization', header: 'Đơn vị / phòng ban hiện tại', minWidth: 280, render: (row) => <Stack gap={2}><Text size="sm" fw={500}>{row.unitName ?? 'Chưa xác định'}{row.unitCode ? ` · ${row.unitCode}` : ''}</Text><Text size="xs" c="dimmed">{row.departmentName ?? 'Chưa xác định'}</Text></Stack> },
    { key: 'default', header: 'Quyền mặc định', minWidth: 160, render: () => <Stack gap={4}><Badge size="sm" variant="light">Báo cáo cá nhân</Badge><Badge size="sm" variant="light">Công việc tuần · Mặc định</Badge></Stack> },
    { key: 'department', header: 'Quyền cấp phòng', minWidth: 190, render: (row) => <ScopeCompact scopes={viewModels.get(row.employeeId)?.departmentPermissions ?? []} /> },
    { key: 'unit', header: 'Quyền cấp đơn vị', minWidth: 190, render: (row) => <ScopeCompact scopes={viewModels.get(row.employeeId)?.unitPermissions ?? []} /> },
    { key: 'corporation', header: 'Quyền Tổng công ty', minWidth: 190, render: (row) => <ScopeCompact scopes={viewModels.get(row.employeeId)?.corporationPermission ? [viewModels.get(row.employeeId)!.corporationPermission!] : []} empty="Chưa cấp" /> },
    { key: 'updated', header: 'Cập nhật gần nhất', minWidth: 135, render: (row) => <Text size="xs">{row.updatedAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.updatedAt)) : '—'}</Text> },
    { key: 'actions', header: 'Thao tác', minWidth: 92, render: (row) => <Group gap="xs" wrap="nowrap"><ActionIcon aria-label={`Xem chi tiết ${row.fullName}`} variant="light" onClick={() => setDetail(row)}><IconEye size={16} /></ActionIcon>{can(MANAGE) && <ActionIcon aria-label={`Sửa quyền ${row.fullName}`} variant="light" onClick={() => openDrawer(row)}><IconPencil size={16} /></ActionIcon>}</Group> },
  ];
  const departmentOptions = useMemo(() => Object.values((departments.data?.items ?? []).reduce<Record<string, { group: string; items: { value: string; label: string }[] }>>((groups, scope) => {
    const group = `Đơn vị: ${scope.unitName}`;
    (groups[group] ??= { group, items: [] }).items.push({ value: scope.departmentId, label: `${scope.departmentName} — ${scope.unitName}` });
    return groups;
  }, {})), [departments.data]);
  const departmentById = new Map((departments.data?.items ?? []).map((scope) => [scope.departmentId, scope]));
  const unitById = new Map((units.data?.items ?? []).map((scope) => [scope.unitId, scope]));
  const items = filteredItems;

  const renderScopeActions = (checked: BusinessAction[], onChange: (action: BusinessAction) => void, label: string) => <SegmentedControl aria-label={`Quyền báo cáo: ${label}`} value={checked.includes('SUBMIT') ? 'READ_SUBMIT' : 'READ'} data={[{ value: 'READ', label: 'Chỉ đọc' }, { value: 'READ_SUBMIT', label: 'Đọc và gửi' }]} onChange={(value) => {
    const next = value === 'READ_SUBMIT' ? ['READ', 'SUBMIT'] as BusinessAction[] : ['READ'] as BusinessAction[];
    for (const action of checked.filter((action) => !next.includes(action))) onChange(action);
    for (const action of next.filter((action) => !checked.includes(action))) onChange(action);
    setPreviewed(false);
  }} />;

  return <Stack gap="lg">
    <PageHeader title="Phân quyền báo cáo công việc" subtitle="Quản lý quyền tổng hợp theo phòng ban, đơn vị và Tổng công ty." actions={<Group><ActionIcon aria-label="Làm mới" variant="default" onClick={refresh}><IconRefresh size={16} /></ActionIcon>{can(MANAGE) && <Button leftSection={<IconPlus size={16} />} onClick={() => openDrawer(null)}>Cấp quyền</Button>}{can(MANAGE) && <Button variant="default" onClick={() => openDrawer(null, true)} disabled={!selectedIds.size}>Cấp hàng loạt ({selectedIds.size})</Button>}</Group>} />
    <Stack gap="xs"><Group align="end"><TextInput label="Tìm nhân sự" placeholder="Tìm theo tên, mã nhân sự hoặc email" value={search} onChange={(event) => updateListQuery({ search: event.currentTarget.value || null, page: null })} w={360} /><Select clearable label="Đơn vị hiện tại" data={(filterUnits.data?.items ?? []).map((unit) => ({ value: unit.unitId, label: canonicalUnitLabel(unit) }))} value={unitId} onChange={(value) => updateListQuery({ unitId: value, page: null })} w={260} /><Button variant="subtle" onClick={() => updateListQuery({ search: null, departmentId: null, unitId: null, permission: null, page: null })}>Xóa bộ lọc</Button></Group><Group gap="xs"><Text size="sm" c="dimmed">{matrix.data?.total ?? 0} kết quả</Text>{[['unassigned', 'Chưa được phân quyền'], ['department', 'Có quyền cấp phòng'], ['unit', 'Có quyền cấp đơn vị'], ['corporation', 'Có quyền Tổng công ty'], ['inactive', 'Có quyền tạm dừng'], ['read', 'Chỉ đọc'], ['submit', 'Đọc và gửi']].map(([value, label]) => <Button key={value} size="compact-xs" variant={permissionFilter === value ? 'filled' : 'light'} onClick={() => updateListQuery({ permission: permissionFilter === value ? null : value })}>{label}</Button>)}</Group></Stack>
    <div className="work-report-permission-matrix"><DataTable data={items} columns={columns} rowKey={(row) => row.employeeId} loading={matrix.isLoading || matrixDepartments.isLoading || matrixUnits.isLoading} error={matrix.error} onRetry={() => matrix.refetch()} meta={matrix.data ? { page: matrix.data.page, pageSize: matrix.data.pageSize, total: matrix.data.total, totalPages: Math.max(1, Math.ceil(matrix.data.total / matrix.data.pageSize)), hasNextPage: matrix.data.hasNext, hasPreviousPage: matrix.data.page > 1 } : undefined} onPageChange={(nextPage) => updateListQuery({ page: String(nextPage) })} selectedIds={selectedIds} onSelectionChange={setSelectedIds} emptyTitle="Chưa có nhân sự phù hợp" /></div>
    <Drawer opened={drawer} onClose={() => setDrawer(false)} title={<Stack gap={2}><Text fw={700}>{batchMode ? 'Cấp quyền báo cáo hàng loạt' : 'Cấp quyền báo cáo công việc'}</Text>{!batchMode && subject && <Text size="sm" c="dimmed">{subject.fullName} · {subject.employeeCode} · {subject.departmentName ?? 'Chưa xác định phòng ban'} · {subject.unitName ?? 'Chưa xác định đơn vị'}</Text>}</Stack>} position="right" size={920} styles={{ content: { maxWidth: '95vw' }, header: { position: 'sticky', top: 0, zIndex: 2, background: 'var(--mantine-color-body)' }, body: { paddingBottom: 84 } }}>
      <Stepper active={step} mb="lg" allowNextStepsSelect={false}><Stepper.Step label="Nhân sự" /><Stepper.Step label="Quyền và phạm vi" /><Stepper.Step label="Xem trước" /></Stepper>
      {step === 0 && <Stack><Text fw={600}>{batchMode ? `Đã chọn ${selectedIds.size} nhân sự.` : 'Chọn nhân sự cần cấp quyền.'}</Text>{!batchMode && <Select searchable label="Nhân sự" placeholder="Chọn nhân sự" data={employeeSelectData.map((item) => ({ value: item.id, label: item.label }))} value={effectiveEmployeeId} onChange={(value) => { if (value === null && subject) return; setSelectedEmployeeId(value); const current = items.find((row) => row.employeeId === value) ?? null; setSubject(current); hydrateActivePermissions(current); setPreviewed(false); }} />}{subject && <Text size="sm" c="dimmed">{subject.fullName} · {subject.employeeCode} · {subject.departmentName ?? 'Chưa xác định phòng ban'}</Text>}<Group justify="flex-end"><Button onClick={() => setStep(1)} disabled={!batchMode && !effectiveEmployeeId}>Tiếp tục</Button></Group></Stack>}
      {step === 1 && <Stack gap="md"><Alert color="blue" title="Phạm vi được giữ độc lập">Tìm để thêm phạm vi; thay đổi bộ lọc không xóa các phạm vi đang chọn. Bật Gửi luôn tự bật Đọc.</Alert><Tabs defaultValue="departments"><Tabs.List><Tabs.Tab value="departments">Cấp phòng ({selectedDepartmentCount})</Tabs.Tab><Tabs.Tab value="units">Cấp đơn vị ({selectedUnitCount})</Tabs.Tab><Tabs.Tab value="corporation">Tổng công ty</Tabs.Tab></Tabs.List><Tabs.Panel value="departments" pt="md"><Stack><Group align="end"><TextInput label="Thêm phòng ban" placeholder="Tìm theo tên phòng, mã phòng hoặc đơn vị" value={departmentSearch} onChange={(event) => setDepartmentSearch(event.currentTarget.value)} style={{ flex: 1 }} /><Select clearable searchable label="Đơn vị" placeholder="Tất cả đơn vị" data={(filterUnits.data?.items ?? []).map((unit) => ({ value: unit.unitId, label: canonicalUnitLabel(unit) }))} value={departmentUnitFilter} onChange={setDepartmentUnitFilter} w={260} /><Select label="Trạng thái" data={[{ value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'INACTIVE', label: 'Không hoạt động' }]} value={scopeStatus} onChange={(value) => setScopeStatus(value === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE')} w={160} /></Group><Select searchable nothingFoundMessage={departments.isFetching ? 'Đang tải danh sách phòng ban…' : 'Không tìm thấy phòng ban phù hợp.'} placeholder="Chọn phòng ban để thêm" data={departmentOptions} value={null} onChange={(value) => { const scope = value ? departmentById.get(value) : undefined; if (scope) addDepartment(scope); }} /><Text size="xs" c="dimmed">{departments.data?.total ?? 0} kết quả · {selectedDepartmentCount} phòng đã chọn</Text><SelectedDepartments scopes={displayDepartmentDrafts} onAction={updateDepartmentAction} onRemove={(id) => { markRemoved('DEPARTMENT_REPORT', id); setDepartmentDrafts((current) => { const next = { ...current }; delete next[id]; return next; }); setPreviewed(false); }} renderActions={renderScopeActions} /></Stack></Tabs.Panel><Tabs.Panel value="units" pt="md"><Stack><TextInput label="Thêm đơn vị" placeholder="Tìm theo tên hoặc mã đơn vị" value={unitSearch} onChange={(event) => setUnitSearch(event.currentTarget.value)} /><Select searchable nothingFoundMessage={units.isFetching ? 'Đang tải danh sách đơn vị…' : 'Không tìm thấy đơn vị phù hợp.'} placeholder="Chọn đơn vị để thêm" data={(units.data?.items ?? []).map((scope) => ({ value: scope.unitId, label: canonicalUnitLabel(scope) }))} value={null} onChange={(value) => { const scope = value ? unitById.get(value) : undefined; if (scope) addUnit(scope); }} /><SelectedUnits scopes={displayUnitDrafts} onAction={updateUnitAction} onRemove={(id) => { markRemoved('UNIT_REPORT', id); setUnitDrafts((current) => { const next = { ...current }; delete next[id]; return next; }); setPreviewed(false); }} renderActions={renderScopeActions} /></Stack></Tabs.Panel><Tabs.Panel value="corporation" pt="md"><Paper withBorder p="md"><Stack gap="xs"><Text fw={600}>Toàn Tổng công ty</Text><Text size="sm" c="dimmed">Tổng hợp báo cáo công việc toàn Tổng công ty</Text><Checkbox aria-label="Tổng hợp báo cáo công việc toàn Tổng công ty" label="Cho phép tổng hợp" checked={corporateActions.includes('AGGREGATE')} onChange={() => { setCorporateActions((current) => current.includes('AGGREGATE') ? [] : ['AGGREGATE']); setPreviewed(false); }} /></Stack></Paper></Tabs.Panel></Tabs>{removedPermissions.length > 0 && <Paper withBorder p="sm" bg="red.0"><Text fw={600} c="red">Sẽ thu hồi ({removedPermissions.length})</Text>{removedPermissions.map((permission) => <Group key={`${permission.type}:${permission.scopeId}`} justify="space-between"><Text size="sm">{permission.type === 'DEPARTMENT_REPORT' ? 'Quyền cấp phòng' : permission.type === 'UNIT_REPORT' ? 'Quyền cấp đơn vị' : 'Quyền Tổng công ty'} · {permission.scopeId}</Text><Button size="compact-xs" variant="subtle" onClick={() => setRemovedPermissions((current) => current.filter((item) => !(item.type === permission.type && item.scopeId === permission.scopeId)))}>Hoàn tác</Button></Group>)}</Paper>}<Group justify="space-between"><Button variant="default" onClick={() => setStep(0)}>Quay lại</Button><Button onClick={() => batchMode ? batchPreview.mutate() : preview.mutate()} loading={batchMode ? batchPreview.isPending : preview.isPending} disabled={!permissions.length && !removedPermissions.length}>Xem trước</Button></Group></Stack>}
      {step === 2 && <Stack><Text fw={600}>Xem trước thay đổi</Text><Preview scopes={displayDepartmentDrafts} units={displayUnitDrafts} corporateActions={corporateActions} corporationName={corporation.data?.label} /><Text size="sm" c="dimmed">Máy chủ sẽ kiểm tra trùng lặp, phạm vi inactive và các thay đổi cần tạo/cập nhật trước khi áp dụng.</Text><Group justify="space-between"><Button variant="default" onClick={() => setStep(1)}>Chỉnh sửa</Button><Button onClick={() => batchMode ? batchApply.mutate() : grant.mutate()} loading={batchMode ? batchApply.isPending : grant.isPending} disabled={!previewed}>Xác nhận cấp quyền</Button></Group></Stack>}
    </Drawer>
    <Drawer opened={Boolean(detail)} onClose={() => setDetail(null)} title="Chi tiết quyền báo cáo công việc" position="right" size={920} styles={{ content: { maxWidth: '95vw' }, body: { paddingBottom: 24 } }}>
      {detail && <PermissionDetail view={viewModels.get(detail.employeeId) ?? workReportAuthorizationToEmployeePermissionViewModel(detail)} onEdit={() => { setDetail(null); openDrawer(detail); }} />}
    </Drawer>
  </Stack>;
}

function ScopeCompact({ scopes, empty = 'Chưa cấp' }: { scopes: PermissionPresentation[]; empty?: string }) {
  if (!scopes.length) return <Text size="xs" c="dimmed">{empty}</Text>;
  const shown = scopes.slice(0, 2);
  return <Stack gap={5}>{shown.map((scope) => <Stack key={`${scope.type}:${scope.scopeId}`} gap={1}><Text size="xs" fw={600}>{scope.name}{scope.code ? ` · ${scope.code}` : ''}</Text>{scope.ownerName && <Text size="xs" c="dimmed">{scope.scopeKind === 'department' ? 'Gửi lên: ' : ''}{scope.ownerName}{scope.ownerCode ? ` · ${scope.ownerCode}` : ''}</Text>}<Group gap={4}><Badge size="xs" variant="light">{scope.accessLabel}</Badge>{scope.statusLabel !== 'Đang hoạt động' && <Badge size="xs" color="orange">{scope.statusLabel}</Badge>}</Group></Stack>)}{scopes.length > 2 && <Text size="xs" c="blue">+{scopes.length - 2} phạm vi khác</Text>}</Stack>;
}

function PermissionDetail({ view, onEdit }: { view: EmployeePermissionViewModel; onEdit: () => void }) {
  const groups: Array<[string, PermissionPresentation[]]> = [
    ['Cấp phòng', view.departmentPermissions], ['Cấp đơn vị', view.unitPermissions], ['Tổng công ty', view.corporationPermission ? [view.corporationPermission] : []],
  ];
  return <Stack gap="md"><Paper withBorder p="md"><Text fw={700}>{view.employee.fullName}</Text><Text size="sm" c="dimmed">{view.employee.employeeCode} · {view.employee.email ?? 'Chưa có email'}</Text><Text size="sm">{view.employee.jobTitle ?? 'Chưa xác định chức danh'} · {view.employee.departmentName ?? 'Chưa xác định phòng ban'} · {view.employee.unitName ?? 'Chưa xác định đơn vị'}</Text><Group mt="sm"><Badge>{view.summary.departmentScopeCount} phòng ban</Badge><Badge>{view.summary.unitScopeCount} đơn vị</Badge><Badge>{view.summary.hasCorporationScope ? 'Có quyền Tổng công ty' : 'Không có quyền Tổng công ty'}</Badge></Group></Paper><Paper withBorder p="md"><Text fw={600}>Quyền mặc định</Text><Text size="sm">Báo cáo cá nhân — Mặc định</Text><Text size="sm">Công việc tuần — Mặc định</Text></Paper>{groups.map(([label, scopes]) => <Stack key={label} gap="xs"><Text fw={600}>{label}</Text>{scopes.length ? scopes.map((scope) => <Paper key={`${scope.type}:${scope.scopeId}`} withBorder p="md"><Group justify="space-between" align="start"><Stack gap={2}><Text fw={600}>{scope.name}</Text><Text size="sm" c="dimmed">{scope.ownerName ? `${scope.ownerName} · ${scope.ownerCode}` : scope.code}</Text><Text size="sm">{scope.accessLabel}</Text><Text size="sm">Trạng thái: {scope.statusLabel}</Text><Text size="xs" c="dimmed">Cập nhật: {scope.updatedAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(scope.updatedAt)) : 'Chưa có dữ liệu'}</Text></Stack><Badge color={scope.statusLabel === 'Đang hoạt động' ? 'green' : 'orange'}>{scope.statusLabel}</Badge></Group></Paper>) : <Text size="sm" c="dimmed">Nhân sự chưa được cấp quyền tại phạm vi này.</Text>}</Stack>)}<Group justify="flex-end"><Button leftSection={<IconPencil size={16} />} onClick={onEdit}>Sửa quyền</Button></Group></Stack>;
}

function SelectedDepartments({ scopes, onAction, onRemove, renderActions }: { scopes: Record<string, DepartmentScopeDraft>; onAction: (id: string, action: BusinessAction) => void; onRemove: (id: string) => void; renderActions: (actions: BusinessAction[], onChange: (action: BusinessAction) => void, label: string) => ReactNode }) {
  const rows = Object.values(scopes);
  if (!rows.length) return <Text c="dimmed" size="sm">Chưa chọn phòng ban nào.</Text>;
  return <Stack gap="sm"><Text fw={600}>Phạm vi đã chọn</Text>{rows.map((scope) => <Paper key={scope.departmentId} withBorder p="md"><Stack gap="sm"><Group justify="space-between" align="start"><Stack gap={2}><Text fw={600}>{scope.departmentName}</Text><Text size="xs" c="dimmed">Mã phòng: {scope.departmentCode}</Text></Stack><ActionIcon color="red" variant="subtle" aria-label={`Xóa ${canonicalDepartmentLabel(scope)}`} onClick={() => onRemove(scope.departmentId)}><IconTrash size={16} /></ActionIcon></Group><Stack gap={2}><Text size="xs" fw={600} c="dimmed">ĐƠN VỊ NHẬN BÁO CÁO</Text><Text size="sm">{scope.unitName}</Text><Text size="xs" c="dimmed">{scope.unitCode}</Text></Stack><Stack gap={4}><Text size="xs" fw={600} c="dimmed">QUYỀN TẠI PHÒNG BAN</Text>{renderActions(scope.actions, (action) => onAction(scope.departmentId, action), canonicalDepartmentLabel(scope))}<Text size="xs" c="dimmed">{scope.actions.includes('SUBMIT') ? 'Được xem và gửi báo cáo tổng hợp của phòng lên đơn vị nhận.' : 'Được xem báo cáo trong phòng ban này.'}</Text></Stack></Stack></Paper>)}</Stack>;
}

function SelectedUnits({ scopes, onAction, onRemove, renderActions }: { scopes: Record<string, UnitScopeDraft>; onAction: (id: string, action: BusinessAction) => void; onRemove: (id: string) => void; renderActions: (actions: BusinessAction[], onChange: (action: BusinessAction) => void, label: string) => ReactNode }) {
  const rows = Object.values(scopes);
  if (!rows.length) return <Text c="dimmed" size="sm">Chưa chọn đơn vị nào.</Text>;
  return <Stack gap="sm"><Text fw={600}>Phạm vi đã chọn</Text>{rows.map((scope) => <Paper key={scope.unitId} withBorder p="md"><Stack gap="sm"><Group justify="space-between" align="start"><Stack gap={2}><Text fw={600}>{scope.unitName}</Text><Text size="xs" c="dimmed">{scope.unitCode}</Text></Stack><ActionIcon color="red" variant="subtle" aria-label={`Xóa ${canonicalUnitLabel(scope)}`} onClick={() => onRemove(scope.unitId)}><IconTrash size={16} /></ActionIcon></Group>{renderActions(scope.actions, (action) => onAction(scope.unitId, action), canonicalUnitLabel(scope))}<Text size="xs" c="dimmed">{scope.actions.includes('SUBMIT') ? 'Được xem và gửi báo cáo cấp đơn vị lên cấp Tổng công ty.' : 'Được xem báo cáo của các phòng thuộc đơn vị.'}</Text></Stack></Paper>)}</Stack>;
}

function Preview({ scopes, units, corporateActions, corporationName }: { scopes: Record<string, DepartmentScopeDraft>; units: Record<string, UnitScopeDraft>; corporateActions: BusinessAction[]; corporationName?: string }) {
  const label = (actions: BusinessAction[]) => actions.includes('SUBMIT') ? 'Đọc và gửi' : 'Chỉ đọc';
  const diff = (actions: BusinessAction[]) => <Stack gap={2}><Text size="sm">Quyền sau áp dụng: <b>{label(actions)}</b></Text><Text size="xs">= Đọc báo cáo</Text>{actions.includes('SUBMIT') && <Text size="xs">+ Gửi báo cáo</Text>}</Stack>;
  return <Stack gap="sm"><Alert color="blue" title="Tóm tắt thay đổi">{Object.keys(scopes).length + Object.keys(units).length + (corporateActions.length ? 1 : 0)} phạm vi sẽ được tạo mới hoặc cập nhật. Máy chủ xác nhận diff cuối cùng trước khi áp dụng.</Alert><Divider label="Cấp phòng" labelPosition="left" />{Object.values(scopes).map((scope) => <Paper key={scope.departmentId} withBorder p="sm"><Text fw={600}>{scope.departmentName}</Text><Text size="sm" c="dimmed">{scope.unitName} — {scope.unitCode} · {scope.departmentCode}</Text>{diff(scope.actions)}</Paper>)}<Divider label="Cấp đơn vị" labelPosition="left" />{Object.values(units).map((scope) => <Paper key={scope.unitId} withBorder p="sm"><Text fw={600}>{scope.unitName} — {scope.unitCode}</Text>{diff(scope.actions)}</Paper>)}{corporateActions.includes('AGGREGATE') ? <><Divider label="Tổng công ty" labelPosition="left" /><Paper withBorder p="sm"><Text fw={600}>{corporationName ?? 'Toàn Tổng công ty'}</Text><Text size="sm">Quyền sau áp dụng: <b>Tổng hợp báo cáo công việc toàn Tổng công ty</b></Text></Paper></> : null}</Stack>;
}
