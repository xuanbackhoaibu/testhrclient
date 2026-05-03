import { useMemo, useState } from 'react';
import { Button, Drawer, Group, Select, SimpleGrid, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconSearch } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { useAuth } from '../../features/auth/useAuth';
import { DomainExcelImportModal } from '../../features/import-export/DomainExcelImportModal';
import { downloadPositionsExport } from '../../features/import-export/excelFilesApi';
import { ImportExportToolbar } from '../../features/import-export/ImportExportToolbar';
import { useHrmCoreTemplateDownload } from '../../features/import-export/useHrmCoreTemplateDownload';
import { createPosition, updatePosition } from '../../features/organization/positionsApi';
import type { Position } from '../../features/organization/organizationTypes';
import { usePositions } from '../../features/organization/usePositions';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { TableActionsMenu } from '../../shared/components/TableActionsMenu';

type PositionFormValues = Omit<Position, 'id'>;

const statusOptions = [
  { value: 'ACTIVE', label: 'Äang hoáº¡t Ä‘á»™ng' },
  { value: 'INACTIVE', label: 'Táº¡m ngÆ°ng' },
];

export function PositionsPage() {
  const { can } = useAuth();
  const canWritePositions = can(HR_PERMISSIONS.WRITE);
  const canImportPositions = can(HR_PERMISSIONS.IMPORT);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Position | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    search: '',
    status: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = usePositions(params);
  const templateDownload = useHrmCoreTemplateDownload('positions');

  const exportMutation = useMutation({
    mutationFn: () => downloadPositionsExport(params),
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'KhĂ´ng xuáº¥t Ä‘Æ°á»£c Excel',
        message: 'Vui lĂ²ng thá»­ láº¡i sau.',
      });
    },
  });

  const form = useForm<PositionFormValues>({
    initialValues: {
      code: '',
      name: '',
      jobFunction: '',
      grade: '',
      note: '',
      status: 'ACTIVE',
    },
    validate: {
      code: (value) => (value.trim() ? null : 'Nháº­p mĂ£ chá»©c vá»¥.'),
      name: (value) => (value.trim() ? null : 'Nháº­p tĂªn chá»©c vá»¥.'),
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: PositionFormValues) => {
      const payload = {
        code: values.code.trim(),
        name: values.name.trim(),
        jobFunction: values.jobFunction.trim() || undefined,
        grade: values.grade.trim() || undefined,
        note: values.note?.trim() || undefined,
        status: values.status,
      };
      if (editing) {
        return updatePosition(editing.id, payload);
      }
      return createPosition({
        code: payload.code,
        name: payload.name,
        jobFunction: payload.jobFunction ?? '',
        grade: payload.grade ?? '',
        note: payload.note,
        status: payload.status,
      });
    },
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: editing ? 'ÄĂ£ cáº­p nháº­t chá»©c vá»¥' : 'ÄĂ£ táº¡o chá»©c vá»¥',
        message: 'Danh má»¥c chá»©c vá»¥ Ä‘Ă£ Ä‘Æ°á»£c cáº­p nháº­t.',
      });
      setOpen(false);
      setEditing(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'KhĂ´ng lÆ°u Ä‘Æ°á»£c chá»©c vá»¥',
        message: 'Vui lĂ²ng kiá»ƒm tra dá»¯ liá»‡u vĂ  thá»­ láº¡i.',
      });
    },
  });

  const columns = useMemo<DataTableColumn<Position>[]>(
    () => [
      { key: 'code', header: 'MĂ£', width: 120, render: (record) => <Text fw={600}>{record.code}</Text> },
      { key: 'name', header: 'TĂªn chá»©c vá»¥', render: (record) => record.name },
      { key: 'jobFunction', header: 'NhĂ³m cĂ´ng viá»‡c', render: (record) => record.jobFunction || '-' },
      { key: 'grade', header: 'Grade', width: 110, render: (record) => record.grade || '-' },
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
                    name: record.name,
                    jobFunction: record.jobFunction ?? '',
                    grade: record.grade ?? '',
                    note: record.note ?? '',
                    status: record.status,
                  });
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
        title="Chá»©c vá»¥"
        subtitle="Danh má»¥c chá»©c vá»¥, nhĂ³m cĂ´ng viá»‡c, grade vĂ  import Excel ngay trong modal."
        actions={
          <>
            <ImportExportToolbar
              onDownloadTemplate={templateDownload.downloadTemplate}
              onImport={canImportPositions ? () => setImportOpen(true) : undefined}
              onExport={() => exportMutation.mutateAsync()}
              isDownloadingTemplate={templateDownload.isDownloadingTemplate}
              isExporting={exportMutation.isPending}
              canImport={canImportPositions}
            />
            {canWritePositions ? (
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => {
                  setEditing(null);
                  form.reset();
                  setOpen(true);
                }}
              >
                Táº¡o chá»©c vá»¥
              </Button>
            ) : null}
          </>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            placeholder="TĂ¬m mĂ£, tĂªn, nhĂ³m cĂ´ng viá»‡c"
            leftSection={<IconSearch size={17} />}
            value={params.search}
            onChange={(event) =>
              setParams((current) => ({ ...current, search: event.currentTarget.value, page: 1 }))
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
          emptyTitle="ChÆ°a cĂ³ chá»©c vá»¥"
          emptyDescription="KhĂ´ng cĂ³ chá»©c vá»¥ phĂ¹ há»£p vá»›i bá»™ lá»c hiá»‡n táº¡i."
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          form.reset();
        }}
        title={editing ? 'Chá»‰nh sá»­a chá»©c vá»¥' : 'Táº¡o chá»©c vá»¥'}
        position="right"
      >
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput label="MĂ£ chá»©c vá»¥" withAsterisk {...form.getInputProps('code')} />
            <TextInput label="TĂªn chá»©c vá»¥" withAsterisk {...form.getInputProps('name')} />
            <TextInput label="NhĂ³m cĂ´ng viá»‡c" {...form.getInputProps('jobFunction')} />
            <TextInput label="Grade" {...form.getInputProps('grade')} />
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
        title="Import Excel Chá»©c vá»¥"
        module="positions"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['positions'] })}
      />
    </>
  );
}
