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
import { IconEdit, IconPlus, IconSearch } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import { DomainExcelImportModal } from "../../features/import-export/DomainExcelImportModal";
import { downloadPositionsExport } from "../../features/import-export/excelFilesApi";
import { ImportExportToolbar } from "../../features/import-export/ImportExportToolbar";
import { useHrmCoreTemplateDownload } from "../../features/import-export/useHrmCoreTemplateDownload";
import {
  createPosition,
  updatePosition,
} from "../../features/organization/positionsApi";
import type { Position } from "../../features/organization/organizationTypes";
import { usePositions } from "../../features/organization/usePositions";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { debugPermissionCheck } from "../../shared/debug/hrmDebug";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { TableActionsMenu } from "../../shared/components/TableActionsMenu";

type PositionFormValues = Omit<Position, "id">;

const statusOptions = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Tạm ngưng" },
];

export function PositionsPage() {
  const { can, permissions, roles } = useAuth();
  const canCreatePosition = can(HR_PERMISSIONS.POSITION_CREATE);
  const canEditPosition = can(HR_PERMISSIONS.POSITION_UPDATE);
  const canImportPositions = can(HR_PERMISSIONS.POSITION_CREATE);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Position | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    status: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = usePositions(params);
  const templateDownload = useHrmCoreTemplateDownload("positions");

  const exportMutation = useMutation({
    mutationFn: () => downloadPositionsExport(params),
    onError: () => {
      notifications.show({
        color: "red",
        title: "Không xuất được Excel",
        message: "Vui lòng thử lại sau.",
      });
    },
  });

  const form = useForm<PositionFormValues>({
    initialValues: {
      code: "",
      name: "",
      jobFunction: "",
      grade: "",
      note: "",
      status: "ACTIVE",
    },
    validate: {
      code: (value) => (value.trim() ? null : "Nhập mã chức vụ."),
      name: (value) => (value.trim() ? null : "Nhập tên chức vụ."),
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: PositionFormValues) => {
      const requiredPermission = editing
        ? HR_PERMISSIONS.POSITION_UPDATE
        : HR_PERMISSIONS.POSITION_CREATE;
      const allowed = editing ? canEditPosition : canCreatePosition;
      debugPermissionCheck({
        action: editing ? "position.update" : "position.create",
        required: requiredPermission,
        permissions,
        roles,
        allowed,
      });
      if (!allowed) {
        throw new Error("Ban khong co quyen luu chuc vu.");
      }

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
        jobFunction: payload.jobFunction ?? "",
        grade: payload.grade ?? "",
        note: payload.note,
        status: payload.status,
      });
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        title: editing ? "Đã cập nhật chức vụ" : "Đã tạo chức vụ",
        message: "Danh mục chức vụ đã được cập nhật.",
      });
      setOpen(false);
      setEditing(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
    onError: () => {
      notifications.show({
        color: "red",
        title: "Không lưu được chức vụ",
        message: "Vui lòng kiểm tra dữ liệu và thử lại.",
      });
    },
  });

  const columns = useMemo<DataTableColumn<Position>[]>(
    () => [
      {
        key: "code",
        header: "Mã",
        width: 120,
        render: (record) => <Text fw={600}>{record.code}</Text>,
      },
      { key: "name", header: "Tên chức vụ", render: (record) => record.name },
      {
        key: "jobFunction",
        header: "Nhóm công việc",
        render: (record) => record.jobFunction || "-",
      },
      {
        key: "grade",
        header: "Grade",
        width: 110,
        render: (record) => record.grade || "-",
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
        width: 72,
        align: "right",
        render: (record) => (
          <TableActionsMenu
            actions={[
              {
                label: "Chỉnh sửa",
                icon: <IconEdit size={16} />,
                disabled: !canEditPosition,
                onClick: () => {
                  debugPermissionCheck({
                    action: "position.update",
                    required: HR_PERMISSIONS.POSITION_UPDATE,
                    permissions,
                    roles,
                    allowed: canEditPosition,
                  });
                  if (!canEditPosition) {
                    return;
                  }
                  setEditing(record);
                  form.setValues({
                    code: record.code,
                    name: record.name,
                    jobFunction: record.jobFunction ?? "",
                    grade: record.grade ?? "",
                    note: record.note ?? "",
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
    [canEditPosition, form, permissions, roles],
  );

  return (
    <>
      <PageHeader
        title="Chức vụ"
        subtitle="Danh mục chức vụ, nhóm công việc, grade và import Excel ngay trong modal."
        actions={
          <>
            <ImportExportToolbar
              onDownloadTemplate={templateDownload.downloadTemplate}
              onImport={
                canImportPositions ? () => setImportOpen(true) : undefined
              }
              onExport={() => exportMutation.mutateAsync()}
              isDownloadingTemplate={templateDownload.isDownloadingTemplate}
              isExporting={exportMutation.isPending}
              canImport={canImportPositions}
            />
            {canCreatePosition ? (
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => {
                  debugPermissionCheck({
                    action: "position.create",
                    required: HR_PERMISSIONS.POSITION_CREATE,
                    permissions,
                    roles,
                    allowed: canCreatePosition,
                  });
                  if (!canCreatePosition) {
                    return;
                  }
                  setEditing(null);
                  form.reset();
                  setOpen(true);
                }}
              >
                Tạo chức vụ
              </Button>
            ) : null}
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
        title={editing ? "Chỉnh sửa chức vụ" : "Tạo chức vụ"}
        position="right"
      >
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput
              label="Mã chức vụ"
              withAsterisk
              {...form.getInputProps("code")}
            />
            <TextInput
              label="Tên chức vụ"
              withAsterisk
              {...form.getInputProps("name")}
            />
            <TextInput
              label="Nhóm công việc"
              {...form.getInputProps("jobFunction")}
            />
            <TextInput label="Grade" {...form.getInputProps("grade")} />
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
              <Button type="submit" loading={mutation.isPending} disabled={editing ? !canEditPosition : !canCreatePosition}>
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <DomainExcelImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Excel Chức vụ"
        module="positions"
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["positions"] })
        }
      />
    </>
  );
}
