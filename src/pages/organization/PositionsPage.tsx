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
import type { PaginationMeta } from "../../shared/types/api";
import { sortByCode } from "../../shared/utils/sort";
import { useAllPositions } from "../../features/organization/usePositions";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { debugPermissionCheck } from "../../shared/debug/hrmDebug";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { TableActionsMenu } from "../../shared/components/TableActionsMenu";

// Mã chức danh không còn nhập từ UI — backend tự sinh từ tên chức danh.
type PositionFormValues = Omit<Position, "id" | "code">;

const statusOptions = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Tạm ngưng" },
];

export function PositionsPage() {
  const { can, permissions, roles } = useAuth();
  const canCreatePosition = can(HR_PERMISSIONS.POSITION_CREATE);
  const canEditPosition = can(HR_PERMISSIONS.POSITION_UPDATE);
  const canImportPositions = can(HR_PERMISSIONS.EMPLOYEE_IMPORT);
  const canExportPositions = can(HR_PERMISSIONS.POSITION_READ);
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
  // Lấy toàn bộ vị trí theo bộ lọc, sắp theo tên trên toàn danh sách rồi
  // phân trang ở client để trang 1 luôn bắt đầu từ tên nhỏ nhất.
  const { data: allPositions, isLoading, error, refetch } = useAllPositions({
    search: params.search || undefined,
    status: params.status,
  });
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
      name: "",
      scope: "",
      jobFunction: "",
      grade: "",
      note: "",
      status: "ACTIVE",
    },
    validate: {
      name: (value) => (value.trim() ? null : "Nhập tên chức danh."),
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
        throw new Error("Bạn không có quyền lưu chức danh.");
      }

      const payload = {
        name: values.name.trim(),
        scope: values.scope?.trim() || undefined,
        jobFunction: values.jobFunction.trim() || undefined,
        grade: values.grade.trim() || undefined,
        note: values.note?.trim() || undefined,
        status: values.status,
      };
      if (editing) {
        return updatePosition(editing.id, payload);
      }
      return createPosition({
        name: payload.name,
        scope: payload.scope,
        jobFunction: payload.jobFunction ?? "",
        grade: payload.grade ?? "",
        note: payload.note,
        status: payload.status,
      });
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        title: editing ? "Đã cập nhật chức danh" : "Đã tạo chức danh",
        message: "Danh mục chức danh đã được cập nhật.",
      });
      setOpen(false);
      setEditing(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
    onError: () => {
      notifications.show({
        color: "red",
        title: "Không lưu được chức danh",
        message: "Vui lòng kiểm tra dữ liệu và thử lại.",
      });
    },
  });

  // Sắp xếp toàn bộ vị trí theo tên tăng dần rồi phân trang ở client.
  const sortedPositions = useMemo(
    () => sortByCode(allPositions, (item) => item.name),
    [allPositions],
  );
  const totalCount = sortedPositions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / params.pageSize));
  const currentPage = Math.min(params.page, totalPages);
  const pagedPositions = useMemo(() => {
    const start = (currentPage - 1) * params.pageSize;
    return sortedPositions.slice(start, start + params.pageSize);
  }, [sortedPositions, currentPage, params.pageSize]);
  const pagedMeta = useMemo<PaginationMeta>(
    () => ({
      page: currentPage,
      pageSize: params.pageSize,
      total: totalCount,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    }),
    [currentPage, params.pageSize, totalCount, totalPages],
  );

  const columns = useMemo<DataTableColumn<Position>[]>(
    () => [
      {
        key: "name",
        header: "Tên chức danh",
        render: (record) => <Text fw={600}>{record.name}</Text>,
      },
      {
        key: "scope",
        header: "Phạm vi",
        render: (record) => record.scope || "-",
      },
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
                    name: record.name,
                    scope: record.scope ?? "",
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
        title="Chức danh"
        subtitle="Danh mục chức danh, nhóm công việc, grade và import Excel ngay trong modal."
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
              canExport={canExportPositions}
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
                Tạo chức danh
              </Button>
            ) : null}
          </>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            placeholder="Tìm tên, nhóm công việc"
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
          data={pagedPositions}
          columns={columns}
          rowKey={(record) => record.id}
          meta={pagedMeta}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          onPageChange={(page, pageSize) =>
            setParams((current) => ({ ...current, page, pageSize }))
          }
          emptyTitle="Chưa có chức danh"
          emptyDescription="Không có chức danh phù hợp với bộ lọc hiện tại."
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          form.reset();
        }}
        title={editing ? "Chỉnh sửa chức danh" : "Tạo chức danh"}
        position="right"
      >
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput
              label="Tên chức danh"
              withAsterisk
              {...form.getInputProps("name")}
            />
            <TextInput label="Phạm vi" {...form.getInputProps("scope")} />
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
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={editing ? !canEditPosition : !canCreatePosition}
              >
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <DomainExcelImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Excel Chức danh"
        module="positions"
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["positions"] })
        }
      />
    </>
  );
}
