import { useCallback, useMemo, useState } from 'react';
import { Button, Drawer, Group, Select, SimpleGrid, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconEye, IconPlus, IconSearch } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { createEmployee, getEmployee, getNextEmployeeCode, updateEmployee } from '../../features/employees/employeesApi';
import type { Employee, EmployeePayload } from '../../features/employees/employeeTypes';
import { useEmployees } from '../../features/employees/useEmployees';
import { DomainExcelImportModal } from '../../features/import-export/DomainExcelImportModal';
import { PostImportAccountModal } from '../../features/import-export/PostImportAccountModal';
import { downloadEmployeesExport } from '../../features/import-export/excelFilesApi';
import { ImportExportToolbar } from '../../features/import-export/ImportExportToolbar';
import { useHrmCoreTemplateDownload } from '../../features/import-export/useHrmCoreTemplateDownload';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { TableActionsMenu } from '../../shared/components/TableActionsMenu';
import { useDepartmentsSelect } from '../../features/organization/useDepartments';
import { usePositionsSelect } from '../../features/organization/usePositions';
import { useUnitsSelect } from '../../features/organization/useUnits';
import { ApiError } from '../../shared/api/api.types';

const employmentStatusOptions = [
  { value: 'ACTIVE', label: 'Đang làm việc' },
  { value: 'PROBATION', label: 'Thử việc' },
  { value: 'SUSPENDED', label: 'Tạm dừng' },
  { value: 'TERMINATED', label: 'Nghỉ việc' },
  { value: 'RESIGNED', label: 'Đã nghỉ' },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const employeePayloadFields = new Set<keyof EmployeePayload>([
  'fullName',
  'companyEmail',
  'personalEmail',
  'phone',
  'gender',
  'dateOfBirth',
  'hireDate',
  'employmentStatus',
  'citizenId',
  'unitId',
  'departmentId',
  'positionId',
]);

function TruncatedCell({ value, maxWidth = 220 }: { value?: string | null; maxWidth?: number }) {
  const display = value || '-';
  return (
    <Tooltip label={display} disabled={!value || display.length < 24}>
      <Text span className="truncate-cell" style={{ maxWidth }}>
        {display}
      </Text>
    </Tooltip>
  );
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) {
    return '';
  }
  return new Date(value).toISOString().slice(0, 10);
}

function trimOptional(value?: string) {
  return value?.trim() ?? '';
}

function normalizeEmployeePayload(values: EmployeePayload): EmployeePayload {
  return {
    ...values,
    fullName: values.fullName.trim(),
    companyEmail: trimOptional(values.companyEmail).toLowerCase(),
    personalEmail: trimOptional(values.personalEmail).toLowerCase(),
    phone: trimOptional(values.phone),
    gender: trimOptional(values.gender),
    dateOfBirth: trimOptional(values.dateOfBirth),
    hireDate: values.hireDate.trim(),
    citizenId: trimOptional(values.citizenId),
    unitId: values.unitId.trim(),
    departmentId: values.departmentId.trim(),
    positionId: values.positionId.trim(),
  };
}

function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.errors[0]?.message ?? error.message;
  }
  return 'Vui lòng kiểm tra dữ liệu và thử lại.';
}

const emptyEmployeeFormValues: EmployeePayload = {
  fullName: '',
  companyEmail: '',
  personalEmail: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  hireDate: '',
  employmentStatus: 'ACTIVE',
  citizenId: '',
  unitId: '',
  departmentId: '',
  positionId: '',
};

