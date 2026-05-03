import { useMemo, useState } from 'react';
import { Button, Drawer, Group, Select, SimpleGrid, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { DomainExcelImportModal } from '../../features/import-export/DomainExcelImportModal';
import { downloadDepartmentsExport } from '../../features/import-export/excelFilesApi';
import { ImportExportToolbar } from '../../features/import-export/ImportExportToolbar';
import { useHrmCoreTemplateDownload } from '../../features/import-export/useHrmCoreTemplateDownload';
import { createDepartment, updateDepartment } from '../../features/organization/departmentsApi';
import type { Department } from '../../features/organization/organizationTypes';
import { useDepartments } from '../../features/organization/useDepartments';
import { useUnitsSelect } from '../../features/organization/useUnits';
import { ConfirmActionModal } from '../../shared/components/ConfirmActionModal';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { TableActionsMenu } from '../../shared/components/TableActionsMenu';

type DepartmentFormValues = {
  code: string;
  unitId: string;
  name: string;
  note: string;
  status: string;
};

const statusOptions = [
  { value: 'ACTIVE', label: 'Äang hoáº¡t Ä‘á»™ng' },
  { value: 'INACTIVE', label: 'Táº¡m ngÆ°ng' },
];

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
  const unitsSelect = useUnitsSelect();
  const templateDownload = useHrmCoreTemplateDownload('departments');

  const exportMutation = useMutation({
    mutationFn: () => downloadDepartmentsExport(params),
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'KhĂ´ng xuáº¥t Ä‘Æ°á»£c Excel',
        message: 'Vui lĂ²ng thá»­ láº¡i sau.',
      });
    },
  });

  const form = useForm<DepartmentFormValues>({
    initialValues: {
      code: '',
      unitId: '',
      name: '',
      note: '',
      status: 'ACTIVE',
    },
    validate: {
      code: (value) => (value.trim() ? null : 'Nháº­p mĂ£ phĂ²ng ban.'),
      unitId: (value) => (value ? null : 'Chá»n Ä‘Æ¡n vá»‹.'),
      name: (value) => (value.trim() ? null : 'Nháº­p tĂªn phĂ²ng ban.'),
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: DepartmentFormValues) => {
      const payload = {
        code: values.code.trim(),
        unitId: values.unitId,
        name: values.name.trim(),
        note: values.note.trim() || undefined,
        status: values.status,
      };

      if (editing) {
        return updateDepartment(editing.id, payload);
      }
      return createDepartment(payload);
    },
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: editing ? 'ÄĂ£ cáº­p nháº­t phĂ²ng ban' : 'ÄĂ£ táº¡o phĂ²ng ban',
        message: 'Cáº¥u trĂºc tá»• chá»©c Ä‘Ă£ Ä‘Æ°á»£c cáº­p nháº­t.',
      });
      setOpen(false);
      setEditing(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'KhĂ´ng lÆ°u Ä‘Æ°á»£c phĂ²ng ban',
        message: 'Vui lĂ²ng kiá»ƒm tra dá»¯ liá»‡u vĂ  thá»­ láº¡i.',
      });
    },
  });

  const inactiveMutation = useMutation({
    mutationFn: (record: Department) =>
      updateDepartment(record.id, {
        code: record.code,
        unitId: record.unitId,
        name: record.name,
        note: record.note ?? undefined,
        status: 'INACTIVE',
      }),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'ÄĂ£ táº¡m ngÆ°ng phĂ²ng ban',
        message: 'Tráº¡ng thĂ¡i phĂ²ng ban Ä‘Ă£ Ä‘Æ°á»£c cáº­p nháº­t.',
      });
      setConfirmInactive(null);
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'KhĂ´ng táº¡m ngÆ°ng Ä‘Æ°á»£c phĂ²ng ban',
        message: 'Vui lĂ²ng thá»­ láº¡i.',
      });
    },
  });

  const unitOptions = (unitsSelect.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name} (${item.code})`,
  }));

  const columns = useMemo<DataTableColumn<Department>[]>(
    () => [
      { key: 'code', header: 'MĂ£', width: 120, render: (record) => <Text fw={600}>{record.code}</Text> },
      { key: 'name', header: 'TĂªn phĂ²ng ban', render: (record) => record.name },
      { key: 'unit', header: 'ÄÆ¡n vá»‹', render: (record) => record.unit?.name ?? '-' },
      { key: 'status', header: 'Tráº¡ng thĂ¡i', width: 140, render: (record) => <StatusTag status={record.status} /> },
      {
        key: 'actions',
        header: '',
        width: 70,
        align: 'right',
        render: (record) => (
          <TableActionsMenu
            actions={[
              {
                label: 'Chá»‰nh sá»­a',
                icon: <IconEdit size={16} />,
                onClick: () => {
                  setEditing(record);
                  form.setValues({
                    code: record.code,
                    unitId: record.unitId,
                    name: record.name,
                    note: record.note ?? '',
                    status: record.status,
                  });
                  setOpen(true);
                },
              },
              {
                label: 'Táº¡m ngÆ°ng',
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
        title="PhĂ²ng ban"
        subtitle="Quáº£n lĂ½ phĂ²ng ban theo Ä‘Æ¡n vá»‹, tráº¡ng thĂ¡i vĂ  import Excel ngay trĂªn mĂ n danh má»¥c."
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
              Táº¡o phĂ²ng ban
            </Button>
          </>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <TextInput
            placeholder="TĂ¬m mĂ£ hoáº·c tĂªn"
            leftSection={<IconSearch size={17} />}
            value={params.search}
            onChange={(event) =>
              setParams((current) => ({ ...current, search: event.currentTarget.value, page: 1 }))
            }
          />
          <Select
            placeholder="ÄÆ¡n vá»‹"
            clearable
            data={unitOptions}
            value={params.unitId ?? null}
            onChange={(value) =>
              setParams((current) => ({ ...current, unitId: value ?? undefined, page: 1 }))
            }
          />
          <Select
            placeholder="Tráº¡ng thĂ¡i"
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
          emptyTitle="ChÆ°a cĂ³ phĂ²ng ban"
          emptyDescription="KhĂ´ng cĂ³ phĂ²ng ban phĂ¹ há»£p vá»›i bá»™ lá»c hiá»‡n táº¡i."
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          form.reset();
        }}
        title={editing ? 'Chá»‰nh sá»­a phĂ²ng ban' : 'Táº¡o phĂ²ng ban'}
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput label="MĂ£ phĂ²ng ban" withAsterisk {...form.getInputProps('code')} />
            <Select label="ÄÆ¡n vá»‹" data={unitOptions} withAsterisk searchable {...form.getInputProps('unitId')} />
            <TextInput label="TĂªn phĂ²ng ban" withAsterisk {...form.getInputProps('name')} />
            <Textarea label="Ghi chĂº" minRows={3} {...form.getInputProps('note')} />
            <Select label="Tráº¡ng thĂ¡i" data={statusOptions} withAsterisk {...form.getInputProps('status')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setOpen(false)}>
                Há»§y
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                LÆ°u
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <DomainExcelImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Excel PhĂ²ng ban"
        module="departments"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['departments'] })}
      />

      <ConfirmActionModal
        opened={Boolean(confirmInactive)}
        title="Táº¡m ngÆ°ng phĂ²ng ban?"
        message="PhĂ²ng ban sáº½ Ä‘Æ°á»£c chuyá»ƒn sang tráº¡ng thĂ¡i táº¡m ngÆ°ng. Dá»¯ liá»‡u lá»‹ch sá»­ khĂ´ng bá»‹ xĂ³a."
        confirmLabel="Táº¡m ngÆ°ng"
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
