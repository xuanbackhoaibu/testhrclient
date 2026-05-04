import { useMemo, useState } from 'react';
import {
  Button,
  Drawer,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { useAuth } from '../../features/auth/useAuth';
import {
  createBusinessSector,
  deactivateBusinessSector,
  normalizeBusinessSectorCode,
  updateBusinessSector,
} from '../../features/organization/businessSectorsApi';
import type { BusinessSector } from '../../features/organization/organizationTypes';
import { useBusinessSectors } from '../../features/organization/useBusinessSectors';
import { ConfirmActionModal } from '../../shared/components/ConfirmActionModal';
import {
  DataTable,
  type DataTableColumn,
} from '../../shared/components/DataTable';
import { debugPermissionCheck } from '../../shared/debug/hrmDebug';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { TableActionsMenu } from '../../shared/components/TableActionsMenu';

type BusinessSectorFormValues = {
  code: string;
  name: string;
  note: string;
  status: string;
};

const statusOptions = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'INACTIVE', label: 'Tạm ngừng' },
];

export function BusinessSectorsPage() {
  const { can, permissions, roles } = useAuth();
  const canCreateBusinessSector = can(HR_PERMISSIONS.BUSINESS_SECTOR_CREATE);
  const canEditBusinessSector = can(HR_PERMISSIONS.BUSINESS_SECTOR_UPDATE);
  const canDeleteBusinessSector = can(HR_PERMISSIONS.BUSINESS_SECTOR_DELETE);
  const queryClient = useQueryClient();
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    search: '',
    status: undefined as string | undefined,
  });
  const [editing, setEditing] = useState<BusinessSector | null>(null);
  const [confirmInactive, setConfirmInactive] = useState<BusinessSector | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const { data, isLoading, error, refetch } = useBusinessSectors(params);

  const form = useForm<BusinessSectorFormValues>({
    initialValues: {
      code: '',
      name: '',
      note: '',
      status: 'ACTIVE',
    },
    validate: {
      code: (value) =>
        value.trim() ? null : 'Vui lòng nhập mã lĩnh vực.',
      name: (value) =>
        value.trim() ? null : 'Vui lòng nhập tên lĩnh vực.',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: BusinessSectorFormValues) => {
      const requiredPermission = editing
        ? HR_PERMISSIONS.BUSINESS_SECTOR_UPDATE
        : HR_PERMISSIONS.BUSINESS_SECTOR_CREATE;
      const allowed = editing
        ? canEditBusinessSector
        : canCreateBusinessSector;
      debugPermissionCheck({
        action: editing ? 'business-sector.update' : 'business-sector.create',
        required: requiredPermission,
        permissions,
        roles,
        allowed,
      });
      if (!allowed) {
        throw new Error('Ban khong co quyen luu linh vuc.');
      }

      const payload = {
        code: normalizeBusinessSectorCode(values.code),
        name: values.name.trim(),
        note: values.note.trim() || undefined,
        status: values.status,
      };
      if (editing) {
        return updateBusinessSector(editing.id, payload);
      }
      return createBusinessSector(payload);
    },
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: editing ? 'Đã cập nhật lĩnh vực' : 'Đã tạo lĩnh vực',
        message: 'Danh mục lĩnh vực đã được lưu.',
      });
      setOpen(false);
      setEditing(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['business-sectors'] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Vui lòng kiểm tra dữ liệu và thử lại.';
      notifications.show({
        color: 'red',
        title: 'Không lưu được lĩnh vực',
        message,
      });
    },
  });

  const inactiveMutation = useMutation({
    mutationFn: (record: BusinessSector) => {
      debugPermissionCheck({
        action: 'business-sector.delete',
        required: HR_PERMISSIONS.BUSINESS_SECTOR_DELETE,
        permissions,
        roles,
        allowed: canDeleteBusinessSector,
      });
      if (!canDeleteBusinessSector) {
        throw new Error('Ban khong co quyen tam ngung linh vuc.');
      }

      return deactivateBusinessSector(record.id);
    },
    onSuccess: async () => {
      notifications.show({
        color: 'green',
        title: 'Đã tạm ngừng lĩnh vực',
        message: 'Trạng thái lĩnh vực đã được cập nhật.',
      });
      setConfirmInactive(null);
      await queryClient.invalidateQueries({ queryKey: ['business-sectors'] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Vui lòng thử lại.';
      notifications.show({
        color: 'red',
        title: 'Không tạm ngừng được lĩnh vực',
        message,
      });
    },
  });

  const columns = useMemo<DataTableColumn<BusinessSector>[]>(
    () => [
      {
        key: 'code',
        header: 'Mã',
        width: 140,
        render: (record) => <Text fw={600}>{record.code}</Text>,
      },
      {
        key: 'name',
        header: 'Tên lĩnh vực',
        render: (record) => record.name,
      },
      {
        key: 'note',
        header: 'Ghi chú',
        render: (record) => record.note || '-',
      },
      {
        key: 'status',
        header: 'Trạng thái',
        width: 140,
        render: (record) => <StatusTag status={record.status} />,
      },
      {
        key: 'actions',
        header: '',
        width: 108,
        align: 'right',
        render: (record) => (
          <TableActionsMenu
            actions={
              canEditBusinessSector || canDeleteBusinessSector
                ? [
                    {
                      label: 'Chỉnh sửa',
                      icon: <IconEdit size={16} />,
                      disabled: !canEditBusinessSector,
                      onClick: () => {
                        debugPermissionCheck({
                          action: 'business-sector.update',
                          required: HR_PERMISSIONS.BUSINESS_SECTOR_UPDATE,
                          permissions,
                          roles,
                          allowed: canEditBusinessSector,
                        });
                        if (!canEditBusinessSector) {
                          return;
                        }
                        setEditing(record);
                        form.setValues({
                          code: record.code,
                          name: record.name,
                          note: record.note ?? '',
                          status: record.status,
                        });
                        setOpen(true);
                      },
                    },
                    {
                      label: 'Tạm ngừng',
                      icon: <IconX size={16} />,
                      color: 'red' as const,
                      disabled:
                        record.status === 'INACTIVE' || !canDeleteBusinessSector,
                      onClick: () => {
                        debugPermissionCheck({
                          action: 'business-sector.delete',
                          required: HR_PERMISSIONS.BUSINESS_SECTOR_DELETE,
                          permissions,
                          roles,
                          allowed: canDeleteBusinessSector,
                        });
                        if (!canDeleteBusinessSector) {
                          return;
                        }
                        setConfirmInactive(record);
                      },
                    },
                  ]
                : []
            }
          />
        ),
      },
    ],
    [canDeleteBusinessSector, canEditBusinessSector, form, permissions, roles],
  );

  return (
    <>
      <PageHeader
        title="Lĩnh vực"
        subtitle="Danh mục lĩnh vực dùng cho đơn vị và import Excel. Cột linh_vuc trong file import phải khớp mã lĩnh vực tại đây."
        actions={
          canCreateBusinessSector ? (
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => {
                debugPermissionCheck({
                  action: 'business-sector.create',
                  required: HR_PERMISSIONS.BUSINESS_SECTOR_CREATE,
                  permissions,
                  roles,
                  allowed: canCreateBusinessSector,
                });
                setEditing(null);
                form.reset();
                setOpen(true);
              }}
            >
              Tạo lĩnh vực
            </Button>
          ) : null
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            placeholder="Tìm mã hoặc tên lĩnh vực"
            leftSection={<IconSearch size={17} />}
            value={params.search}
            onChange={(event) =>
              setParams((current) => ({
                ...current,
                search: event.currentTarget.value,
                page: 1,
              }))
            }
          />
          <Select
            placeholder="Trạng thái"
            clearable
            data={statusOptions}
            value={params.status ?? null}
            onChange={(value) =>
              setParams((current) => ({
                ...current,
                status: value ?? undefined,
                page: 1,
              }))
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
          onPageChange={(page, pageSize) =>
            setParams((current) => ({ ...current, page, pageSize }))
          }
          emptyTitle="Chưa có lĩnh vực"
          emptyDescription="Tạo danh mục lĩnh vực trước khi import hoặc gán đơn vị."
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          form.reset();
        }}
        title={editing ? 'Chỉnh sửa lĩnh vực' : 'Tạo lĩnh vực'}
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput
              label="Mã lĩnh vực"
              withAsterisk
              value={form.values.code}
              error={form.errors.code}
              onChange={(event) =>
                form.setFieldValue(
                  'code',
                  normalizeBusinessSectorCode(event.currentTarget.value),
                )
              }
            />
            <TextInput
              label="Tên lĩnh vực"
              withAsterisk
              {...form.getInputProps('name')}
            />
            <Textarea
              label="Ghi chú"
              minRows={3}
              {...form.getInputProps('note')}
            />
            <Select
              label="Trạng thái"
              data={statusOptions}
              withAsterisk
              {...form.getInputProps('status')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                  form.reset();
                }}
              >
                Hủy
              </Button>
              <Button type="submit" loading={mutation.isPending} disabled={editing ? !canEditBusinessSector : !canCreateBusinessSector}>
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <ConfirmActionModal
        opened={Boolean(confirmInactive)}
        title="Tạm ngừng lĩnh vực?"
        message="Lĩnh vực sẽ được chuyển sang trạng thái tạm ngừng. Nếu vẫn còn đơn vị đang sử dụng, backend sẽ từ chối thao tác này."
        confirmLabel="Tạm ngừng"
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
