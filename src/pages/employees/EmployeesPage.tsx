import { useCallback, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Drawer,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconEdit,
  IconEye,
  IconPlus,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { AUTH_ADMIN_PERMISSIONS, HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  createEmployee,
  getEmployeeById,
  getNextEmployeeCode,
  updateEmployee,
  updateEmployeeBioTimeCode,
} from "../../features/employees/employeesApi";
import type {
  Employee,
  EmployeePayload,
} from "../../features/employees/employeeTypes";
import type { PaginationMeta } from "../../shared/types/api";
import { useAllEmployees } from "../../features/employees/useEmployees";
import { AccountDetailDrawer } from "../../features/employees/AccountDetailDrawer";
import { BulkProvisionModal } from "../../features/employees/BulkProvisionModal";
import { ProvisionAccountModal } from "../../features/employees/ProvisionAccountModal";
import { DomainExcelImportModal } from "../../features/import-export/DomainExcelImportModal";
import { PostImportAccountModal } from "../../features/import-export/PostImportAccountModal";
import { downloadEmployeesExport } from "../../features/import-export/excelFilesApi";
import { ImportExportToolbar } from "../../features/import-export/ImportExportToolbar";
import { useHrmCoreTemplateDownload } from "../../features/import-export/useHrmCoreTemplateDownload";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { TableActionsMenu } from "../../shared/components/TableActionsMenu";
import { EllipsisText } from "../../shared/components/EllipsisText";
import { useDepartmentsSelect } from "../../features/organization/useDepartments";
import { usePositionsSelect } from "../../features/organization/usePositions";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { ApiError } from "../../shared/api/api.types";
import { debugPermissionCheck } from "../../shared/debug/hrmDebug";
import { sortByCode } from "../../shared/utils/sort";
import { NormalizedSearchInput } from "../../shared/components/NormalizedSearchInput";

const employmentStatusOptions = [
  { value: "ACTIVE", label: "Đang làm việc" },
  { value: "PROBATION", label: "Thử việc" },
  { value: "SUSPENDED", label: "Tạm dừng" },
  { value: "TERMINATED", label: "Nghỉ việc" },
  { value: "RESIGNED", label: "Admin" },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Canonical account-status vocabulary returned by the HR API. Kept separate
// from the shared StatusTag (whose ACTIVE label means "Đang làm việc") so the
// account column never mislabels an active account as an employment status.
const ACCOUNT_STATUS_COLORS: Record<string, string> = {
  NOT_CREATED: "gray",
  ACTIVE: "green",
  PENDING_ACTIVATION: "yellow",
  LOCKED: "orange",
  DISABLED: "red",
  DEACTIVATED: "red",
  TOMBSTONED: "dark",
  UNKNOWN: "gray",
};

const ACCOUNT_STATUS_FALLBACK_LABELS: Record<string, string> = {
  NOT_CREATED: "Chưa tạo",
  ACTIVE: "Đã cấp",
  PENDING_ACTIVATION: "Chờ kích hoạt",
  LOCKED: "Bị khóa",
  DISABLED: "Vô hiệu hóa",
  DEACTIVATED: "Vô hiệu hóa",
  TOMBSTONED: "Đã xóa",
  UNKNOWN: "Không rõ trạng thái",
};

function employeeHasAccount(record: Employee): boolean {
  return record.hasAccount ?? Boolean(record.authUserId);
}

function AccountStatusBadge({ record }: { record: Employee }) {
  const status = record.accountStatus ?? "NOT_CREATED";
  const label =
    record.accountDisplayStatus ??
    ACCOUNT_STATUS_FALLBACK_LABELS[status] ??
    status;
  return (
    <Badge
      color={ACCOUNT_STATUS_COLORS[status] ?? "gray"}
      variant="light"
      radius="sm"
    >
      {label}
    </Badge>
  );
}
const employeePayloadFields = new Set<keyof EmployeePayload>([
  "employeeCode",
  "fullName",
  "companyEmail",
  "personalEmail",
  "phone",
  "gender",
  "dateOfBirth",
  "hireDate",
  "employmentStatus",
  "citizenId",
  "unitId",
  "departmentId",
  "positionId",
]);

function TruncatedCell({
  value,
  maxWidth = 220,
}: {
  value?: string | null;
  maxWidth?: number;
}) {
  const display = value || "-";
  return (
    <EllipsisText maxWidth={maxWidth} className="truncate-cell">
      {display}
    </EllipsisText>
  );
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().slice(0, 10);
}

function trimOptional(value?: string) {
  return value?.trim() ?? "";
}

function normalizeEmployeePayload(values: EmployeePayload): EmployeePayload {
  const employeeCode = trimOptional(values.employeeCode).toUpperCase();
  return {
    ...values,
    employeeCode: employeeCode || undefined,
    fullName: values.fullName.trim(),
    companyEmail: trimOptional(values.companyEmail).toLowerCase() || undefined,
    personalEmail: trimOptional(values.personalEmail).toLowerCase() || undefined,
    phone: trimOptional(values.phone) || undefined,
    gender: trimOptional(values.gender),
    dateOfBirth: trimOptional(values.dateOfBirth),
    hireDate: values.hireDate.trim(),
    citizenId: trimOptional(values.citizenId),
    unitId: values.unitId.trim(),
    departmentId: values.departmentId.trim(),
    positionId: values.positionId.trim(),
  };
}

function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.errors[0]?.message ?? error.message;
  }
  return "Vui lòng kiểm tra dữ liệu và thử lại.";
}

