import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Drawer,
  Group,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import { useAllEmployees } from "../../features/employees/useEmployees";
import { DomainExcelImportModal } from "../../features/import-export/DomainExcelImportModal";
import { downloadDepartmentsExport } from "../../features/import-export/excelFilesApi";
import { ImportExportToolbar } from "../../features/import-export/ImportExportToolbar";
import { useHrmCoreTemplateDownload } from "../../features/import-export/useHrmCoreTemplateDownload";
import {
  createDepartment,
  updateDepartment,
} from "../../features/organization/departmentsApi";
import type { Department, UnitSelectOption } from "../../features/organization/organizationTypes";
import { ApiError } from "../../shared/api/api.types";
import { sortByCode } from "../../shared/utils/sort";
import { useAllDepartments } from "../../features/organization/useDepartments";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { ConfirmActionModal } from "../../shared/components/ConfirmActionModal";
import { debugPermissionCheck } from "../../shared/debug/hrmDebug";
import { PageHeader } from "../../shared/components/PageHeader";
import { NormalizedSearchInput } from "../../shared/components/NormalizedSearchInput";
import { useImeSafeSelectFilter } from "../../shared/hooks/useImeSafeSelectFilter";
import { OrganizationHierarchyList, type OrganizationHierarchyRow } from "./OrganizationHierarchyList";

type DepartmentFormValues = {
  code: string;
  unitId: string;
  name: string;
  note: string;
  status: string;
};

type DepartmentTreeRecord =
  | { kind: "unit"; unit: UnitSelectOption }
  | { kind: "department"; department: Department };

const statusOptions = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Tạm ngưng" },
];

export function DepartmentsPage() {
  const selectSearch = useImeSafeSelectFilter();
  const { can, permissions, roles } = useAuth();
  const canCreateDepartment = can(HR_PERMISSIONS.DEPARTMENT_CREATE);
  const canEditDepartment = can(HR_PERMISSIONS.DEPARTMENT_UPDATE);
  const canImportDepartments = can(HR_PERMISSIONS.EMPLOYEE_IMPORT);
  const canExportDepartments = can(HR_PERMISSIONS.DEPARTMENT_READ);
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

  // Lấy toàn bộ phòng ban theo bộ lọc, sắp theo mã trên toàn danh sách rồi
  // phân trang ở client để trang 1 luôn bắt đầu từ mã nhỏ nhất.
  const { data: allDepartments, isLoading, error, refetch } = useAllDepartments({
    search: params.search || undefined,
    unitId: params.unitId,
    status: params.status,
  });
  const unitsSelect = useUnitsSelect();
  const { data: employees = [] } = useAllEmployees({});
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
        throw new Error("Bạn không có quyền lưu phòng ban.");
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
    onError: (error) => {
      const msg =
        error instanceof ApiError
          ? (error.errors[0]?.message ?? error.message)
          : "Vui lòng kiểm tra dữ liệu và thử lại.";
      notifications.show({
        color: "red",
        title: "Không lưu được phòng ban",
        message: msg,
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
        throw new Error("Bạn không có quyền tạm ngưng phòng ban.");
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

  // Sắp xếp toàn bộ phòng ban theo mã tăng dần rồi phân trang ở client.
  const sortedDepartments = useMemo(
    () => sortByCode(allDepartments),
    [allDepartments],
  );
  const activeCount = sortedDepartments.filter((item) => item.status === "ACTIVE").length;
  const treeRows = useMemo<OrganizationHierarchyRow<DepartmentTreeRecord>[]>(() => {
    const units = params.unitId
      ? (unitsSelect.data ?? []).filter((unit) => unit.id === params.unitId)
      : (unitsSelect.data ?? []).filter((unit) => sortedDepartments.some((department) => department.unitId === unit.id));

    return sortByCode(units).flatMap((unit) => {
      const departments = sortedDepartments.filter((department) => department.unitId === unit.id);
      const unitEmployees = employees.filter((employee) => employee.currentEmployeeAssignment?.unitId === unit.id);
      const parent: OrganizationHierarchyRow<DepartmentTreeRecord> = {
        id: `unit-${unit.id}`,
        code: unit.code,
        name: unit.name,
        status: "ACTIVE",
        description: "Nhóm phòng ban theo đơn vị",
        level: 0,
        employeeCount: unitEmployees.length,
        employees: unitEmployees,
        record: { kind: "unit", unit },
        meta: `${departments.length} phòng ban`,
      };
      const children: OrganizationHierarchyRow<DepartmentTreeRecord>[] = departments.map((department) => ({
        id: department.id,
        code: department.code,
        name: department.name,
        status: department.status,
        description: department.note,
        level: 1,
        parentId: `unit-${unit.id}`,
        employeeCount: employees.filter((employee) => employee.currentEmployeeAssignment?.departmentId === department.id).length,
        employees: employees.filter((employee) => employee.currentEmployeeAssignment?.departmentId === department.id),
        record: { kind: "department", department },
        meta: department.unit?.name ?? unit.name,
        detailFields: [{ label: "Đơn vị", value: department.unit?.name ?? unit.name }],
      }));
      return [parent, ...children];
    });
  }, [employees, params.unitId, sortedDepartments, unitsSelect.data]);

  function openEditDepartment(record: Department) {
    setEditing(record);
    form.setValues({
      code: record.code,
      unitId: record.unitId,
      name: record.name,
      note: record.note ?? "",
      status: record.status,
    });
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Phòng ban"
        subtitle="Quản lý phòng ban theo đơn vị, trạng thái và import Excel ngay trên màn danh mục."
        actions={
          <>
            <Badge variant="light">{activeCount} active</Badge>
            <ImportExportToolbar
              onDownloadTemplate={templateDownload.downloadTemplate}
              onImport={
                canImportDepartments ? () => setImportOpen(true) : undefined
              }
              onExport={() => exportMutation.mutateAsync()}
              isDownloadingTemplate={templateDownload.isDownloadingTemplate}
              isExporting={exportMutation.isPending}
              canImport={canImportDepartments}
              canExport={canExportDepartments}
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
          <NormalizedSearchInput
            placeholder="Tìm mã hoặc tên"
            value={params.search}
            onChange={(value) => {
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

        <OrganizationHierarchyList
          rows={treeRows}
          employees={employees}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle="Chưa có phòng ban"
          emptyDescription="Không có phòng ban phù hợp với bộ lọc hiện tại."
          canEdit={(row) => canEditDepartment && row.record.kind === "department"}
          canDeactivate={(row) => canEditDepartment && row.record.kind === "department"}
          onEdit={(row) => {
            if (row.record.kind === "department") openEditDepartment(row.record.department);
          }}
          onDeactivate={(row) => {
            if (row.record.kind === "department") setConfirmInactive(row.record.department);
          }}
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
              {...selectSearch}
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
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={editing ? !canEditDepartment : !canCreateDepartment}
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
        title="Import Excel Phòng ban"
        module="departments"
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["departments"] })
        }
      />

      <ConfirmActionModal
        opened={Boolean(confirmInactive)}
        title="Tạm ngưng phòng ban?"
        message={`Có ${confirmInactive ? treeRows.find((row) => row.id === confirmInactive.id)?.employeeCount ?? 0 : 0} nhân sự đang gắn với phòng ban này. Phòng ban sẽ được chuyển sang trạng thái tạm ngưng, dữ liệu lịch sử không bị xóa.`}
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
