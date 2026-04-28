import { useMemo, useState } from 'react';
import { Button, Drawer, Group, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconEdit, IconPlus, IconSearch } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createPosition, listPositions, updatePosition } from '../../features/organization/positionsApi';
import type { Position } from '../../features/organization/organizationTypes';
import { usePositions } from '../../features/organization/usePositions';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { TableActionsMenu } from '../../shared/components/TableActionsMenu';
import { exportRowsToExcel } from '../../shared/utils/excel';

type PositionFormValues = Omit<Position, 'id'>;

const statusOptions = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'INACTIVE', label: 'Tạm ngưng' },
];

export function PositionsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Position | null>(null);
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    search: '',
    status: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = usePositions(params);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const result = await listPositions({ ...params, page: 1, pageSize: 10000 });
      await exportRowsToExcel({
        fileName: `hrm-positions-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'Chức vụ',
        rows: result.items,
        columns: [
          { header: 'Mã', key: 'code', width: 16, value: (record) => record.code },
          { header: 'Tên chức vụ', key: 'name', width: 30, value: (record) => record.name },
          { header: 'Nhóm công việc', key: 'jobFunction', width: 24, value: (record) => record.jobFunction },
          { header: 'Grade', key: 'grade', width: 12, value: (record) => record.grade },
          { header: 'Trạng thái', key: 'status', width: 16, value: (record) => record.status },
        ],
      });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Không xuất được Excel',
        message: 'Vui lòng thử lại sau.',
      });
    },
  });

  const form = useForm<PositionFormValues>({
    initialValues: {
      code: '',
      name: '',
      jobFunction: '',
      grade: '',
      status: 'ACTIVE',
    },
    validate: {
      code: (value) => (value.trim() ? null : 'Nhập mã chức vụ.'),
      name: (value) => (value.trim() ? null : 'Nhập tên chức vụ.'),
      jobFunction: (value) => (value.trim() ? null : 'Nhập nhóm công việc.'),
      grade: (value) => (value.trim() ? null : 'Nhập grade.'),
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: PositionFormValues) => {
      if (editing) {
        return updatePosition(editing.id, values);
      }
      return createPosition(values);
    },
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: editing ? 'Đã cập nhật chức vụ' : 'Đã tạo chức vụ',
        message: 'Danh mục chức vụ đã được cập nhật.',
      });
      setOpen(false);
      setEditing(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Không lưu được chức vụ',
        message: 'Vui lòng kiểm tra dữ liệu và thử lại.',
      });
    },
  });

  const columns = useMemo<DataTableColumn<Position>[]>(
    () => [
      { key: 'code', header: 'Mã', width: 120, render: (record) => <Text fw={600}>{record.code}</Text> },
      { key: 'name', header: 'Tên chức vụ', render: (record) => record.name },
      { key: 'jobFunction', header: 'Nhóm công việc', render: (record) => record.jobFunction },
      { key: 'grade', header: 'Grade', width: 110, render: (record) => record.grade },
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
        title="Chức vụ"
        subtitle="Danh mục chức vụ, nhóm công việc và grade dùng cho hồ sơ nhân sự."
        actions={
          <>
            <Button
              variant="default"
              leftSection={<IconDownload size={18} />}
              loading={exportMutation.isPending}
              onClick={() => exportMutation.mutate()}
            >
              Xuất Excel
            </Button>
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => {
                setEditing(null);
                form.reset();
                setOpen(true);
              }}
            >
              Tạo chức vụ
            </Button>
          </>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            placeholder="Tìm mã, tên, nhóm công việc"
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
          data={data?.items ?? []}
          columns={columns}
          rowKey={(record) => record.id}
          meta={data?.pagination}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          onPageChange={(page, pageSize) => setParams((current) => ({ ...current, page, pageSize }))}
          emptyTitle="Chưa có chức vụ"
          emptyDescription="Không có chức vụ phù hợp với bộ lọc hiện tại."
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          form.reset();
        }}
        title={editing ? 'Chỉnh sửa chức vụ' : 'Tạo chức vụ'}
        position="right"
      >
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput label="Mã" withAsterisk {...form.getInputProps('code')} />
            <TextInput label="Tên chức vụ" withAsterisk {...form.getInputProps('name')} />
            <TextInput label="Nhóm công việc" withAsterisk {...form.getInputProps('jobFunction')} />
            <TextInput label="Grade" withAsterisk {...form.getInputProps('grade')} />
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
    </>
  );
}
