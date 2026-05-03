import { useMemo, useState } from 'react';
import { Button, Drawer, Group, Select, SimpleGrid, Stack, Text, TextInput, Textarea, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { DomainExcelImportModal } from '../../features/import-export/DomainExcelImportModal';
import { downloadUnitsExport } from '../../features/import-export/excelFilesApi';
import { ImportExportToolbar } from '../../features/import-export/ImportExportToolbar';
import { useHrmCoreTemplateDownload } from '../../features/import-export/useHrmCoreTemplateDownload';
import { useBusinessSectorsSelect } from '../../features/organization/useBusinessSectors';
import {
  createUnit,
  generateUnitShortCode,
  isValidUnitCode,
  normalizeUnitCodeInput,
  updateUnit,
} from '../../features/organization/unitsApi';
import type { Unit } from '../../features/organization/organizationTypes';
import { useUnits } from '../../features/organization/useUnits';
import { ApiError } from '../../shared/api/api.types';
import { ConfirmActionModal } from '../../shared/components/ConfirmActionModal';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { TableActionsMenu } from '../../shared/components/TableActionsMenu';

type UnitFormValues = {
  code: string;
  sectorId: string;
  name: string;
  shortName: string;
  taxCode: string;
  address: string;
  note: string;
  status: string;
};

const statusOptions = [
  { value: 'ACTIVE', label: 'Äang hoáº¡t Ä‘á»™ng' },
  { value: 'INACTIVE', label: 'Táº¡m ngÆ°ng' },
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
  const [importOpen, setImportOpen] = useState(false);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const { data, isLoading, error, refetch } = useUnits(params);
  const sectorsQuery = useBusinessSectorsSelect();
  const templateDownload = useHrmCoreTemplateDownload('organization-units');

  const exportMutation = useMutation({
    mutationFn: () => downloadUnitsExport(params),
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'KhĂ´ng xuáº¥t Ä‘Æ°á»£c Excel',
        message: 'Vui lĂ²ng thá»­ láº¡i sau.',
      });
    },
  });

  const form = useForm<UnitFormValues>({
    initialValues: {
      code: '',
      sectorId: '',
      name: '',
      shortName: '',
      taxCode: '',
      address: '',
      note: '',
      status: 'ACTIVE',
    },
    validate: {
      code: (value) => {
        const code = normalizeUnitCodeInput(value);
        if (!code) {
          return 'MĂ£ Ä‘Æ¡n vá»‹ khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.';
        }
        return isValidUnitCode(code) ? null : 'MĂ£ Ä‘Æ¡n vá»‹ khĂ´ng Ä‘Ăºng Ä‘á»‹nh dáº¡ng.';
      },
      sectorId: (value) => (value ? null : 'Vui lĂ²ng chá»n lÄ©nh vá»±c.'),
      name: (value) => (value.trim() ? null : 'Vui lĂ²ng nháº­p tĂªn Ä‘Æ¡n vá»‹.'),
      shortName: (value) => (value.trim() ? null : 'Nháº­p KH Ä‘Æ¡n vá»‹.'),
      taxCode: (value) => (value.trim() ? null : 'Nháº­p mĂ£ sá»‘ thuáº¿.'),
    },
  });

  const sectorOptions = (sectorsQuery.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name} (${item.code})`,
  }));

  function applyApiErrors(error: unknown) {
    if (!(error instanceof ApiError)) {
      return 'Vui lĂ²ng kiá»ƒm tra dá»¯ liá»‡u vĂ  thá»­ láº¡i.';
    }

    error.errors.forEach((item) => {
      if (item.field && item.field in form.values) {
        form.setFieldError(item.field as keyof UnitFormValues, item.message);
      }
    });
    return error.errors[0]?.message ?? error.message;
  }

  function normalizeUnitPayload(values: UnitFormValues) {
    return {
      code: normalizeUnitCodeInput(values.code),
      sectorId: values.sectorId,
      name: values.name.trim(),
      shortName: values.shortName.trim(),
      taxCode: values.taxCode.trim(),
      address: values.address.trim() || undefined,
      note: values.note.trim() || undefined,
      status: values.status,
    };
  }

  const mutation = useMutation({
    mutationFn: async (values: UnitFormValues) => {
      const payload = normalizeUnitPayload(values);
      if (editing) {
        return updateUnit(editing.id, payload);
      }
      return createUnit(payload);
    },
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: editing ? 'ÄĂ£ cáº­p nháº­t Ä‘Æ¡n vá»‹' : 'ÄĂ£ táº¡o Ä‘Æ¡n vá»‹',
        message: 'Dá»¯ liá»‡u Ä‘Ă£ Ä‘Æ°á»£c lÆ°u.',
      });
      closeDrawer();
      await queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'KhĂ´ng lÆ°u Ä‘Æ°á»£c Ä‘Æ¡n vá»‹',
        message: applyApiErrors(error),
      });
    },
  });

  function openCreateDrawer() {
    setEditing(null);
    setCodeManuallyEdited(false);
    form.reset();
    setOpen(true);
  }

  function openEditDrawer(record: Unit) {
    setEditing(record);
    setCodeManuallyEdited(true);
    form.setValues({
      code: record.code,
      sectorId: record.sectorId ?? record.businessSectorId ?? record.sector?.id ?? '',
      name: record.name,
      shortName: record.shortName ?? '',
      taxCode: record.taxCode ?? '',
      address: record.address ?? '',
      note: record.note ?? '',
      status: record.status,
    });
    setOpen(true);
  }

  function closeDrawer() {
    setOpen(false);
    setEditing(null);
    setCodeManuallyEdited(false);
    form.reset();
  }

  function handleNameChange(value: string) {
    form.setFieldValue('name', value);
    if (!codeManuallyEdited) {
      form.setFieldValue('code', value.trim() ? generateUnitShortCode(value) : '');
    }
  }

  const inactiveMutation = useMutation({
    mutationFn: (record: Unit) =>
      updateUnit(record.id, {
        code: record.code,
        sectorId: record.sectorId ?? record.businessSectorId ?? record.sector?.id ?? '',
        name: record.name,
        shortName: record.shortName,
        taxCode: record.taxCode,
        address: record.address ?? undefined,
        note: record.note ?? undefined,
        status: 'INACTIVE',
      }),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'ÄĂ£ táº¡m ngÆ°ng Ä‘Æ¡n vá»‹',
        message: 'Tráº¡ng thĂ¡i Ä‘Æ¡n vá»‹ Ä‘Ă£ Ä‘Æ°á»£c cáº­p nháº­t.',
      });
      setConfirmInactive(null);
      await queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'KhĂ´ng táº¡m ngÆ°ng Ä‘Æ°á»£c Ä‘Æ¡n vá»‹',
        message: 'Vui lĂ²ng thá»­ láº¡i.',
      });
    },
  });

  const columns = useMemo<DataTableColumn<Unit>[]>(
    () => [
      { key: 'code', header: 'MĂ£', width: 120, render: (record) => <Text fw={600}>{record.code}</Text> },
      { key: 'name', header: 'TĂªn Ä‘Æ¡n vá»‹', render: (record) => <TruncatedCell value={record.name} /> },
      { key: 'sector', header: 'LÄ©nh vá»±c', render: (record) => <TruncatedCell value={record.businessSector?.name ?? record.sector?.name} /> },
      { key: 'shortName', header: 'KH Ä‘Æ¡n vá»‹', render: (record) => record.shortName || '-' },
      { key: 'taxCode', header: 'MĂ£ sá»‘ thuáº¿', render: (record) => <TruncatedCell value={record.taxCode} /> },
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
                onClick: () => openEditDrawer(record),
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
    [],
  );

  return (
    <>
      <PageHeader
        title="ÄÆ¡n vá»‹"
        subtitle="Quáº£n lĂ½ Ä‘Æ¡n vá»‹, lÄ©nh vá»±c, mĂ£ sá»‘ thuáº¿ vĂ  thĂ´ng tin danh má»¥c dĂ¹ng cho HRM."
        actions={
          <>
            <ImportExportToolbar
              onDownloadTemplate={templateDownload.downloadTemplate}
              onImport={() => setImportOpen(true)}
              onExport={() => exportMutation.mutateAsync()}
              isDownloadingTemplate={templateDownload.isDownloadingTemplate}
              isExporting={exportMutation.isPending}
            />
            <Button leftSection={<IconPlus size={18} />} onClick={openCreateDrawer}>
              Táº¡o Ä‘Æ¡n vá»‹
            </Button>
          </>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            placeholder="TĂ¬m mĂ£ hoáº·c tĂªn"
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
          emptyTitle="ChÆ°a cĂ³ Ä‘Æ¡n vá»‹"
          emptyDescription="KhĂ´ng cĂ³ Ä‘Æ¡n vá»‹ phĂ¹ há»£p vá»›i bá»™ lá»c hiá»‡n táº¡i."
        />
      </Stack>

      <Drawer opened={open} onClose={closeDrawer} title={editing ? 'Chá»‰nh sá»­a Ä‘Æ¡n vá»‹' : 'Táº¡o Ä‘Æ¡n vá»‹'} position="right" size="lg">
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput
              label="MĂ£ Ä‘Æ¡n vá»‹"
              withAsterisk
              value={form.values.code}
              error={form.errors.code}
              onChange={(event) => {
                setCodeManuallyEdited(true);
                form.setFieldValue('code', normalizeUnitCodeInput(event.currentTarget.value));
              }}
            />
            <TextInput
              label="TĂªn Ä‘Æ¡n vá»‹"
              withAsterisk
              value={form.values.name}
              error={form.errors.name}
              onChange={(event) => handleNameChange(event.currentTarget.value)}
            />
            <Select
              label="LÄ©nh vá»±c"
              withAsterisk
              searchable
              data={sectorOptions}
              disabled={sectorsQuery.isLoading}
              {...form.getInputProps('sectorId')}
            />
            <TextInput label="KH Ä‘Æ¡n vá»‹" withAsterisk {...form.getInputProps('shortName')} />
            <TextInput label="MĂ£ sá»‘ thuáº¿" withAsterisk {...form.getInputProps('taxCode')} />
            <TextInput label="Äá»‹a chá»‰" {...form.getInputProps('address')} />
            <Textarea label="Ghi chĂº" minRows={3} {...form.getInputProps('note')} />
            <Select label="Tráº¡ng thĂ¡i" data={statusOptions} withAsterisk {...form.getInputProps('status')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeDrawer}>
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
        title="Import Excel ÄÆ¡n vá»‹"
        module="organization-units"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['units'] })}
      />

      <ConfirmActionModal
        opened={Boolean(confirmInactive)}
        title="Táº¡m ngÆ°ng Ä‘Æ¡n vá»‹?"
        message="ÄÆ¡n vá»‹ sáº½ Ä‘Æ°á»£c chuyá»ƒn sang tráº¡ng thĂ¡i táº¡m ngÆ°ng. Dá»¯ liá»‡u lá»‹ch sá»­ khĂ´ng bá»‹ xĂ³a."
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
