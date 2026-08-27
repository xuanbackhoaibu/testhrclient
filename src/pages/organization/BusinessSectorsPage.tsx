import { useMemo, useState } from "react";
import {
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
import {
  createBusinessSector,
  deactivateBusinessSector,
  normalizeBusinessSectorCode,
  updateBusinessSector,
} from "../../features/organization/businessSectorsApi";
import type { BusinessSector } from "../../features/organization/organizationTypes";
import { sortByCode } from "../../shared/utils/sort";
import { useAllBusinessSectors } from "../../features/organization/useBusinessSectors";
import { useAllUnits } from "../../features/organization/useUnits";
import { ConfirmActionModal } from "../../shared/components/ConfirmActionModal";
import { debugPermissionCheck } from "../../shared/debug/hrmDebug";
import { PageHeader } from "../../shared/components/PageHeader";
import { NormalizedSearchInput } from "../../shared/components/NormalizedSearchInput";
import { OrganizationHierarchyList, type OrganizationHierarchyRow } from "./OrganizationHierarchyList";

type BusinessSectorFormValues = {
  code: string;
  name: string;
  note: string;
  status: string;
};

type SectorTreeRecord =
  | { kind: "sector"; sector: BusinessSector }
  | { kind: "unit"; unitId: string; code: string; name: string; status: string; note?: string | null };

const statusOptions = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Tạm ngừng" },
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
    search: "",
    status: undefined as string | undefined,
  });
  const [editing, setEditing] = useState<BusinessSector | null>(null);
  const [confirmInactive, setConfirmInactive] = useState<BusinessSector | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  // Lấy toàn bộ lĩnh vực theo bộ lọc, sắp theo mã trên toàn danh sách rồi
  // phân trang ở client để trang 1 luôn bắt đầu từ mã nhỏ nhất.
  const { data: allSectors, isLoading, error, refetch } = useAllBusinessSectors({
    search: params.search || undefined,
    status: params.status,
  });
  const { data: allUnits = [] } = useAllUnits({});
  const { data: employees = [] } = useAllEmployees({});

  const form = useForm<BusinessSectorFormValues>({
    initialValues: {
      code: "",
      name: "",
      note: "",
      status: "ACTIVE",
    },
    validate: {
      code: (value) => (value.trim() ? null : "Vui lòng nhập mã lĩnh vực."),
      name: (value) => (value.trim() ? null : "Vui lòng nhập tên lĩnh vực."),
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: BusinessSectorFormValues) => {
      const requiredPermission = editing
        ? HR_PERMISSIONS.BUSINESS_SECTOR_UPDATE
        : HR_PERMISSIONS.BUSINESS_SECTOR_CREATE;
      const allowed = editing ? canEditBusinessSector : canCreateBusinessSector;
      debugPermissionCheck({
        action: editing ? "business-sector.update" : "business-sector.create",
        required: requiredPermission,
        permissions,
        roles,
        allowed,
      });
      if (!allowed) {
        throw new Error("Bạn không có quyền lưu lĩnh vực.");
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
        color: "green",
        title: editing ? "Đã cập nhật lĩnh vực" : "Đã tạo lĩnh vực",
        message: "Danh mục lĩnh vực đã được lưu.",
      });
      setOpen(false);
      setEditing(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["business-sectors"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Vui lòng kiểm tra dữ liệu và thử lại.";
      notifications.show({
        color: "red",
        title: "Không lưu được lĩnh vực",
        message,
      });
    },
  });

  const inactiveMutation = useMutation({
    mutationFn: (record: BusinessSector) => {
      debugPermissionCheck({
        action: "business-sector.delete",
        required: HR_PERMISSIONS.BUSINESS_SECTOR_DELETE,
        permissions,
        roles,
        allowed: canDeleteBusinessSector,
      });
      if (!canDeleteBusinessSector) {
        throw new Error("Bạn không có quyền tạm ngưng lĩnh vực.");
      }

      return deactivateBusinessSector(record.id);
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        title: "Đã tạm ngừng lĩnh vực",
        message: "Trạng thái lĩnh vực đã được cập nhật.",
      });
      setConfirmInactive(null);
      await queryClient.invalidateQueries({ queryKey: ["business-sectors"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Vui lòng thử lại.";
      notifications.show({
        color: "red",
        title: "Không tạm ngừng được lĩnh vực",
        message,
      });
    },
  });

  // Sắp xếp toàn bộ lĩnh vực theo mã tăng dần rồi phân trang ở client.
  const sortedSectors = useMemo(() => sortByCode(allSectors), [allSectors]);
  const treeRows = useMemo<OrganizationHierarchyRow<SectorTreeRecord>[]>(() => {
    return sortedSectors.flatMap((sector) => {
      const sectorUnits = allUnits.filter((unit) => {
        const sectorId = unit.sectorId ?? unit.businessSectorId ?? unit.sector?.id ?? unit.businessSector?.id;
        return sectorId === sector.id;
      });
      const sectorEmployees = employees.filter((employee) =>
        sectorUnits.some((unit) => employee.currentEmployeeAssignment?.unitId === unit.id),
      );
      const parent: OrganizationHierarchyRow<SectorTreeRecord> = {
        id: sector.id,
        code: sector.code,
        name: sector.name,
        status: sector.status,
        description: sector.note,
        level: 0,
        employeeCount: sectorEmployees.length,
        employees: sectorEmployees,
        record: { kind: "sector", sector },
        meta: `${sectorUnits.length} đơn vị trực thuộc`,
        detailFields: [{ label: "Số đơn vị", value: sectorUnits.length }],
      };
      const children = sortByCode(sectorUnits).map((unit) => ({
        id: `${sector.id}-${unit.id}`,
        code: unit.code,
        name: unit.name,
        status: unit.status,
        description: unit.note,
        level: 1,
        parentId: sector.id,
        employeeCount: employees.filter((employee) => employee.currentEmployeeAssignment?.unitId === unit.id).length,
        employees: employees.filter((employee) => employee.currentEmployeeAssignment?.unitId === unit.id),
        record: { kind: "unit" as const, unitId: unit.id, code: unit.code, name: unit.name, status: unit.status, note: unit.note },
        meta: unit.shortName || unit.taxCode || "Đơn vị trực thuộc",
        detailFields: [
          { label: "KH đơn vị", value: unit.shortName || "-" },
          { label: "Mã số thuế", value: unit.taxCode || "-" },
        ],
      }));
      return [parent, ...children];
    });
  }, [allUnits, employees, sortedSectors]);

  function openEditSector(record: BusinessSector) {
    setEditing(record);
    form.setValues({
      code: record.code,
      name: record.name,
      note: record.note ?? "",
      status: record.status,
    });
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Lĩnh vực"
        subtitle="Danh mục lĩnh vực dùng cho đơn vị và import Excel. Cột linh_vuc trong file import phải khớp mã lĩnh vực tại đây."
        actions={
          <>
            {canCreateBusinessSector ? (
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => {
                  debugPermissionCheck({
                    action: "business-sector.create",
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
            ) : null}
          </>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <NormalizedSearchInput
            placeholder="Tìm mã hoặc tên lĩnh vực"
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
          emptyTitle="Chưa có lĩnh vực"
          emptyDescription="Tạo danh mục lĩnh vực trước khi import hoặc gán đơn vị."
          canEdit={(row) => canEditBusinessSector && row.record.kind === "sector"}
          canDeactivate={(row) => canDeleteBusinessSector && row.record.kind === "sector"}
          onEdit={(row) => {
            if (row.record.kind === "sector") openEditSector(row.record.sector);
          }}
          onDeactivate={(row) => {
            if (row.record.kind === "sector") setConfirmInactive(row.record.sector);
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
        title={editing ? "Chỉnh sửa lĩnh vực" : "Tạo lĩnh vực"}
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
                  "code",
                  normalizeBusinessSectorCode(event.currentTarget.value),
                )
              }
            />
            <TextInput
              label="Tên lĩnh vực"
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
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={
                  editing ? !canEditBusinessSector : !canCreateBusinessSector
                }
              >
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <ConfirmActionModal
        opened={Boolean(confirmInactive)}
        title="Tạm ngừng lĩnh vực?"
        message={`Có ${confirmInactive ? treeRows.find((row) => row.id === confirmInactive.id)?.employeeCount ?? 0 : 0} nhân sự đang gắn với lĩnh vực này. Lĩnh vực sẽ được chuyển sang trạng thái tạm ngừng để HR cân nhắc trước khi tắt.`}
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
