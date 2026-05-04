import { useMemo, useState } from "react";
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconPlus, IconSearch, IconX } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import { DomainExcelImportModal } from "../../features/import-export/DomainExcelImportModal";
import { downloadDepartmentsExport } from "../../features/import-export/excelFilesApi";
import { ImportExportToolbar } from "../../features/import-export/ImportExportToolbar";
import { useHrmCoreTemplateDownload } from "../../features/import-export/useHrmCoreTemplateDownload";
import {
  createDepartment,
  updateDepartment,
} from "../../features/organization/departmentsApi";
import type { Department } from "../../features/organization/organizationTypes";
import { useDepartments } from "../../features/organization/useDepartments";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { ConfirmActionModal } from "../../shared/components/ConfirmActionModal";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { debugPermissionCheck } from "../../shared/debug/hrmDebug";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { TableActionsMenu } from "../../shared/components/TableActionsMenu";

type DepartmentFormValues = {
  code: string;
  unitId: string;
  name: string;
  note: string;
  status: string;
};

const statusOptions = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Tạm ngưng" },
];

export function DepartmentsPage() {
  const { can, permissions, roles } = useAuth();
  const canCreateDepartment = can(HR_PERMISSIONS.DEPARTMENT_CREATE);
  const canEditDepartment = can(HR_PERMISSIONS.DEPARTMENT_UPDATE);
  const canImportDepartments = can(HR_PERMISSIONS.DEPARTMENT_CREATE);
  const queryClient = useQueryClient();
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    unitId: undefined as string | undefined,
    status: undefined as string | undefined,
  });
  const [editing, setEditing] = useState<Department | null>(null);
  const [confirmInactive, setConfirmInactive] = useState<Department | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading, error, refetch } = useDepartments(params);
  const unitsSelect = useUnitsSelect();
  const templateDownload = useHrmCoreTemplateDownload("departments");

  const exportMutation = useMutation({
    mutationFn: () => downloadDepartmentsExport(params),
    onError: () => {
      notifications.show({
        color: "red",
        title: "Không xuất được Excel",
        message: "Vui lòng thử lại sau.",
      });
    },
  });

  const form = useForm<DepartmentFormValues>({
    initialValues: {
      code: "",
      unitId: "",
      name: "",
      note: "",
      status: "ACTIVE",
    },
    validate: {
      code: (value) => (value.trim() ? null : "Nhập mã phòng ban."),
      unitId: (value) => (value ? null : "Chọn đơn vị."),
      name: (value) => (value.trim() ? null : "Nhập tên phòng ban."),
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: DepartmentFormValues) => {
      const requiredPermission = editing
        ? HR_PERMISSIONS.DEPARTMENT_UPDATE
        : HR_PERMISSIONS.DEPARTMENT_CREATE;
      const allowed = editing ? canEditDepartment : canCreateDepartment;
      debugPermissionCheck({
        action: editing ? "department.update" : "department.create",
        required: requiredPermission,
        permissions,
        roles,
        allowed,
      });
      if (!allowed) {
        throw new Error("Ban khong co quyen luu phong ban.");
      }

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
        color: "green",
        title: editing ? "Đã cập nhật phòng ban" : "Đã tạo phòng ban",
        message: "Cấu trúc tổ chức đã được cập nhật.",
      });
      setOpen(false);
      setEditing(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: () => {
      notifications.show({
        color: "red",
        title: "Không lưu được phòng ban",
        message: "Vui lòng kiểm tra dữ liệu và thử lại.",
      });
    },
  });

  const inactiveMutation = useMutation({
    mutationFn: (record: Department) => {
      debugPermissionCheck({
        action: "department.update",
        required: HR_PERMISSIONS.DEPARTMENT_UPDATE,
        permissions,
        roles,
        allowed: canEditDepartment,
      });
      if (!canEditDepartment) {
        throw new Error("Ban khong co quyen tam ngung phong ban.");
      }

      return updateDepartment(record.id, {
        code: record.code,
        unitId: record.unitId,
        name: record.name,
        note: record.note ?? undefined,
        status: "INACTIVE",
      });
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        title: "Đã tạm ngưng phòng ban",
        message: "Trạng thái phòng ban đã được cập nhật.",
      });
      setConfirmInactive(null);
      await queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: () => {
      notifications.show({
        color: "red",
        title: "Không tạm ngưng được phòng ban",
        message: "Vui lòng thử lại.",
      });
    },
  });

  const unitOptions = (unitsSelect.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name} (${item.code})`,
  }));

  const columns = useMemo<DataTableColumn<Department>[]>(
    () => [
      {
        key: "code",
        header: "Mã",
        width: 120,
        render: (record) => <Text fw={600}>{record.code}</Text>,
      },
      { key: "name", header: "Tên phòng ban", render: (record) => record.name },
      {
        key: "unit",
        header: "Đơn vị",
        render: (record) => record.unit?.name ?? "-",
      },
      {
        key: "status",
        header: "Trạng thái",
        width: 140,
        render: (record) => <StatusTag status={record.status} />,
      },
      {
        key: "actions",
        header: "",
        width: 108,
        align: "right",
        render: (record) => (
          <TableActionsMenu
            actions={[
              {
                label: "Chỉnh sửa",
                icon: <IconEdit size={16} />,
                disabled: !canEditDepartment,
                onClick: () => {
                  debugPermissionCheck({
                    action: "department.update",
                    required: HR_PERMISSIONS.DEPARTMENT_UPDATE,
                    permissions,
                    roles,
                    allowed: canEditDepartment,
                  });
                  if (!canEditDepartment) {
                    return;
                  }
                  setEditing(record);
                  form.setValues({
                    code: record.code,
                    unitId: record.unitId,
                    name: record.name,
                    note: record.note ?? "",
                    status: record.status,
                  });
                  setOpen(true);
                },
              },
              {
                label: "Tạm ngưng",
                icon: <IconX size={16} />,
                color: "red",
                disabled: record.status === "INACTIVE" || !canEditDepartment,
                onClick: () => {
                  debugPermissionCheck({
                    action: "department.update",
                    required: HR_PERMISSIONS.DEPARTMENT_UPDATE,
                    permissions,
                    roles,
                    allowed: canEditDepartment,
                  });
                  if (!canEditDepartment) {
                    return;
                  }
                  setConfirmInactive(record);
                },
              },
            ]}
          />
        ),
      },
    ],
    [canEditDepartment, form, permissions, roles],
  );

  return (
    <>
      <PageHeader
        title="Phòng ban"
        subtitle="Quản lý phòng ban theo đơn vị, trạng thái và import Excel ngay trên màn danh mục."
        actions={
          <>
            <ImportExportToolbar
              onDownloadTemplate={templateDownload.downloadTemplate}
              onImport={
                canImportDepartments ? () => setImportOpen(true) : undefined
              }
              onExport={() => exportMutation.mutateAsync()}
              isDownloadingTemplate={templateDownload.isDownloadingTemplate}
              isExporting={exportMutation.isPending}
              canImport={canImportDepartments}
            />
            {canCreateDepartment ? (
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => {
                  debugPermissionCheck({
                    action: "department.create",
                    required: HR_PERMISSIONS.DEPARTMENT_CREATE,
                    permissions,
                    roles,
                    allowed: canCreateDepartment,
                  });
                  if (!canCreateDepartment) {
                    return;
                  }
                  setEditing(null);
                  form.reset();
                  setOpen(true);
                }}
              >
                Tạo phòng ban
              </Button>
            ) : null}
          </>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <TextInput
            placeholder="Tìm mã hoặc tên"
            leftSection={<IconSearch size={17} />}
            value={params.search}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setParams((current) => ({
                ...current,
                search: value,
                page: 1,
              }));
            }}
          />
          <Select
            placeholder="Đơn vị"
            clearable
            data={unitOptions}
            value={params.unitId ?? null}
            onChange={(value) =>
              setParams((current) => ({
                ...current,
                unitId: value ?? undefined,
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
          emptyTitle="Chưa có phòng ban"
          emptyDescription="Không có phòng ban phù hợp với bộ lọc hiện tại."
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          form.reset();
        }}
        title={editing ? "Chỉnh sửa phòng ban" : "Tạo phòng ban"}
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput
              label="Mã phòng ban"
              withAsterisk
              {...form.getInputProps("code")}
            />
            <Select
              label="Đơn vị"
              data={unitOptions}
              withAsterisk
              searchable
              {...form.getInputProps("unitId")}
            />
            <TextInput
              label="Tên phòng ban"
              withAsterisk
              {...form.getInputProps("name")}
            />
            <Textarea
              label="Ghi chú"
              minRows={3}
              {...form.getInputProps("note")}
            />
            <Select
              label="Trạng thái"
              data={statusOptions}
              withAsterisk
              {...form.getInputProps("status")}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={mutation.isPending} disabled={editing ? !canEditDepartment : !canCreateDepartment}>
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <DomainExcelImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Excel Phòng ban"
        module="departments"
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["departments"] })
        }
      />

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
    </>
  );
}
