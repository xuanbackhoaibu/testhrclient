import { useMemo, useState } from 'react';
import { Button, Drawer, Group, Select, SimpleGrid, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEye, IconPlus, IconSearch } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { createEmployee } from '../../features/employees/employeesApi';
import type { Employee, EmployeePayload } from '../../features/employees/employeeTypes';
import { useEmployees } from '../../features/employees/useEmployees';
import { downloadEmployeesExport } from '../../features/import-export/excelFilesApi';
import { HrmCoreExcelImportModal } from '../../features/import-export/HrmCoreExcelImportModal';
import { ImportExportToolbar } from '../../features/import-export/ImportExportToolbar';
import { useHrmCoreTemplateDownload } from '../../features/import-export/useHrmCoreTemplateDownload';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { TableActionsMenu } from '../../shared/components/TableActionsMenu';
import { mockDepartments, mockUnits } from '../../shared/mocks/mockOrganization';

const employmentStatusOptions = [
  { value: 'ACTIVE', label: 'Đang làm việc' },
  { value: 'PROBATION', label: 'Thử việc' },
  { value: 'SUSPENDED', label: 'Tạm dừng' },
  { value: 'TERMINATED', label: 'Nghỉ việc' },
  { value: 'RESIGNED', label: 'Đã nghỉ' },
];

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

export function EmployeesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    search: '',
    employmentStatus: undefined as string | undefined,
    unitId: undefined as string | undefined,
    departmentId: undefined as string | undefined,
  });

  const form = useForm<EmployeePayload>({
    initialValues: {
      fullName: '',
      companyEmail: '',
      personalEmail: '',
      phone: '',
      gender: '',
      dateOfBirth: '',
      hireDate: '',
      employmentStatus: 'ACTIVE',
      citizenId: '',
    },
    validate: {
      fullName: (value) => (value.trim() ? null : 'Nhập họ tên.'),
      hireDate: (value) => (value ? null : 'Chọn ngày vào làm.'),
      companyEmail: (value) => (!value || /^\S+@\S+$/.test(value) ? null : 'Email không hợp lệ.'),
      personalEmail: (value) => (!value || /^\S+@\S+$/.test(value) ? null : 'Email không hợp lệ.'),
    },
  });

  const { data, isLoading, error, refetch } = useEmployees(params);
  const templateDownload = useHrmCoreTemplateDownload();

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
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Không tạo được nhân sự',
        message: 'Vui lòng kiểm tra dữ liệu và thử lại.',
      });
    },
  });

  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
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
        header: 'Trạng thái',
        width: 150,
        render: (record) => <StatusTag status={record.employmentStatus} />,
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
            ]}
          />
        ),
      },
    ],
    [navigate],
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
            <Button leftSection={<IconPlus size={18} />} onClick={() => setOpen(true)}>
              Tạo nhân sự
            </Button>
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
            data={mockUnits.map((item) => ({ value: item.id, label: item.name }))}
            value={params.unitId ?? null}
            onChange={(value) =>
              setParams((current) => ({ ...current, unitId: value ?? undefined, page: 1 }))
            }
          />
          <Select
            placeholder="Phòng ban"
            clearable
            data={mockDepartments.map((item) => ({ value: item.id, label: item.name }))}
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
        onClose={() => {
          setOpen(false);
          form.reset();
        }}
        title="Tạo nhân sự"
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput label="Họ tên" withAsterisk {...form.getInputProps('fullName')} />
            <TextInput label="Email công ty" {...form.getInputProps('companyEmail')} />
            <TextInput label="Email cá nhân" {...form.getInputProps('personalEmail')} />
            <TextInput label="Số điện thoại" {...form.getInputProps('phone')} />
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
              label="Trạng thái"
              withAsterisk
              data={employmentStatusOptions}
              {...form.getInputProps('employmentStatus')}
            />
            <TextInput label="CCCD" {...form.getInputProps('citizenId')} />
            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                Hủy
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <HrmCoreExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onCommitted={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}
      />
    </>
  );
}
