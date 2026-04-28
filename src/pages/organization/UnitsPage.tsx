import { useMemo, useState } from 'react';
import { Button, Drawer, Group, Select, SimpleGrid, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { downloadUnitsExport } from '../../features/import-export/excelFilesApi';
import { ImportExportToolbar } from '../../features/import-export/ImportExportToolbar';
import { useHrmCoreTemplateDownload } from '../../features/import-export/useHrmCoreTemplateDownload';
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
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const { data, isLoading, error, refetch } = useUnits(params);
  const templateDownload = useHrmCoreTemplateDownload('organization-units');

  const exportMutation = useMutation({
    mutationFn: () => downloadUnitsExport(params),
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Không xuất được Excel',
        message: 'Vui lòng thử lại sau.',
      });
    },
  });

  const form = useForm<UnitFormValues>({
    initialValues: {
      code: '',
      name: '',
      shortName: '',
      taxCode: '',
      status: 'ACTIVE',
    },
    validate: {
      code: (value) => {
        const code = normalizeUnitCodeInput(value);
        if (!code) {
          return 'Mã viết tắt không được để trống.';
        }
        return isValidUnitCode(code) ? null : 'Mã viết tắt không đúng định dạng.';
      },
      name: (value) => (value.trim() ? null : 'Vui lòng nhập tên đơn vị.'),
      shortName: (value) => (value.trim() ? null : 'Nhập tên viết tắt.'),
      taxCode: (value) => (value.trim() ? null : 'Nhập mã số thuế.'),
    },
  });

  function applyApiErrors(error: unknown) {
    if (!(error instanceof ApiError)) {
      return 'Vui lòng kiểm tra dữ liệu và thử lại.';
    }
    error.errors.forEach((item) => {
      if (item.field && ['code', 'name', 'shortName', 'taxCode', 'status'].includes(item.field)) {
        form.setFieldError(item.field as keyof UnitFormValues, item.message);
      }
    });
    return error.errors[0]?.message ?? error.message;
  }

  function normalizeUnitPayload(values: UnitFormValues): UnitFormValues {
    return {
      ...values,
      code: normalizeUnitCodeInput(values.code),
      name: values.name.trim(),
      shortName: values.shortName?.trim() ?? '',
      taxCode: values.taxCode?.trim() ?? '',
    };
  }

  const mutation = useMutation({
    mutationFn: async (values: Partial<UnitFormValues>) => {
      if (editing) {
        return updateUnit(editing.id, values);
      }
      const payload = { ...values };
      if (!codeManuallyEdited) {
        delete payload.code;
      }
      return createUnit(payload as Partial<UnitFormValues> & { name: string });
    },
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: editing ? 'Đã cập nhật đơn vị' : 'Đã tạo đơn vị',
        message: 'Dữ liệu đã được lưu.',
      });
      setOpen(false);
      setEditing(null);
      setConfirmInactive(null);
      setCodeManuallyEdited(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Không lưu được đơn vị',
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
    setCodeManuallyEdited(false);
    form.setValues(record);
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

  function handleCodeChange(value: string) {
    setCodeManuallyEdited(true);
    form.setFieldValue('code', normalizeUnitCodeInput(value));
  }

  function submitUnit(values: UnitFormValues) {
    mutation.mutate(normalizeUnitPayload(values));
  }

  const inactiveMutation = useMutation({
    mutationFn: (record: Unit) => updateUnit(record.id, { ...record, status: 'INACTIVE' }),
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Đã tạm ngưng đơn vị',
        message: 'Trạng thái đơn vị đã được cập nhật.',
      });
      setConfirmInactive(null);
      await queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Không tạm ngưng được đơn vị',
        message: 'Vui lòng thử lại.',
      });
    },
  });

  const columns = useMemo<DataTableColumn<Unit>[]>(
    () => [
      { key: 'code', header: 'Mã', width: 120, render: (record) => <Text fw={600}>{record.code}</Text> },
      { key: 'name', header: 'Tên đơn vị', render: (record) => <TruncatedCell value={record.name} /> },
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
                onClick: () => openEditDrawer(record),
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
        title="Đơn vị"
        subtitle="Quản lý đơn vị dùng trong hồ sơ nhân sự và phân quyền dữ liệu."
        actions={
          <>
            <ImportExportToolbar
              onDownloadTemplate={templateDownload.downloadTemplate}
              onExport={() => exportMutation.mutateAsync()}
              isDownloadingTemplate={templateDownload.isDownloadingTemplate}
              isExporting={exportMutation.isPending}
            />
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={openCreateDrawer}
            >
              Tạo đơn vị
            </Button>
          </>
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
          data={data?.items ?? []}
          columns={columns}
          rowKey={(record) => record.id}
          meta={data?.pagination}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          onPageChange={(page, pageSize) => setParams((current) => ({ ...current, page, pageSize }))}
          emptyTitle="Chưa có đơn vị"
          emptyDescription="Không có đơn vị phù hợp với bộ lọc hiện tại."
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={closeDrawer}
        title={editing ? 'Chỉnh sửa đơn vị' : 'Tạo đơn vị'}
        position="right"
      >
        <form onSubmit={form.onSubmit(submitUnit)}>
          <Stack gap="sm">
            <TextInput
              label="Mã viết tắt"
              withAsterisk
              value={form.values.code}
              error={form.errors.code}
              onChange={(event) => handleCodeChange(event.currentTarget.value)}
            />
            <TextInput
              label="Tên đơn vị"
              withAsterisk
              value={form.values.name}
              error={form.errors.name}
              onChange={(event) => handleNameChange(event.currentTarget.value)}
            />
            <TextInput label="Tên viết tắt" withAsterisk {...form.getInputProps('shortName')} />
            <TextInput label="Mã số thuế" withAsterisk {...form.getInputProps('taxCode')} />
            <Select label="Trạng thái" data={statusOptions} withAsterisk {...form.getInputProps('status')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeDrawer}>
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
        title="Tạm ngưng đơn vị?"
        message="Đơn vị sẽ được chuyển sang trạng thái tạm ngưng. Dữ liệu lịch sử không bị xóa."
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
