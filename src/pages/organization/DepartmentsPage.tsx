import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Button, Drawer, Group, Paper, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconSearch, IconSitemap, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { downloadDepartmentsExport } from '../../features/import-export/excelFilesApi';
import { HrmCoreExcelImportModal } from '../../features/import-export/HrmCoreExcelImportModal';
import { ImportExportToolbar } from '../../features/import-export/ImportExportToolbar';
import { useHrmCoreTemplateDownload } from '../../features/import-export/useHrmCoreTemplateDownload';
import { createDepartment, updateDepartment } from '../../features/organization/departmentsApi';
import type { Department } from '../../features/organization/organizationTypes';
import { useDepartments } from '../../features/organization/useDepartments';
import { ConfirmActionModal } from '../../shared/components/ConfirmActionModal';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { TableActionsMenu } from '../../shared/components/TableActionsMenu';
import { mockUnits, mockDepartments } from '../../shared/mocks/mockOrganization';

type DepartmentFormValues = Omit<Department, 'id'>;

const statusOptions = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'INACTIVE', label: 'Tạm ngưng' },
];

function renderOrgTree(nodes: Array<Department & { children?: Department[] }>, level = 0): ReactNode {
  return nodes.map((node) => (
    <Stack key={node.id} gap={4} pl={level ? 'md' : 0}>
      <Group gap="xs" wrap="nowrap">
        <IconSitemap size={16} color="#64748b" />
        <Text size="sm" fw={level === 0 ? 650 : 500}>
          {node.name}
        </Text>
        <Text size="xs" c="dimmed">
          {node.code}
        </Text>
        <StatusTag status={node.status} />
      </Group>
      {node.children?.length ? renderOrgTree(node.children, level + 1) : null}
    </Stack>
  ));
}

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    search: '',
    unitId: undefined as string | undefined,
    status: undefined as string | undefined,
  });
  const [editing, setEditing] = useState<Department | null>(null);
  const [confirmInactive, setConfirmInactive] = useState<Department | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading, error, refetch } = useDepartments(params);
  const templateDownload = useHrmCoreTemplateDownload();

  const exportMutation = useMutation({
    mutationFn: () => downloadDepartmentsExport(params),
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Không xuất được Excel',
        message: 'Vui lòng thử lại sau.',
      });
    },
  });

  const form = useForm<DepartmentFormValues>({
    initialValues: {
      code: '',
      unitId: '',
      parentId: '',
      name: '',
      type: '',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: '',
      status: 'ACTIVE',
    },
    validate: {
      code: (value) => (value.trim() ? null : 'Nhập mã phòng ban.'),
      unitId: (value) => (value ? null : 'Chọn đơn vị.'),
      name: (value) => (value.trim() ? null : 'Nhập tên phòng ban.'),
      type: (value) => (value.trim() ? null : 'Nhập loại phòng ban.'),
      effectiveFrom: (value) => (value ? null : 'Chọn ngày hiệu lực.'),
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: DepartmentFormValues) => {
      const payload = { ...values, parentId: values.parentId || undefined, effectiveTo: values.effectiveTo || undefined };
      if (editing) {
        return updateDepartment(editing.id, payload);
      }
      return createDepartment(payload);
    },
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: editing ? 'Đã cập nhật phòng ban' : 'Đã tạo phòng ban',
        message: 'Cấu trúc tổ chức đã được cập nhật.',
      });
      setOpen(false);
      setEditing(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Không lưu được phòng ban',
        message: 'Vui lòng kiểm tra dữ liệu và thử lại.',
      });
    },
  });

  const inactiveMutation = useMutation({
    mutationFn: (record: Department) => updateDepartment(record.id, { ...record, status: 'INACTIVE' }),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Đã tạm ngưng phòng ban',
        message: 'Trạng thái phòng ban đã được cập nhật.',
      });
      setConfirmInactive(null);
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Không tạm ngưng được phòng ban',
        message: 'Vui lòng thử lại.',
      });
    },
  });

  const columns = useMemo<DataTableColumn<Department>[]>(
    () => [
      { key: 'code', header: 'Mã', width: 120, render: (record) => <Text fw={600}>{record.code}</Text> },
      { key: 'name', header: 'Tên đơn vị', render: (record) => record.name },
      { key: 'type', header: 'Loại', width: 140, render: (record) => record.type },
      { key: 'effectiveFrom', header: 'Hiệu lực từ', width: 140, render: (record) => record.effectiveFrom },
      { key: 'effectiveTo', header: 'Hiệu lực đến', width: 140, render: (record) => record.effectiveTo || '-' },
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
                  form.setValues({ ...record, parentId: record.parentId ?? '', effectiveTo: record.effectiveTo ?? '' });
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
        title="Phòng ban"
        subtitle="Quản lý phòng ban theo đơn vị, cấp cha con và trạng thái hiệu lực."
        actions={
          <>
            <ImportExportToolbar
              onDownloadTemplate={templateDownload.downloadTemplate}
              onImport={() => setImportOpen(true)}
              onExport={() => exportMutation.mutateAsync()}
              isDownloadingTemplate={templateDownload.isDownloadingTemplate}
              isExporting={exportMutation.isPending}
            />
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => {
                setEditing(null);
                form.reset();
                setOpen(true);
              }}
            >
              Tạo phòng ban
            </Button>
          </>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <TextInput
            placeholder="Tìm mã hoặc tên"
            leftSection={<IconSearch size={17} />}
            value={params.search}
            onChange={(event) =>
              setParams((current) => ({ ...current, search: event.currentTarget.value, page: 1 }))
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
          emptyTitle="Chưa có phòng ban"
          emptyDescription="Không có phòng ban phù hợp với bộ lọc hiện tại."
        />

        {data?.tree?.length ? (
          <Paper p="md" radius="md">
            <Stack gap="sm">
              <Text fw={650}>Cây tổ chức</Text>
              {renderOrgTree(data.tree)}
            </Stack>
          </Paper>
        ) : null}
      </Stack>

      <Drawer
        opened={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          form.reset();
        }}
        title={editing ? 'Chỉnh sửa phòng ban' : 'Tạo phòng ban'}
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput label="Mã" withAsterisk {...form.getInputProps('code')} />
            <Select
              label="Đơn vị"
              data={mockUnits.map((item) => ({ value: item.id, label: item.name }))}
              withAsterisk
              {...form.getInputProps('unitId')}
            />
            <Select
              label="Phòng ban cha"
              clearable
              data={mockDepartments.map((item) => ({ value: item.id, label: item.name }))}
              {...form.getInputProps('parentId')}
            />
            <TextInput label="Tên phòng ban" withAsterisk {...form.getInputProps('name')} />
            <TextInput label="Loại phòng ban" withAsterisk {...form.getInputProps('type')} />
            <TextInput label="Hiệu lực từ" type="date" withAsterisk {...form.getInputProps('effectiveFrom')} />
            <TextInput label="Hiệu lực đến" type="date" {...form.getInputProps('effectiveTo')} />
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
        title="Tạm ngưng phòng ban?"
        message="Phòng ban sẽ được chuyển sang trạng thái tạm ngưng. Dữ liệu lịch sử không bị xóa."
        confirmLabel="Tạm ngưng"
        loading={inactiveMutation.isPending}
        onClose={() => setConfirmInactive(null)}
        onConfirm={() => {
          if (confirmInactive) {
            inactiveMutation.mutate(confirmInactive);
          }
        }}
      />

      <HrmCoreExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onCommitted={() => queryClient.invalidateQueries({ queryKey: ['departments'] })}
      />
    </>
  );
}
