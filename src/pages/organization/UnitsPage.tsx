import { useCallback, useMemo, useState } from "react";
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
import { downloadUnitsExport } from "../../features/import-export/excelFilesApi";
import { ImportExportToolbar } from "../../features/import-export/ImportExportToolbar";
import { useHrmCoreTemplateDownload } from "../../features/import-export/useHrmCoreTemplateDownload";
import { useBusinessSectorsSelect } from "../../features/organization/useBusinessSectors";
import {
  createUnit,
  generateUnitShortCode,
  isValidUnitCode,
  normalizeUnitCodeInput,
  updateUnit,
} from "../../features/organization/unitsApi";
import type { Unit } from "../../features/organization/organizationTypes";
import { useAllUnits } from "../../features/organization/useUnits";
import { useAllDepartments } from "../../features/organization/useDepartments";
import { ApiError } from "../../shared/api/api.types";
import { sortByCode } from "../../shared/utils/sort";
import { ConfirmActionModal } from "../../shared/components/ConfirmActionModal";
import { debugPermissionCheck } from "../../shared/debug/hrmDebug";
import { PageHeader } from "../../shared/components/PageHeader";
import { NormalizedSearchInput } from "../../shared/components/NormalizedSearchInput";
import { useImeSafeSelectFilter } from "../../shared/hooks/useImeSafeSelectFilter";
import { OrganizationHierarchyList, type OrganizationHierarchyRow } from "./OrganizationHierarchyList";

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

type UnitTreeRecord =
  | { kind: "unit"; unit: Unit }
  | { kind: "department"; id: string; code: string; name: string; status: string; note?: string | null };

const statusOptions = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Tạm ngưng" },
];

