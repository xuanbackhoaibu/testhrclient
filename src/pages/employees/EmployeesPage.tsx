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
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { TableActionsMenu } from '../../shared/components/TableActionsMenu';
import { mockDepartments, mockUnits } from '../../shared/mocks/mockOrganization';

const employmentStatusOptions = [
  { value: 'ACTIVE', label: 'Dang lam viec' },
  { value: 'PROBATION', label: 'Thu viec' },
  { value: 'SUSPENDED', label: 'Tam dung' },
  { value: 'TERMINATED', label: 'Nghi viec' },
  { value: 'RESIGNED', label: 'Da nghi' },
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
      fullName: (value) => (value.trim() ? null : 'Nhap ho ten.'),
      hireDate: (value) => (value ? null : 'Chon ngay vao lam.'),
      companyEmail: (value) => (!value || /^\S+@\S+$/.test(value) ? null : 'Email khong hop le.'),
      personalEmail: (value) => (!value || /^\S+@\S+$/.test(value) ? null : 'Email khong hop le.'),
    },
  });

  const { data, isLoading, error, refetch } = useEmployees(params);

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Da tao nhan su',
        message: 'Ma nhan su he thong duoc backend tu sinh.',
      });
      setOpen(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Khong tao duoc nhan su',
        message: 'Vui long kiem tra du lieu va thu lai.',
      });
    },
  });

  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      {
        key: 'fullName',
        header: 'Ho ten',
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
        header: 'Trang thai',
        width: 150,
        render: (record) => <StatusTag status={record.employmentStatus} />,
      },
      {
        key: 'department',
        header: 'Phong ban',
        render: (record) => <TruncatedCell value={record.currentEmployeeAssignment?.departmentName} />,
      },
      {
        key: 'jobTitle',
        header: 'Chuc danh',
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
                label: 'Xem chi tiet',
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
        title="Nhan su"
        subtitle="Quan ly ho so nhan su, trang thai lam viec va phan cong hien tai."
        actions={
          <Button leftSection={<IconPlus size={18} />} onClick={() => setOpen(true)}>
            Tao nhan su
          </Button>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
          <TextInput
            placeholder="Tim ten, email, SDT"
            leftSection={<IconSearch size={17} />}
            value={params.search}
            onChange={(event) =>
              setParams((current) => ({ ...current, search: event.currentTarget.value, page: 1 }))
            }
          />
          <Select
            placeholder="Trang thai"
            clearable
            data={employmentStatusOptions}
            value={params.employmentStatus ?? null}
            onChange={(value) =>
              setParams((current) => ({ ...current, employmentStatus: value ?? undefined, page: 1 }))
            }
          />
          <Select
            placeholder="Don vi"
            clearable
            data={mockUnits.map((item) => ({ value: item.id, label: item.name }))}
            value={params.unitId ?? null}
            onChange={(value) =>
              setParams((current) => ({ ...current, unitId: value ?? undefined, page: 1 }))
            }
          />
          <Select
            placeholder="Phong ban"
            clearable
            data={mockDepartments.map((item) => ({ value: item.id, label: item.name }))}
            value={params.departmentId ?? null}
            onChange={(value) =>
              setParams((current) => ({ ...current, departmentId: value ?? undefined, page: 1 }))
            }
          />
        </SimpleGrid>

        <DataTable
          data={data?.data ?? []}
          columns={columns}
          rowKey={(record) => record.id}
          meta={data?.meta}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          onRowClick={(record) => navigate(`/employees/${record.id}`)}
          onPageChange={(page, pageSize) => setParams((current) => ({ ...current, page, pageSize }))}
          emptyTitle="Chua co nhan su"
          emptyDescription="Khong tim thay nhan su phu hop voi bo loc hien tai."
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={() => {
          setOpen(false);
          form.reset();
        }}
        title="Tao nhan su"
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput label="Ho ten" withAsterisk {...form.getInputProps('fullName')} />
            <TextInput label="Email cong ty" {...form.getInputProps('companyEmail')} />
            <TextInput label="Email ca nhan" {...form.getInputProps('personalEmail')} />
            <TextInput label="So dien thoai" {...form.getInputProps('phone')} />
            <Select
              label="Gioi tinh"
              clearable
              data={[
                { value: 'MALE', label: 'Nam' },
                { value: 'FEMALE', label: 'Nu' },
                { value: 'OTHER', label: 'Khac' },
              ]}
              {...form.getInputProps('gender')}
            />
            <TextInput label="Ngay sinh" type="date" {...form.getInputProps('dateOfBirth')} />
            <TextInput label="Ngay vao lam" type="date" withAsterisk {...form.getInputProps('hireDate')} />
            <Select
              label="Trang thai"
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
                Huy
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Luu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>
    </>
  );
}