const emptyEmployeeFormValues: EmployeePayload = {
  employeeCode: "",
  fullName: "",
  companyEmail: "",
  personalEmail: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  hireDate: "",
  employmentStatus: "ACTIVE",
  citizenId: "",
  unitId: "",
  departmentId: "",
  positionId: "",
};

export function EmployeesPage() {
  const navigate = useNavigate();
  const { can, permissions, roles } = useAuth();
  const mayCreateEmployee = can(HR_PERMISSIONS.EMPLOYEE_CREATE);
  const mayEditEmployee = can(HR_PERMISSIONS.EMPLOYEE_UPDATE);
  const mayImportEmployees = can(HR_PERMISSIONS.EMPLOYEE_IMPORT);
  const mayExportEmployees = can(HR_PERMISSIONS.EMPLOYEE_EXPORT);
  const mayReadAccounts = can(AUTH_ADMIN_PERMISSIONS.USERS_READ);
  const mayProvisionAccounts = can(AUTH_ADMIN_PERMISSIONS.USERS_PROVISION);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [postImport, setPostImport] = useState<{
    batchId: string;
    count: number;
  } | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [provisionTarget, setProvisionTarget] = useState<Employee | null>(null);
  const [accountDetailTarget, setAccountDetailTarget] = useState<Employee | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProvisionOpen, setBulkProvisionOpen] = useState(false);
  const [isLoadingNextCode, setIsLoadingNextCode] = useState(false);
  const [nextCodeError, setNextCodeError] = useState<string | null>(null);
  const [suggestedCode, setSuggestedCode] = useState("");
  const [biotimeEmployeeCode, setBiotimeEmployeeCode] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    employmentStatus: undefined as string | undefined,
    unitId: undefined as string | undefined,
    departmentId: undefined as string | undefined,
  });

  const form = useForm<EmployeePayload>({
    initialValues: emptyEmployeeFormValues,
    validate: {
      fullName: (value) => (value.trim() ? null : "Nhập họ tên."),
      hireDate: (value) => (value ? null : "Chọn ngày vào làm."),
      unitId: (value) => (value ? null : "Vui lòng chọn đơn vị."),
      departmentId: (value) => (value ? null : "Vui lòng chọn phòng ban."),
      positionId: (value) => (value ? null : "Vui lòng chọn chức danh."),
      phone: (value) =>
        trimOptional(value) && !/^0[0-9]{9}$/.test(trimOptional(value))
          ? "Số điện thoại không đúng định dạng (VD: 0901234567)."
          : null,
      companyEmail: (value) => {
        const companyEmail = trimOptional(value);
        return companyEmail && !emailPattern.test(companyEmail)
          ? "Email không đúng định dạng."
          : null;
      },
      personalEmail: (value) => {
        const personalEmail = trimOptional(value);
        return personalEmail && !emailPattern.test(personalEmail)
          ? "Email không đúng định dạng."
          : null;
      },
    },
  });

  // Lấy toàn bộ nhân sự theo bộ lọc (gộp mọi trang từ server) để có thể
  // sắp xếp theo Mã chấm công trên TOÀN danh sách rồi mới phân trang ở client.
  // Nhờ vậy trang 1 luôn bắt đầu từ mã chấm công nhỏ nhất.
  const { data: allEmployees, isLoading, error, refetch } = useAllEmployees({
    employmentStatus: params.employmentStatus,
    unitId: params.unitId,
    departmentId: params.departmentId,
    search: searchInput,
  });
  const unitsSelect = useUnitsSelect();
  const filterDepartmentsSelect = useDepartmentsSelect(params.unitId);
  const formDepartmentsSelect = useDepartmentsSelect(
    form.values.unitId || undefined,
  );
  const positionsSelect = usePositionsSelect();
  const templateDownload = useHrmCoreTemplateDownload("employees");

  const unitOptions = (unitsSelect.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name} (${item.code})`,
  }));
  const filterDepartmentOptions = (filterDepartmentsSelect.data ?? []).map(
    (item) => ({
      value: item.id,
      label: `${item.name} (${item.code})`,
    }),
  );
  const formDepartmentOptions = (formDepartmentsSelect.data ?? []).map(
    (item) => ({
      value: item.id,
      label: `${item.name} (${item.code})`,
    }),
  );
  const positionOptions = (positionsSelect.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name} (${item.code})`,
  }));

  const exportMutation = useMutation({
    mutationFn: () => downloadEmployeesExport({ ...params, search: searchInput }),
    onError: () => {
      notifications.show({
        color: "red",
        title: "Không xuất được Excel",
        message: "Vui lòng thử lại sau.",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: async (created) => {
      notifications.show({
        color: "green",
        title: "Đã tạo nhân sự",
        message: `Mã nhân sự: ${created.employeeCode}`,
      });
      setOpen(false);

      setNextCodeError(null);
      form.setValues(emptyEmployeeFormValues);
      form.resetDirty(emptyEmployeeFormValues);
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        error.errors.forEach((item) => {
          if (
            item.field &&
            employeePayloadFields.has(item.field as keyof EmployeePayload)
          ) {
            form.setFieldError(
              item.field as keyof EmployeePayload,
              item.message,
            );
          }
        });
      }
      notifications.show({
        color: "red",
        title: "Không tạo được nhân sự",
        message: getApiErrorMessage(error),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: EmployeePayload) => {
      if (!editing) {
        throw new Error("Missing editing employee");
      }
      return updateEmployee(editing.id, values);
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        title: "Đã cập nhật nhân sự",
        message: "Thông tin nhân sự và phân công chính đã được cập nhật.",
      });
      setOpen(false);
      setEditing(null);

      setNextCodeError(null);
      form.setValues(emptyEmployeeFormValues);
      form.resetDirty(emptyEmployeeFormValues);
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      await queryClient.invalidateQueries({ queryKey: ["employee-detail"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        error.errors.forEach((item) => {
          if (
            item.field &&
            employeePayloadFields.has(item.field as keyof EmployeePayload)
          ) {
            form.setFieldError(
              item.field as keyof EmployeePayload,
              item.message,
            );
          }
        });
      }
      notifications.show({
        color: "red",
        title: "Không cập nhật được nhân sự",
        message: getApiErrorMessage(error),
      });
    },
  });

  async function openCreateDrawer() {
    debugPermissionCheck({
      action: "employee.create",
      required: HR_PERMISSIONS.EMPLOYEE_CREATE,
      permissions,
      roles,
      allowed: mayCreateEmployee,
    });
    if (!mayCreateEmployee) {
      return;
    }

    setEditing(null);
    setNextCodeError(null);
    setBiotimeEmployeeCode("");
    form.setValues(emptyEmployeeFormValues);
    form.resetDirty(emptyEmployeeFormValues);
    setOpen(true);
    setIsLoadingNextCode(true);
    try {
      const result = await getNextEmployeeCode();
      const suggested = result.code ?? "";
      setSuggestedCode(suggested);
      form.setFieldValue("employeeCode", suggested);
    } catch (error) {
      setNextCodeError(getApiErrorMessage(error));
      notifications.show({
        color: "red",
        title: "Không lấy được mã nhân sự",
        message: getApiErrorMessage(error),
      });
    } finally {
      setIsLoadingNextCode(false);
    }
  }

  const openEditDrawer = useCallback(
    async (employeeId: string) => {
      debugPermissionCheck({
        action: "employee.update",
        required: HR_PERMISSIONS.EMPLOYEE_UPDATE,
        permissions,
        roles,
        allowed: mayEditEmployee,
      });
      if (!mayEditEmployee) {
        return;
      }
      const detail = await getEmployeeById(employeeId, {
        source: "EmployeesPage.openEditDrawer",
      });
      setEditing(detail);

      setNextCodeError(null);
      setBiotimeEmployeeCode(detail.biotimeEmployeeCode ?? "");
      const values: EmployeePayload = {
        fullName: detail.fullName,
        companyEmail: detail.companyEmail ?? "",
        personalEmail: detail.personalEmail ?? "",
        phone: detail.phone ?? "",
        gender: detail.gender ?? "",
        dateOfBirth: toDateInputValue(detail.dateOfBirth),
        hireDate: toDateInputValue(detail.hireDate),
        employmentStatus: detail.employmentStatus,
        citizenId: "",
        unitId: detail.currentEmployeeAssignment?.unitId ?? detail.unitId ?? "",
        departmentId:
          detail.currentEmployeeAssignment?.departmentId ??
          detail.departmentId ??
          "",
        positionId:
          detail.currentEmployeeAssignment?.positionId ??
          detail.positionId ??
          "",
      };
      form.setValues(values);
      form.resetDirty(values);
      setOpen(true);
    },
    [
      form,
      mayEditEmployee,
      permissions,
      roles,
      setBiotimeEmployeeCode,
      setNextCodeError,
      setOpen,
    ],
  );

  function closeEmployeeDrawer() {
    setOpen(false);
    setEditing(null);
    setNextCodeError(null);
    setSuggestedCode("");
    setBiotimeEmployeeCode("");
    form.setValues(emptyEmployeeFormValues);
    form.resetDirty(emptyEmployeeFormValues);
  }

  function submitEmployee(values: EmployeePayload) {
    const requiredPermission = editing
      ? HR_PERMISSIONS.EMPLOYEE_UPDATE
      : HR_PERMISSIONS.EMPLOYEE_CREATE;
    const allowed = editing ? mayEditEmployee : mayCreateEmployee;
    debugPermissionCheck({
      action: editing ? "employee.update" : "employee.create",
      required: requiredPermission,
      permissions,
      roles,
      allowed,
    });
    if (!allowed) {
      notifications.show({
        color: "red",
        title: "Không có quyền thao tác",
        message: editing
          ? "Bạn không có quyền sửa nhân sự."
          : "Bạn không có quyền tạo nhân sự.",
      });
      return;
    }

    const normalizedValues = normalizeEmployeePayload(values);
    form.setValues(normalizedValues);
    if (
      isLoadingNextCode ||
      unitsSelect.isLoading ||
      formDepartmentsSelect.isLoading ||
      positionsSelect.isLoading
    ) {
      notifications.show({
        color: "yellow",
        title: "Dữ liệu đang tải",
        message:
          "Vui lòng chờ tải xong mã nhân sự, đơn vị, phòng ban và chức danh.",
      });
      return;
    }
    if (
      unitsSelect.isError ||
      formDepartmentsSelect.isError ||
      positionsSelect.isError
    ) {
      notifications.show({
        color: "red",
        title: "Không tải được danh mục",
        message: "Vui lòng tải lại đơn vị, phòng ban và chức danh trước khi lưu.",
      });
      return;
    }

    if (editing) {
      updateMutation.mutate(normalizedValues, {
        onSuccess: async () => {
          // Also update BioTime code separately
          const newBioTimeCode = biotimeEmployeeCode.trim() || null;
          if (newBioTimeCode !== (editing.biotimeEmployeeCode ?? null)) {
            try {
              await updateEmployeeBioTimeCode(editing.id, newBioTimeCode);
              notifications.show({
                color: "green",
                title: "Đã cập nhật mã chấm công",
                message: newBioTimeCode
                  ? `Mã chấm công BioTime đã được cập nhật thành "${newBioTimeCode}".`
                  : "Đã xóa mã chấm công BioTime.",
              });
            } catch {
              // BioTime code update failed but main update succeeded
              notifications.show({
                color: "yellow",
                title: "Cập nhật nhân sự thành công nhưng chưa cập nhật được mã chấm công",
                message: "Vui lòng thử cập nhật mã chấm công lại sau.",
              });
            }
          }
        },
      });
      return;
    }
    // Trên form tạo, mã chấm công nằm ở state riêng — phải gửi kèm payload,
    // nếu không giá trị người dùng nhập sẽ bị bỏ im lặng.
    createMutation.mutate({
      ...normalizedValues,
      biotimeEmployeeCode: biotimeEmployeeCode.trim() || null,
    });
  }

  // Sắp xếp nhân sự theo Mã chấm công (BioTime) tăng dần từ 1 tới lớn nhất.
  // Nhân sự chưa có mã chấm công sẽ dồn xuống cuối danh sách.
  const sortedEmployees = useMemo(
    () => sortByCode(allEmployees, (emp) => emp.biotimeEmployeeCode),
    [allEmployees],
  );

  // Phân trang ở client trên danh sách đã sắp xếp.
  const totalCount = sortedEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / params.pageSize));
  const currentPage = Math.min(params.page, totalPages);

  const pagedEmployees = useMemo(() => {
    const start = (currentPage - 1) * params.pageSize;
    return sortedEmployees.slice(start, start + params.pageSize);
  }, [sortedEmployees, currentPage, params.pageSize]);

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

  const selectedEmployees = useMemo(
    () => sortedEmployees.filter((emp) => selectedIds.has(emp.id)),
    [sortedEmployees, selectedIds],
  );

  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      {
        key: "employeeCode",
        header: "Mã NS",
        width: 110,
        render: (record) => record.employeeCode,
      },
      {
        key: "biotimeEmployeeCode",
        header: "Mã chấm công",
        width: 100,
        align: "center",
        render: (record) => (
          <Text size="sm" c={record.biotimeEmployeeCode ? "blue" : "dimmed"}>
            {record.biotimeEmployeeCode ?? "—"}
          </Text>
        ),
      },
      {
        key: "fullName",
        header: "Họ tên",
        render: (record) => <TruncatedCell value={record.fullName} />,
      },
      {
        key: "companyEmail",
        header: "Email",
        render: (record) => (
          <TruncatedCell value={record.companyEmail} maxWidth={240} />
        ),
      },
      {
        key: "phone",
        header: "SDT",
        width: 130,
        render: (record) => record.phone || "-",
      },
      {
        key: "employmentStatus",
        header: "TT nhân sự",
        width: 150,
        render: (record) => <StatusTag status={record.employmentStatus} />,
      },
      {
        key: "accountStatus",
        header: "TT tài khoản",
        width: 150,
        render: (record) => <AccountStatusBadge record={record} />,
      },
      {
        key: "department",
        header: "Phòng ban",
        render: (record) => (
          <TruncatedCell
            value={record.currentEmployeeAssignment?.departmentName}
          />
        ),
      },
      {
        key: "jobTitle",
        header: "Chức danh",
        render: (record) => (
          <TruncatedCell value={record.currentEmployeeAssignment?.jobTitle} />
        ),
      },
      {
        key: "account_actions",
        header: "Tài khoản",
        width: 140,
        align: "center",
        render: (record) => {
          if (employeeHasAccount(record)) {
            if (!mayReadAccounts) return null;
            return (
              <Tooltip label="Xem tài khoản">
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconEye size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAccountDetailTarget(record);
                  }}
                >
                  Xem TK
                </Button>
              </Tooltip>
            );
          }
          if (!mayProvisionAccounts) return null;
          return (
            <Tooltip label="Cấp tài khoản đăng nhập">
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<IconUserCheck size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setProvisionTarget(record);
                }}
              >
                Cấp TK
              </Button>
            </Tooltip>
          );
        },
      },
      {
        key: "actions",
        header: "",
        width: 60,
        align: "right",
        render: (record) => (
          <TableActionsMenu
            actions={[
              {
                label: "Xem chi tiết",
                icon: <IconEye size={16} />,
                onClick: () => navigate(`/employees/${record.id}`),
              },
              ...(mayEditEmployee
                ? [
                    {
                      label: "Sửa nhân sự",
                      icon: <IconEdit size={16} />,
                      onClick: () => void openEditDrawer(record.id),
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ],
    [
      mayEditEmployee,
      mayReadAccounts,
      mayProvisionAccounts,
      navigate,
      openEditDrawer,
      setAccountDetailTarget,
      setProvisionTarget,
    ],
  );

  return (
    <>
      <PageHeader
        title="Nhân sự"
        subtitle="Quản lý hồ sơ nhân sự, trạng thái làm việc và phân công hiện tại."
        actions={
          <>
            <ImportExportToolbar
              onDownloadTemplate={templateDownload.downloadTemplate}
              onImport={
                mayImportEmployees ? () => setImportOpen(true) : undefined
              }
              onExport={() => exportMutation.mutateAsync()}
              isDownloadingTemplate={templateDownload.isDownloadingTemplate}
              isExporting={exportMutation.isPending}
              canImport={mayImportEmployees}
              canExport={mayExportEmployees}
            />
            {mayProvisionAccounts && selectedIds.size > 0 && (
              <Button
                leftSection={<IconUsers size={18} />}
                variant="light"
                color="teal"
                onClick={() => setBulkProvisionOpen(true)}
              >
                Cấp TK hàng loạt ({selectedIds.size})
              </Button>
            )}
            {mayCreateEmployee ? (
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => void openCreateDrawer()}
              >
                Tạo nhân sự
              </Button>
            ) : null}
          </>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
          <NormalizedSearchInput
            placeholder="Tìm tên, email, SĐT"
            value={searchInput}
            onChange={(value) => {
              setSearchInput(value);
              setParams((current) => ({ ...current, page: 1 }));
            }}
          />
          <Select
            placeholder="Trạng thái"
            clearable
            data={employmentStatusOptions}
            value={params.employmentStatus ?? null}
            onChange={(value) =>
              setParams((current) => ({
                ...current,
                employmentStatus: value ?? undefined,
                page: 1,
              }))
            }
          />
          <Select
            placeholder="Đơn vị"
            clearable
            data={unitOptions}
            disabled={unitsSelect.isLoading || unitsSelect.isError}
            nothingFoundMessage="Không có đơn vị active"
            value={params.unitId ?? null}
            onChange={(value) =>
              setParams((current) => ({
                ...current,
                unitId: value ?? undefined,
                departmentId: undefined,
                page: 1,
              }))
            }
          />
          <Select
            placeholder="Phòng ban"
            clearable
            data={filterDepartmentOptions}
            disabled={
              filterDepartmentsSelect.isLoading ||
              filterDepartmentsSelect.isError
            }
            nothingFoundMessage="Không có phòng ban active"
            value={params.departmentId ?? null}
            onChange={(value) =>
              setParams((current) => ({
                ...current,
                departmentId: value ?? undefined,
                page: 1,
              }))
            }
          />
        </SimpleGrid>

        <DataTable
          data={pagedEmployees}
          columns={columns}
          rowKey={(record) => record.id}
          meta={pagedMeta}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          onRowClick={(record) => navigate(`/employees/${record.id}`)}
          onPageChange={(page, pageSize) =>
            setParams((current) => ({ ...current, page, pageSize }))
          }
          selectedIds={mayProvisionAccounts ? selectedIds : undefined}
          onSelectionChange={mayProvisionAccounts ? setSelectedIds : undefined}
          emptyTitle="Chưa có nhân sự"
          emptyDescription="Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại."
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={closeEmployeeDrawer}
        title={editing ? "Sửa nhân sự" : "Tạo nhân sự"}
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit(submitEmployee)}>
          <Stack gap="sm">
            {editing ? (
              <TextInput
                label="Mã nhân sự"
                value={editing.employeeCode}
                readOnly
                disabled
              />
            ) : (
              <TextInput
                label="Mã nhân sự"
                description="Hệ thống tự sinh nếu để trống. Nhập để đặt mã thủ công (VD: HN000001)."
                placeholder={isLoadingNextCode ? "Đang lấy mã gợi ý..." : "HN000001"}
                disabled={isLoadingNextCode}
                error={form.errors.employeeCode ?? nextCodeError}
                {...form.getInputProps("employeeCode")}
              />
            )}
            <TextInput
              label="Mã chấm công BioTime/ZKTeco"
              description="Dùng để map dữ liệu chấm công từ BioTime. Ví dụ: 108, 1500. Không bắt buộc."
              placeholder="108"
              value={biotimeEmployeeCode}
              onChange={(e) => setBiotimeEmployeeCode(e.currentTarget.value)}
            />
            <TextInput
              label="Họ tên"
              withAsterisk
              {...form.getInputProps("fullName")}
            />
            <TextInput
              label="Email công ty"
              {...form.getInputProps("companyEmail")}
            />
            <TextInput
              label="Email cá nhân"
              {...form.getInputProps("personalEmail")}
            />
            <TextInput
              label="Số điện thoại"
              withAsterisk
              {...form.getInputProps("phone")}
            />
            <Select
              label="Giới tính"
              clearable
              data={[
                { value: "MALE", label: "Nam" },
                { value: "FEMALE", label: "Nữ" },
                { value: "OTHER", label: "Khác" },
              ]}
              {...form.getInputProps("gender")}
            />
            <TextInput
              label="Ngày sinh"
              type="date"
              {...form.getInputProps("dateOfBirth")}
            />
            <TextInput
              label="Ngày vào làm"
              type="date"
              withAsterisk
              {...form.getInputProps("hireDate")}
            />
            <Select
              label="Đơn vị"
              placeholder={
                unitsSelect.isLoading ? "Đang tải đơn vị..." : "Chọn đơn vị"
              }
              withAsterisk
              searchable
              data={unitOptions}
              disabled={unitsSelect.isLoading || unitsSelect.isError}
              nothingFoundMessage="Không có đơn vị active"
              value={form.values.unitId || null}
              error={form.errors.unitId}
              onChange={(value) => {
                form.setFieldValue("unitId", value ?? "");
                form.setFieldValue("departmentId", "");
                if (editing || !value) {
            
                  setNextCodeError(null);
                  setIsLoadingNextCode(false);
                  return;
                }
                setIsLoadingNextCode(true);
                setNextCodeError(null);
                void getNextEmployeeCode(value)
                  .then((result) => {
                    const suggested = result.employeeCode ?? "";
                    setSuggestedCode(suggested);
                    const current = form.values.employeeCode?.trim() ?? "";
                    if (!current || current === suggestedCode) {
                      form.setFieldValue("employeeCode", suggested);
                    }
                  })
                  .catch((error) => {
              
                    setNextCodeError(getApiErrorMessage(error));
                  })
                  .finally(() => {
                    setIsLoadingNextCode(false);
                  });
              }}
            />
            <Select
              label="Phòng ban"
              placeholder={
                form.values.unitId
                  ? "Chọn phòng ban"
                  : "Vui lòng chọn đơn vị trước"
              }
              withAsterisk
              searchable
              data={formDepartmentOptions}
              disabled={
                !form.values.unitId ||
                formDepartmentsSelect.isLoading ||
                formDepartmentsSelect.isError
              }
              nothingFoundMessage="Không có phòng ban active"
              value={form.values.departmentId || null}
              error={form.errors.departmentId}
              onChange={(value) =>
                form.setFieldValue("departmentId", value ?? "")
              }
            />
            <Select
              label="Chức danh"
              placeholder={
                positionsSelect.isLoading
                  ? "Đang tải chức danh..."
                  : "Chọn chức danh"
              }
              withAsterisk
              searchable
              data={positionOptions}
              disabled={positionsSelect.isLoading || positionsSelect.isError}
              nothingFoundMessage="Không có chức danh active"
              value={form.values.positionId || null}
              error={form.errors.positionId}
              onChange={(value) =>
                form.setFieldValue("positionId", value ?? "")
              }
            />
            <Select
              label="Trạng thái"
              withAsterisk
              data={employmentStatusOptions}
              {...form.getInputProps("employmentStatus")}
            />
            <TextInput label="CCCD" {...form.getInputProps("citizenId")} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeEmployeeDrawer}>
                Hủy
              </Button>
              <Button
                type="submit"
                loading={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  isLoadingNextCode
                }
                disabled={editing ? !mayEditEmployee : !mayCreateEmployee}
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
        title="Import Excel Nhân sự"
        module="employees"
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["employees"] })
        }
        onAfterCommit={(result) => {
          if (mayProvisionAccounts) {
            setPostImport({ batchId: result.batchId, count: 0 });
          }
        }}
      />

      {postImport && (
        <PostImportAccountModal
          open={true}
          batchId={postImport.batchId}
          importedCount={postImport.count}
          onClose={() => setPostImport(null)}
        />
      )}

      {provisionTarget && (
        <ProvisionAccountModal
          employee={provisionTarget}
          opened={Boolean(provisionTarget)}
          onClose={() => setProvisionTarget(null)}
        />
      )}

      {accountDetailTarget && (
        <AccountDetailDrawer
          employee={accountDetailTarget}
          opened={Boolean(accountDetailTarget)}
          onClose={() => setAccountDetailTarget(null)}
        />
      )}

      {bulkProvisionOpen && (
        <BulkProvisionModal
          employees={selectedEmployees}
          opened={bulkProvisionOpen}
          onClose={() => setBulkProvisionOpen(false)}
          onSuccess={() => {
            setSelectedIds(new Set());
            void queryClient.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}
    </>
  );
}