export function UnitsPage() {
  const selectSearch = useImeSafeSelectFilter();
  const { can, permissions, roles } = useAuth();
  const canCreateUnit = can(HR_PERMISSIONS.UNIT_CREATE);
  const canEditUnit = can(HR_PERMISSIONS.UNIT_UPDATE);
  const canImportUnits = can(HR_PERMISSIONS.EMPLOYEE_IMPORT);
  const canExportUnits = can(HR_PERMISSIONS.UNIT_READ);
  const queryClient = useQueryClient();
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    status: undefined as string | undefined,
  });
  const [editing, setEditing] = useState<Unit | null>(null);
  const [confirmInactive, setConfirmInactive] = useState<Unit | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  // Lấy toàn bộ đơn vị theo bộ lọc, sắp theo mã trên toàn danh sách rồi
  // phân trang ở client để trang 1 luôn bắt đầu từ mã nhỏ nhất.
  const { data: allUnits, isLoading, error, refetch } = useAllUnits({
    search: params.search || undefined,
    status: params.status,
  });
  const { data: allDepartments = [] } = useAllDepartments({});
  const { data: employees = [] } = useAllEmployees({});
  const sectorsQuery = useBusinessSectorsSelect();
  const templateDownload = useHrmCoreTemplateDownload("organization-units");

  const exportMutation = useMutation({
    mutationFn: () => downloadUnitsExport(params),
    onError: () => {
      notifications.show({
        color: "red",
        title: "Không xuất được Excel",
        message: "Vui lòng thử lại sau.",
      });
    },
  });

  const form = useForm<UnitFormValues>({
    initialValues: {
      code: "",
      sectorId: "",
      name: "",
      shortName: "",
      taxCode: "",
      address: "",
      note: "",
      status: "ACTIVE",
    },
    validate: {
      code: (value) => {
        const code = normalizeUnitCodeInput(value);
        if (!code) {
          return "Mã đơn vị không được để trống.";
        }
        return isValidUnitCode(code) ? null : "Mã đơn vị không đúng định dạng.";
      },
      sectorId: (value) => (value ? null : "Vui lòng chọn lĩnh vực."),
      name: (value) => (value.trim() ? null : "Vui lòng nhập tên đơn vị."),
      shortName: (value) => (value.trim() ? null : "Nhập KH đơn vị."),
      taxCode: (value) => (value.trim() ? null : "Nhập mã số thuế."),
    },
  });

  const sectorOptions = (sectorsQuery.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name} (${item.code})`,
  }));

  function applyApiErrors(error: unknown) {
    if (!(error instanceof ApiError)) {
      return "Vui lòng kiểm tra dữ liệu và thử lại.";
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
      const requiredPermission = editing
        ? HR_PERMISSIONS.UNIT_UPDATE
        : HR_PERMISSIONS.UNIT_CREATE;
      const allowed = editing ? canEditUnit : canCreateUnit;
      debugPermissionCheck({
        action: editing ? "unit.update" : "unit.create",
        required: requiredPermission,
        permissions,
        roles,
        allowed,
      });
      if (!allowed) {
        throw new Error("Bạn không có quyền lưu đơn vị.");
      }

      const payload = normalizeUnitPayload(values);
      if (editing) {
        return updateUnit(editing.id, payload);
      }
      return createUnit(payload);
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        title: editing ? "Đã cập nhật đơn vị" : "Đã tạo đơn vị",
        message: "Dữ liệu đã được lưu.",
      });
      closeDrawer();
      await queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Không lưu được đơn vị",
        message: applyApiErrors(error),
      });
    },
  });

  function openCreateDrawer() {
    debugPermissionCheck({
      action: "unit.create",
      required: HR_PERMISSIONS.UNIT_CREATE,
      permissions,
      roles,
      allowed: canCreateUnit,
    });
    if (!canCreateUnit) {
      return;
    }

    setEditing(null);
    setCodeManuallyEdited(false);
    form.reset();
    setOpen(true);
  }

  const openEditDrawer = useCallback(
    (record: Unit) => {
      debugPermissionCheck({
        action: "unit.update",
        required: HR_PERMISSIONS.UNIT_UPDATE,
        permissions,
        roles,
        allowed: canEditUnit,
      });
      if (!canEditUnit) {
        return;
      }

      setEditing(record);
      setCodeManuallyEdited(true);
      form.setValues({
        code: record.code,
        sectorId:
          record.sectorId ?? record.businessSectorId ?? record.sector?.id ?? "",
        name: record.name,
        shortName: record.shortName ?? "",
        taxCode: record.taxCode ?? "",
        address: record.address ?? "",
        note: record.note ?? "",
        status: record.status,
      });
      setOpen(true);
    },
    [canEditUnit, form, permissions, roles],
  );

  function closeDrawer() {
    setOpen(false);
    setEditing(null);
    setCodeManuallyEdited(false);
    form.reset();
  }

  function handleNameChange(value: string) {
    form.setFieldValue("name", value);
    if (!codeManuallyEdited) {
      form.setFieldValue(
        "code",
        value.trim() ? generateUnitShortCode(value) : "",
      );
    }
  }

  const inactiveMutation = useMutation({
    mutationFn: (record: Unit) => {
      debugPermissionCheck({
        action: "unit.update",
        required: HR_PERMISSIONS.UNIT_UPDATE,
        permissions,
        roles,
        allowed: canEditUnit,
      });
      if (!canEditUnit) {
        throw new Error("Bạn không có quyền tạm ngưng đơn vị.");
      }

      return updateUnit(record.id, {
        code: record.code,
        sectorId:
          record.sectorId ?? record.businessSectorId ?? record.sector?.id ?? "",
        name: record.name,
        shortName: record.shortName,
        taxCode: record.taxCode,
        address: record.address ?? undefined,
        note: record.note ?? undefined,
        status: "INACTIVE",
      });
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        title: "Đã tạm ngưng đơn vị",
        message: "Trạng thái đơn vị đã được cập nhật.",
      });
      setConfirmInactive(null);
      await queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: () => {
      notifications.show({
        color: "red",
        title: "Không tạm ngưng được đơn vị",
        message: "Vui lòng thử lại.",
      });
    },
  });

  // Sắp xếp toàn bộ đơn vị theo mã tăng dần rồi phân trang ở client.
  const sortedUnits = useMemo(() => sortByCode(allUnits), [allUnits]);
  const activeCount = sortedUnits.filter((item) => item.status === "ACTIVE").length;
  const treeRows = useMemo<OrganizationHierarchyRow<UnitTreeRecord>[]>(() => {
    return sortedUnits.flatMap((unit) => {
      const departments = sortByCode(allDepartments.filter((department) => department.unitId === unit.id));
      const unitEmployees = employees.filter((employee) => employee.currentEmployeeAssignment?.unitId === unit.id);
      const parent: OrganizationHierarchyRow<UnitTreeRecord> = {
        id: unit.id,
        code: unit.code,
        name: unit.name,
        status: unit.status,
        description: unit.note,
        level: 0,
        employeeCount: unitEmployees.length,
        employees: unitEmployees,
        record: { kind: "unit", unit },
        meta: `${departments.length} phòng ban · ${unit.businessSector?.name ?? unit.sector?.name ?? "Chưa gắn lĩnh vực"}`,
        detailFields: [
          { label: "Lĩnh vực", value: unit.businessSector?.name ?? unit.sector?.name ?? "-" },
          { label: "KH đơn vị", value: unit.shortName || "-" },
          { label: "Mã số thuế", value: unit.taxCode || "-" },
          { label: "Địa chỉ", value: unit.address || "-" },
        ],
      };
      const children: OrganizationHierarchyRow<UnitTreeRecord>[] = departments.map((department) => ({
        id: `${unit.id}-${department.id}`,
        code: department.code,
        name: department.name,
        status: department.status,
        description: department.note,
        level: 1,
        parentId: unit.id,
        employeeCount: employees.filter((employee) => employee.currentEmployeeAssignment?.departmentId === department.id).length,
        employees: employees.filter((employee) => employee.currentEmployeeAssignment?.departmentId === department.id),
        record: { kind: "department", id: department.id, code: department.code, name: department.name, status: department.status, note: department.note },
        meta: "Phòng ban trực thuộc",
      }));
      return [parent, ...children];
    });
  }, [allDepartments, employees, sortedUnits]);

  return (
    <>
      <PageHeader
        title="Đơn vị"
        subtitle="Quản lý đơn vị, lĩnh vực, mã số thuế và thông tin danh mục dùng cho HRM."
        actions={
          <>
            <Badge variant="light">{activeCount} active</Badge>
            <ImportExportToolbar
              onDownloadTemplate={templateDownload.downloadTemplate}
              onImport={canImportUnits ? () => setImportOpen(true) : undefined}
              onExport={() => exportMutation.mutateAsync()}
              isDownloadingTemplate={templateDownload.isDownloadingTemplate}
              isExporting={exportMutation.isPending}
              canImport={canImportUnits}
              canExport={canExportUnits}
            />
            {canCreateUnit ? (
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={openCreateDrawer}
              >
                Tạo đơn vị
              </Button>
            ) : null}
          </>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
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
          emptyTitle="Chưa có đơn vị"
          emptyDescription="Không có đơn vị phù hợp với bộ lọc hiện tại."
          canEdit={(row) => canEditUnit && row.record.kind === "unit"}
          canDeactivate={(row) => canEditUnit && row.record.kind === "unit"}
          onEdit={(row) => {
            if (row.record.kind === "unit") openEditDrawer(row.record.unit);
          }}
          onDeactivate={(row) => {
            if (row.record.kind === "unit") setConfirmInactive(row.record.unit);
          }}
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={closeDrawer}
        title={editing ? "Chỉnh sửa đơn vị" : "Tạo đơn vị"}
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput
              label="Mã đơn vị"
              withAsterisk
              value={form.values.code}
              error={form.errors.code}
              onChange={(event) => {
                setCodeManuallyEdited(true);
                form.setFieldValue(
                  "code",
                  normalizeUnitCodeInput(event.currentTarget.value),
                );
              }}
            />
            <TextInput
              label="Tên đơn vị"
              withAsterisk
              value={form.values.name}
              error={form.errors.name}
              onChange={(event) => handleNameChange(event.currentTarget.value)}
            />
            <Select
              label="Lĩnh vực"
              withAsterisk
              searchable
              {...selectSearch}
              data={sectorOptions}
              disabled={sectorsQuery.isLoading}
              {...form.getInputProps("sectorId")}
            />
            <TextInput
              label="KH đơn vị"
              withAsterisk
              {...form.getInputProps("shortName")}
            />
            <TextInput
              label="Mã số thuế"
              withAsterisk
              {...form.getInputProps("taxCode")}
            />
            <TextInput label="Địa chỉ" {...form.getInputProps("address")} />
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
              <Button variant="default" onClick={closeDrawer}>
                Hủy
              </Button>
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={editing ? !canEditUnit : !canCreateUnit}
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
        title="Import Excel Đơn vị"
        module="organization-units"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["units"] })}
      />

      <ConfirmActionModal
        opened={Boolean(confirmInactive)}
        title="Tạm ngưng đơn vị?"
        message={`Có ${confirmInactive ? treeRows.find((row) => row.id === confirmInactive.id)?.employeeCount ?? 0 : 0} nhân sự đang gắn với đơn vị này. Đơn vị sẽ được chuyển sang trạng thái tạm ngưng, dữ liệu lịch sử không bị xóa.`}
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
