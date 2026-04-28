import { useMemo, useState } from 'react';
import { Button, Drawer, Group, Select, SimpleGrid, Stack, TextInput, Tooltip, Text } from '@mantine/core';
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
import { mockLegalEntities, mockOrgUnits } from '../../shared/mocks/mockOrganization';

const employmentStatusOptions = [
  { value: 'ACTIVE', label: 'Đang làm việc' },
  { value: 'PROBATION', label: 'Thử việc' },
  { value: 'INACTIVE', label: 'Tạm ngưng' },
  { value: 'TERMINATED', label: 'Nghỉ việc' },
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
    status: undefined as string | undefined,
    legalEntityId: undefined as string | undefined,
    orgUnitId: undefined as string | undefined,
  });

  const form = useForm<EmployeePayload>({
    initialValues: {
      employeeCode: '',
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
      employeeCode: (value) => (value.trim() ? null : 'Nhập mã nhân sự.'),
      fullName: (value) => (value.trim() ? null : 'Nhập họ tên.'),
      hireDate: (value) => (value ? null : 'Chọn ngày vào làm.'),
      companyEmail: (value) => (!value || /^\S+@\S+$/.test(value) ? null : 'Email không hợp lệ.'),
      personalEmail: (value) => (!value || /^\S+@\S+$/.test(value) ? null : 'Email không hợp lệ.'),
    },
  });

  const { data, isLoading, error, refetch } = useEmployees(params);

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Đã tạo nhân sự',
        message: 'Danh sách nhân sự đã được cập nhật.',
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
        key: 'employeeCode',
        header: 'Mã NV',
        width: 120,
        render: (record) => <Text fw={600}>{record.employeeCode}</Text>,
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
        header: 'SĐT',
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
        key: 'orgUnit',
        header: 'Đơn vị',
        render: (record) => <TruncatedCell value={record.currentAssignment.orgUnitName} />,
      },
      {
        key: 'jobTitle',
        header: 'Chức danh',
        render: (record) => <TruncatedCell value={record.currentAssignment.jobTitle} />,
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
        subtitle="Quản lý hồ sơ nhân sự, trạng thái làm việc và thông tin đơn vị hiện tại."
        actions={
          <Button leftSection={<IconPlus size={18} />} onClick={() => setOpen(true)}>
            Tạo nhân sự
          </Button>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
          <TextInput
            placeholder="Tìm mã, tên, email"
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
            value={params.status ?? null}
            onChange={(value) =>
              setParams((current) => ({ ...current, status: value ?? undefined, page: 1 }))
            }
          />
          <Select
            placeholder="Pháp nhân"
            clearable
            data={mockLegalEntities.map((item) => ({ value: item.id, label: item.name }))}
            value={params.legalEntityId ?? null}
            onChange={(value) =>
              setParams((current) => ({ ...current, legalEntityId: value ?? undefined, page: 1 }))
            }
          />
          <Select
            placeholder="Đơn vị"
            clearable
            data={mockOrgUnits.map((item) => ({ value: item.id, label: item.name }))}
            value={params.orgUnitId ?? null}
            onChange={(value) =>
              setParams((current) => ({ ...current, orgUnitId: value ?? undefined, page: 1 }))
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
            <TextInput label="Mã nhân sự" withAsterisk {...form.getInputProps('employeeCode')} />
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
    </>
  );
}
