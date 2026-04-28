import { useMemo, useState } from 'react';
import { Button, Drawer, Group, Select, SimpleGrid, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createUnit, updateUnit } from '../../features/organization/unitsApi';
import type { Unit } from '../../features/organization/organizationTypes';
import { useUnits } from '../../features/organization/useUnits';
import { ConfirmActionModal } from '../../shared/components/ConfirmActionModal';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { TableActionsMenu } from '../../shared/components/TableActionsMenu';

type UnitFormValues = Omit<Unit, 'id'>;

const statusOptions = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'INACTIVE', label: 'Tạm ngưng' },
];

function TruncatedCell({ value }: { value?: string | null }) {
  const display = value || '-';
  return (
    <Tooltip label={display} disabled={!value || display.length < 24}>
      <Text span className="truncate-cell">
        {display}
      </Text>
    </Tooltip>
  );
}

export function UnitsPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    search: '',
    status: undefined as string | undefined,
  });
  const [editing, setEditing] = useState<Unit | null>(null);
  const [confirmInactive, setConfirmInactive] = useState<Unit | null>(null);
  const [open, setOpen] = useState(false);
  const { data, isLoading, error, refetch } = useUnits(params);

  const form = useForm<UnitFormValues>({
    initialValues: {
      code: '',
      name: '',
      shortName: '',
      taxCode: '',
      status: 'ACTIVE',
    },
    validate: {
      code: (value) => (value.trim() ? null : 'Nhập mã pháp nhân.'),
      name: (value) => (value.trim() ? null : 'Nhập tên pháp nhân.'),
      shortName: (value) => (value.trim() ? null : 'Nhập tên viết tắt.'),
      taxCode: (value) => (value.trim() ? null : 'Nhập mã số thuế.'),
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: Partial<UnitFormValues>) => {
      if (editing) {
        return updateUnit(editing.id, values);
      }
      return createUnit(values as UnitFormValues);
    },
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: editing ? 'Đã cập nhật pháp nhân' : 'Đã tạo pháp nhân',
        message: 'Dữ liệu đã được lưu.',
      });
      setOpen(false);
      setEditing(null);
      setConfirmInactive(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Không lưu được pháp nhân',
        message: 'Vui lòng kiểm tra dữ liệu và thử lại.',
      });
    },
  });

  const inactiveMutation = useMutation({
    mutationFn: (record: Unit) => updateUnit(record.id, { ...record, status: 'INACTIVE' }),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Đã tạm ngưng pháp nhân',
        message: 'Trạng thái pháp nhân đã được cập nhật.',
      });
      setConfirmInactive(null);
      await queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Không tạm ngưng được pháp nhân',
        message: 'Vui lòng thử lại.',
      });
    },
  });

  const columns = useMemo<DataTableColumn<Unit>[]>(
    () => [
      { key: 'code', header: 'Mã', width: 120, render: (record) => <Text fw={600}>{record.code}</Text> },
      { key: 'name', header: 'Tên pháp nhân', render: (record) => <TruncatedCell value={record.name} /> },
      { key: 'shortName', header: 'Tên tắt', render: (record) => record.shortName || '-' },
      { key: 'taxCode', header: 'Mã số thuế', render: (record) => <TruncatedCell value={record.taxCode} /> },
      { key: 'status', header: 'Trạng thái', width: 140, render: (record) => <StatusTag status={record.status} /> },
      {
        key: 'actions',
        header: '',
        width: 70,
        align: 'right',
        render: (record) => (
          <TableActionsMenu
            actions={[
              {
                label: 'Chỉnh sửa',
                icon: <IconEdit size={16} />,
                onClick: () => {
                  setEditing(record);
                  form.setValues(record);
                  setOpen(true);
                },
              },
              {
                label: 'Tạm ngưng',
                icon: <IconX size={16} />,
                color: 'red',
                disabled: record.status === 'INACTIVE',
                onClick: () => setConfirmInactive(record),
              },
            ]}
          />
        ),
      },
    ],
    [form],
  );

  return (
    <>
      <PageHeader
        title="Pháp nhân"
        subtitle="Quản lý pháp nhân dùng trong hồ sơ nhân sự và phân quyền dữ liệu."
        actions={
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => {
              setEditing(null);
              form.reset();
              setOpen(true);
            }}
          >
            Tạo pháp nhân
          </Button>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            placeholder="Tìm mã hoặc tên"
            leftSection={<IconSearch size={17} />}
            value={params.search}
            onChange={(event) =>
              setParams((current) => ({ ...current, search: event.currentTarget.value, page: 1 }))
            }
          />
          <Select
            placeholder="Trạng thái"
            clearable
            data={statusOptions}
            value={params.status ?? null}
            onChange={(value) =>
              setParams((current) => ({ ...current, status: value ?? undefined, page: 1 }))
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
          onPageChange={(page, pageSize) => setParams((current) => ({ ...current, page, pageSize }))}
          emptyTitle="Chưa có pháp nhân"
          emptyDescription="Không có pháp nhân phù hợp với bộ lọc hiện tại."
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          form.reset();
        }}
        title={editing ? 'Chỉnh sửa pháp nhân' : 'Tạo pháp nhân'}
        position="right"
      >
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput label="Mã" withAsterisk {...form.getInputProps('code')} />
            <TextInput label="Tên pháp nhân" withAsterisk {...form.getInputProps('name')} />
            <TextInput label="Tên viết tắt" withAsterisk {...form.getInputProps('shortName')} />
            <TextInput label="Mã số thuế" withAsterisk {...form.getInputProps('taxCode')} />
            <Select label="Trạng thái" data={statusOptions} withAsterisk {...form.getInputProps('status')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <ConfirmActionModal
        opened={Boolean(confirmInactive)}
        title="Tạm ngưng pháp nhân?"
        message="Pháp nhân sẽ được chuyển sang trạng thái tạm ngưng. Dữ liệu lịch sử không bị xóa."
        confirmLabel="Tạm ngưng"
        loading={inactiveMutation.isPending}
        onClose={() => setConfirmInactive(null)}
        onConfirm={() => {
          if (confirmInactive) {
            inactiveMutation.mutate(confirmInactive);
          }
        }}
      />
    </>
  );
}