export function EmployeesPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const mayCreateEmployee = can('hr.employee.create');
  const mayEditEmployee = can('hr.employee.update');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [postImport, setPostImport] = useState<{ batchId: string; count: number } | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [suggestedEmployeeCode, setSuggestedEmployeeCode] = useState('');
  const [isLoadingNextCode, setIsLoadingNextCode] = useState(false);
  const [nextCodeError, setNextCodeError] = useState<string | null>(null);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    search: '',
    employmentStatus: undefined as string | undefined,
    unitId: undefined as string | undefined,
    departmentId: undefined as string | undefined,
  });

  const form = useForm<EmployeePayload>({
    initialValues: emptyEmployeeFormValues,
    validate: {
      fullName: (value) => (value.trim() ? null : 'Nhập họ tên.'),
      hireDate: (value) => (value ? null : 'Chọn ngày vào làm.'),
      unitId: (value) => (value ? null : 'Vui lòng chọn đơn vị.'),
      departmentId: (value) => (value ? null : 'Vui lòng chọn phòng ban.'),
      positionId: (value) => (value ? null : 'Vui lòng chọn chức vụ.'),
      phone: (value) => (trimOptional(value) ? null : 'Vui lòng nhập số điện thoại.'),
      companyEmail: (value, values) => {
        const companyEmail = trimOptional(value);
        const personalEmail = trimOptional(values.personalEmail);
        if (!companyEmail && !personalEmail) {
          return 'Vui lòng nhập ít nhất một email.';
        }
        return companyEmail && !emailPattern.test(companyEmail)
          ? 'Email không đúng định dạng.'
          : null;
      },
      personalEmail: (value, values) => {
        const companyEmail = trimOptional(values.companyEmail);
        const personalEmail = trimOptional(value);
        if (!companyEmail && !personalEmail) {
          return 'Vui lòng nhập ít nhất một email.';
        }
        return personalEmail && !emailPattern.test(personalEmail)
          ? 'Email không đúng định dạng.'
          : null;
      },
    },
  });

  const { data, isLoading, error, refetch } = useEmployees(params);
  const unitsSelect = useUnitsSelect();
  const filterDepartmentsSelect = useDepartmentsSelect(params.unitId);
  const formDepartmentsSelect = useDepartmentsSelect(form.values.unitId || undefined);
  const positionsSelect = usePositionsSelect();
  const templateDownload = useHrmCoreTemplateDownload('employees');

  const unitOptions = (unitsSelect.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name} (${item.code})`,
  }));
  const filterDepartmentOptions = (filterDepartmentsSelect.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name} (${item.code})`,
  }));
  const formDepartmentOptions = (formDepartmentsSelect.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name} (${item.code})`,
  }));
  const positionOptions = (positionsSelect.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name} (${item.code})`,
  }));

  const exportMutation = useMutation({
    mutationFn: () => downloadEmployeesExport(params),
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Không xuất được Excel',
        message: 'Vui lòng thử lại sau.',
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Đã tạo nhân sự',
        message: 'Mã nhân sự hệ thống được backend tự sinh.',
      });
      setOpen(false);
      setSuggestedEmployeeCode('');
      setNextCodeError(null);
      form.setValues(emptyEmployeeFormValues);
      form.resetDirty(emptyEmployeeFormValues);
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        error.errors.forEach((item) => {
          if (item.field && employeePayloadFields.has(item.field as keyof EmployeePayload)) {
            form.setFieldError(item.field as keyof EmployeePayload, item.message);
          }
        });
      }
      notifications.show({
        color: 'red',
        title: 'Không tạo được nhân sự',
        message: getApiErrorMessage(error),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: EmployeePayload) => {
      if (!editing) {
        throw new Error('Missing editing employee');
      }
      return updateEmployee(editing.id, values);
    },
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Đã cập nhật nhân sự',
        message: 'Thông tin nhân sự và phân công chính đã được cập nhật.',
      });
      setOpen(false);
      setEditing(null);
      setSuggestedEmployeeCode('');
      setNextCodeError(null);
      form.setValues(emptyEmployeeFormValues);
      form.resetDirty(emptyEmployeeFormValues);
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['employee-detail'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        error.errors.forEach((item) => {
          if (item.field && employeePayloadFields.has(item.field as keyof EmployeePayload)) {
            form.setFieldError(item.field as keyof EmployeePayload, item.message);
          }
        });
      }
      notifications.show({
        color: 'red',
        title: 'Không cập nhật được nhân sự',
        message: getApiErrorMessage(error),
      });
    },
  });

  async function openCreateDrawer() {
    setEditing(null);
    setSuggestedEmployeeCode('');
    setNextCodeError(null);
    form.setValues(emptyEmployeeFormValues);
    form.resetDirty(emptyEmployeeFormValues);
    setOpen(true);
    setIsLoadingNextCode(true);
    try {
      const result = await getNextEmployeeCode();
      setSuggestedEmployeeCode(result.code);
    } catch (error) {
      setNextCodeError(getApiErrorMessage(error));
      notifications.show({
        color: 'red',
        title: 'Không lấy được mã nhân sự',
        message: getApiErrorMessage(error),
      });
    } finally {
      setIsLoadingNextCode(false);
    }
  }

  const openEditDrawer = useCallback(async (employeeId: string) => {
    if (!mayEditEmployee) {
      return;
    }
    const detail = await getEmployee(employeeId);
    setEditing(detail);
    setSuggestedEmployeeCode('');
    setNextCodeError(null);
    const values: EmployeePayload = {
      fullName: detail.fullName,
      companyEmail: detail.companyEmail ?? '',
      personalEmail: detail.personalEmail ?? '',
      phone: detail.phone ?? '',
      gender: detail.gender ?? '',
      dateOfBirth: toDateInputValue(detail.dateOfBirth),
      hireDate: toDateInputValue(detail.hireDate),
      employmentStatus: detail.employmentStatus,
      citizenId: '',
      unitId: detail.currentEmployeeAssignment?.unitId ?? detail.unitId ?? '',
      departmentId: detail.currentEmployeeAssignment?.departmentId ?? detail.departmentId ?? '',
      positionId: detail.currentEmployeeAssignment?.positionId ?? detail.positionId ?? '',
    };
    form.setValues(values);
    form.resetDirty(values);
    setOpen(true);
  }, [form, mayEditEmployee]);

  function closeEmployeeDrawer() {
    setOpen(false);
    setEditing(null);
    setSuggestedEmployeeCode('');
    setNextCodeError(null);
    form.setValues(emptyEmployeeFormValues);
    form.resetDirty(emptyEmployeeFormValues);
  }

  function submitEmployee(values: EmployeePayload) {
    const normalizedValues = normalizeEmployeePayload(values);
    form.setValues(normalizedValues);
    if (
      isLoadingNextCode ||
      unitsSelect.isLoading ||
      formDepartmentsSelect.isLoading ||
      positionsSelect.isLoading
    ) {
      notifications.show({
        color: 'yellow',
        title: 'Dữ liệu đang tải',
        message: 'Vui lòng chờ tải xong mã nhân sự, đơn vị, phòng ban và chức vụ.',
      });
      return;
    }
    if (unitsSelect.isError || formDepartmentsSelect.isError || positionsSelect.isError) {
      notifications.show({
        color: 'red',
        title: 'Không tải được danh mục',
        message: 'Vui lòng tải lại đơn vị, phòng ban và chức vụ trước khi lưu.',
      });
      return;
    }

    if (editing) {
      updateMutation.mutate(normalizedValues);
      return;
    }
    createMutation.mutate(normalizedValues);
  }

  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      {
        key: 'employeeCode',
        header: 'Mã NS',
        width: 110,
        render: (record) => record.employeeCode,
      },
      {
        key: 'fullName',
        header: 'Họ tên',
        render: (record) => <TruncatedCell value={record.fullName} />,
      },
      {
        key: 'companyEmail',
        header: 'Email',
        render: (record) => <TruncatedCell value={record.companyEmail} maxWidth={240} />,
      },
      {
        key: 'phone',
        header: 'SDT',
        width: 130,
        render: (record) => record.phone || '-',
      },
      {
        key: 'employmentStatus',
        header: 'TT nhân sự',
        width: 150,
        render: (record) => <StatusTag status={record.employmentStatus} />,
      },
      {
        key: 'accountStatus',
        header: 'TT tài khoản',
        width: 150,
        render: (record) => <StatusTag status={record.accountStatus ?? 'NOT_CREATED'} />,
      },
      {
        key: 'department',
        header: 'Phòng ban',
        render: (record) => <TruncatedCell value={record.currentEmployeeAssignment?.departmentName} />,
      },
      {
        key: 'jobTitle',
        header: 'Chức danh',
        render: (record) => <TruncatedCell value={record.currentEmployeeAssignment?.jobTitle} />,
      },
      {
        key: 'actions',
        header: '',
        width: 70,
        align: 'right',
        render: (record) => (
          <TableActionsMenu
            actions={[
              {
                label: 'Xem chi tiết',
                icon: <IconEye size={16} />,
                onClick: () => navigate(`/employees/${record.id}`),
              },
              ...(mayEditEmployee ? [
              {
                label: 'Sửa nhân sự',
                icon: <IconEdit size={16} />,
                onClick: () => void openEditDrawer(record.id),
              },
              ] : []),
            ]}
          />
        ),
      },
    ],
    [mayEditEmployee, navigate, openEditDrawer],
  );

  return (
    <>
      <PageHeader
        title="Nhân sự"
        subtitle="Quản lý hồ sơ nhân sự, trạng thái làm việc và phân công hiện tại."
        actions={
          <>
            <ImportExportToolbar
              onDownloadTemplate={templateDownload.downloadTemplate}
              onImport={() => setImportOpen(true)}
              onExport={() => exportMutation.mutateAsync()}
              isDownloadingTemplate={templateDownload.isDownloadingTemplate}
              isExporting={exportMutation.isPending}
            />
            {mayCreateEmployee ? (
            <Button leftSection={<IconPlus size={18} />} onClick={() => void openCreateDrawer()}>
              Tạo nhân sự
            </Button>
            ) : null}
          </>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
          <TextInput
            placeholder="Tìm tên, email, SĐT"
            leftSection={<IconSearch size={17} />}
            value={params.search}
            onChange={(event) =>
              setParams((current) => ({ ...current, search: event.currentTarget.value, page: 1 }))
            }
          />
          <Select
            placeholder="Trạng thái"
            clearable
            data={employmentStatusOptions}
            value={params.employmentStatus ?? null}
            onChange={(value) =>
              setParams((current) => ({ ...current, employmentStatus: value ?? undefined, page: 1 }))
            }
          />
          <Select
            placeholder="Đơn vị"
            clearable
            data={unitOptions}
            disabled={unitsSelect.isLoading || unitsSelect.isError}
            nothingFoundMessage="Không có đơn vị active"
            value={params.unitId ?? null}
            onChange={(value) =>
              setParams((current) => ({
                ...current,
                unitId: value ?? undefined,
                departmentId: undefined,
                page: 1,
              }))
            }
          />
          <Select
            placeholder="Phòng ban"
            clearable
            data={filterDepartmentOptions}
            disabled={filterDepartmentsSelect.isLoading || filterDepartmentsSelect.isError}
            nothingFoundMessage="Không có phòng ban active"
            value={params.departmentId ?? null}
            onChange={(value) =>
              setParams((current) => ({ ...current, departmentId: value ?? undefined, page: 1 }))
            }
          />
        </SimpleGrid>

        <DataTable
          data={data?.items ?? []}
          columns={columns}
          rowKey={(record) => record.id}
          meta={data?.pagination}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          onRowClick={(record) => navigate(`/employees/${record.id}`)}
          onPageChange={(page, pageSize) => setParams((current) => ({ ...current, page, pageSize }))}
          emptyTitle="Chưa có nhân sự"
          emptyDescription="Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại."
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={closeEmployeeDrawer}
        title={editing ? 'Sửa nhân sự' : 'Tạo nhân sự'}
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit(submitEmployee)}>
          <Stack gap="sm">
            <TextInput
              label="Mã nhân sự"
              value={editing?.employeeCode ?? suggestedEmployeeCode}
              readOnly
              disabled={isLoadingNextCode}
              placeholder={isLoadingNextCode ? 'Đang lấy mã...' : '000001'}
              error={!editing ? nextCodeError : null}
            />
            <TextInput label="Họ tên" withAsterisk {...form.getInputProps('fullName')} />
            <TextInput label="Email công ty" {...form.getInputProps('companyEmail')} />
            <TextInput label="Email cá nhân" {...form.getInputProps('personalEmail')} />
            <TextInput label="Số điện thoại" withAsterisk {...form.getInputProps('phone')} />
            <Select
              label="Giới tính"
              clearable
              data={[
                { value: 'MALE', label: 'Nam' },
                { value: 'FEMALE', label: 'Nữ' },
                { value: 'OTHER', label: 'Khác' },
              ]}
              {...form.getInputProps('gender')}
            />
            <TextInput label="Ngày sinh" type="date" {...form.getInputProps('dateOfBirth')} />
            <TextInput label="Ngày vào làm" type="date" withAsterisk {...form.getInputProps('hireDate')} />
            <Select
              label="Đơn vị"
              placeholder={unitsSelect.isLoading ? 'Đang tải đơn vị...' : 'Chọn đơn vị'}
              withAsterisk
              searchable
              data={unitOptions}
              disabled={unitsSelect.isLoading || unitsSelect.isError}
              nothingFoundMessage="Không có đơn vị active"
              value={form.values.unitId || null}
              error={form.errors.unitId}
              onChange={(value) => {
                form.setFieldValue('unitId', value ?? '');
                form.setFieldValue('departmentId', '');
              }}
            />
            <Select
              label="Phòng ban"
              placeholder={form.values.unitId ? 'Chọn phòng ban' : 'Vui lòng chọn đơn vị trước'}
              withAsterisk
              searchable
              data={formDepartmentOptions}
              disabled={!form.values.unitId || formDepartmentsSelect.isLoading || formDepartmentsSelect.isError}
              nothingFoundMessage="Không có phòng ban active"
              value={form.values.departmentId || null}
              error={form.errors.departmentId}
              onChange={(value) => form.setFieldValue('departmentId', value ?? '')}
            />
            <Select
              label="Chức vụ"
              placeholder={positionsSelect.isLoading ? 'Đang tải chức vụ...' : 'Chọn chức vụ'}
              withAsterisk
              searchable
              data={positionOptions}
              disabled={positionsSelect.isLoading || positionsSelect.isError}
              nothingFoundMessage="Không có chức vụ active"
              value={form.values.positionId || null}
              error={form.errors.positionId}
              onChange={(value) => form.setFieldValue('positionId', value ?? '')}
            />
            <Select
              label="Trạng thái"
              withAsterisk
              data={employmentStatusOptions}
              {...form.getInputProps('employmentStatus')}
            />
            <TextInput label="CCCD" {...form.getInputProps('citizenId')} />
            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={closeEmployeeDrawer}
              >
                Hủy
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending || isLoadingNextCode}>
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <DomainExcelImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Excel Nhân sự"
        module="employees"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}
        onAfterCommit={(result) => {
          if (can('auth.account.create')) {
            setPostImport({ batchId: result.batchId, count: 0 });
          }
        }}
      />

      {postImport && (
        <PostImportAccountModal
          open={true}
          batchId={postImport.batchId}
          importedCount={postImport.count}
          onClose={() => setPostImport(null)}
        />
      )}
    </>
  );
}
