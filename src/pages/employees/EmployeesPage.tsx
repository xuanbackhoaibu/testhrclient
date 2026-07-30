import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebouncedValue, useLocalStorage } from "@mantine/hooks";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Drawer,
  Group,
  Menu,
  Paper,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
  Alert,
  Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconArrowsSort,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconColumns3,
  IconEdit,
  IconEye,
  IconFilterOff,
  IconIdBadge2,
  IconPlus,
  IconSearch,
  IconUserCheck,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

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
import { compareCode } from "../../shared/utils/sort";

const employmentStatusOptions = [
  { value: "ACTIVE", label: "Đang làm việc" },
  { value: "PROBATION", label: "Thử việc" },
  { value: "SUSPENDED", label: "Tạm dừng" },
  { value: "TERMINATED", label: "Nghỉ việc" },
  { value: "RESIGNED", label: "Admin" },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const citizenIdPattern = /^(\d{9}|\d{12})$/;
const bioTimeCodePattern = /^[0-9A-Za-z_-]+$/;

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

type EmployeeQuickFilter =
  | "all"
  | "missingAccount"
  | "missingBioTime"
  | "probation"
  | "incompleteProfile";
type EmployeeSortKey =
  | "employeeCode"
  | "biotimeEmployeeCode"
  | "fullName";
type SortDirection = "asc" | "desc";
type EmployeeColumnKey =
  | "employeeCode"
  | "biotimeEmployeeCode"
  | "fullName"
  | "companyEmail"
  | "phone"
  | "employmentStatus"
  | "accountStatus"
  | "department"
  | "jobTitle"
  | "account_actions"
  | "actions";

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_KEY: EmployeeSortKey = "biotimeEmployeeCode";
const DEFAULT_SORT_DIRECTION: SortDirection = "asc";
const fixedEmployeeColumnKeys = new Set<EmployeeColumnKey>([
  "employeeCode",
  "fullName",
  "actions",
]);
const defaultVisibleEmployeeColumns: EmployeeColumnKey[] = [
  "biotimeEmployeeCode",
  "companyEmail",
  "phone",
  "employmentStatus",
  "accountStatus",
  "department",
  "jobTitle",
  "account_actions",
];
const employeeColumnOptions: Array<{ key: EmployeeColumnKey; label: string }> = [
  { key: "biotimeEmployeeCode", label: "Mã chấm công" },
  { key: "companyEmail", label: "Email" },
  { key: "phone", label: "SĐT" },
  { key: "employmentStatus", label: "TT nhân sự" },
  { key: "accountStatus", label: "TT tài khoản" },
  { key: "department", label: "Phòng ban" },
  { key: "jobTitle", label: "Chức danh" },
  { key: "account_actions", label: "Tài khoản" },
];
const employeeQuickFilters = new Set<EmployeeQuickFilter>([
  "all",
  "missingAccount",
  "missingBioTime",
  "probation",
  "incompleteProfile",
]);
const employeeSortKeys = new Set<EmployeeSortKey>([
  "employeeCode",
  "biotimeEmployeeCode",
  "fullName",
]);

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseQuickFilter(value: string | null): EmployeeQuickFilter {
  return employeeQuickFilters.has(value as EmployeeQuickFilter)
    ? (value as EmployeeQuickFilter)
    : "all";
}

function parseSortKey(value: string | null): EmployeeSortKey {
  return employeeSortKeys.has(value as EmployeeSortKey)
    ? (value as EmployeeSortKey)
    : DEFAULT_SORT_KEY;
}

function parseSortDirection(value: string | null): SortDirection {
  return value === "desc" ? "desc" : DEFAULT_SORT_DIRECTION;
}

function employeeHasAccount(record: Employee): boolean {
  return record.hasAccount ?? Boolean(record.authUserId);
}

function isEmployeeProfileIncomplete(record: Employee): boolean {
  return (
    !record.companyEmail ||
    !record.phone ||
    !record.currentEmployeeAssignment?.departmentId ||
    !record.currentEmployeeAssignment?.positionId
  );
}

function getEmployeeSortValue(employee: Employee, key: EmployeeSortKey) {
  switch (key) {
    case "employeeCode":
      return employee.employeeCode;
    case "biotimeEmployeeCode":
      return employee.biotimeEmployeeCode;
    case "fullName":
      return employee.fullName;
    default:
      return "";
  }
}

function compareEmployeeBySort(
  left: Employee,
  right: Employee,
  key: EmployeeSortKey,
) {
  if (key === "employeeCode" || key === "biotimeEmployeeCode") {
    return compareCode(getEmployeeSortValue(left, key), getEmployeeSortValue(right, key));
  }

  return String(getEmployeeSortValue(left, key) ?? "").localeCompare(
    String(getEmployeeSortValue(right, key) ?? ""),
    "vi",
    { sensitivity: "base" },
  );
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

function getBiotimeEmployeeCodeError(value: string): string | null {
  const code = trimOptional(value);
  if (!code) {
    return null;
  }
  return bioTimeCodePattern.test(code)
    ? null
    : "Mã chấm công chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.";
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") ?? "",
  );
  const [debouncedSearch] = useDebouncedValue(searchInput, 300);
  const [quickFilter, setQuickFilter] = useState<EmployeeQuickFilter>(() =>
    parseQuickFilter(searchParams.get("quick")),
  );
  const [sortKey, setSortKey] = useState<EmployeeSortKey>(() =>
    parseSortKey(searchParams.get("sort")),
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(() =>
    parseSortDirection(searchParams.get("dir")),
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = useLocalStorage<EmployeeColumnKey[]>({
    key: "hr-web-client.employee.visible-columns",
    defaultValue: defaultVisibleEmployeeColumns,
  });
  const [params, setParams] = useState(() => ({
    page: parsePositiveInteger(searchParams.get("page"), 1),
    pageSize: parsePositiveInteger(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
    employmentStatus: searchParams.get("status") ?? undefined,
    unitId: searchParams.get("unitId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
  }));

  const form = useForm<EmployeePayload>({
    initialValues: emptyEmployeeFormValues,
    validate: {
      employeeCode: (value) => {
        const employeeCode = trimOptional(value);
        return employeeCode && !/^[A-Za-z0-9_-]+$/.test(employeeCode)
          ? "Mã nhân sự chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới."
          : null;
      },
      fullName: (value) => (value.trim() ? null : "Nhập họ tên."),
      hireDate: (value) => (value ? null : "Chọn ngày vào làm."),
      employmentStatus: (value) => (value ? null : "Chọn trạng thái nhân sự."),
      unitId: (value) => (value ? null : "Vui lòng chọn đơn vị."),
      departmentId: (value) => (value ? null : "Vui lòng chọn phòng ban."),
      positionId: (value) => (value ? null : "Vui lòng chọn chức danh."),
      phone: (value) => {
        const phone = trimOptional(value);
        if (!phone) {
          return "Nhập số điện thoại.";
        }
        return /^0[0-9]{9}$/.test(phone)
          ? null
          : "Số điện thoại không đúng định dạng (VD: 0901234567).";
      },
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
      citizenId: (value) => {
        const citizenId = trimOptional(value);
        return citizenId && !citizenIdPattern.test(citizenId)
          ? "CCCD/CMND phải gồm 9 hoặc 12 số."
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
    search: debouncedSearch,
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
    mutationFn: () => downloadEmployeesExport({ ...params, search: debouncedSearch }),
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
    const biotimeError = getBiotimeEmployeeCodeError(biotimeEmployeeCode);
    if (biotimeError) {
      notifications.show({
        color: "red",
        title: "Cần kiểm tra lại thông tin",
        message: biotimeError,
      });
      return;
    }

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

  function handleEmployeeFormValidationFailure() {
    notifications.show({
      color: "red",
      title: "Cần kiểm tra lại thông tin",
      message: "Một số trường bắt buộc hoặc định dạng dữ liệu chưa hợp lệ.",
    });
  }

  // Mặc định sắp theo Mã chấm công; người dùng có thể đổi sort trên header.
  const sortedEmployees = useMemo(
    () =>
      [...(allEmployees ?? [])].sort((left, right) => {
        const result = compareEmployeeBySort(left, right, sortKey);
        return sortDirection === "asc" ? result : -result;
      }),
    [allEmployees, sortDirection, sortKey],
  );

  const employeeSummary = useMemo(() => {
    const employees = sortedEmployees;
    return {
      probation: employees.filter((employee) => employee.employmentStatus === "PROBATION").length,
      missingAccount: employees.filter((employee) => !employeeHasAccount(employee)).length,
      missingBioTime: employees.filter((employee) => !employee.biotimeEmployeeCode).length,
      incompleteProfile: employees.filter(isEmployeeProfileIncomplete).length,
    };
  }, [sortedEmployees]);

  const visibleEmployees = useMemo(() => {
    switch (quickFilter) {
      case "missingAccount":
        return sortedEmployees.filter((employee) => !employeeHasAccount(employee));
      case "missingBioTime":
        return sortedEmployees.filter((employee) => !employee.biotimeEmployeeCode);
      case "probation":
        return sortedEmployees.filter((employee) => employee.employmentStatus === "PROBATION");
      case "incompleteProfile":
        return sortedEmployees.filter(isEmployeeProfileIncomplete);
      case "all":
      default:
        return sortedEmployees;
    }
  }, [quickFilter, sortedEmployees]);

  // Phân trang ở client trên danh sách đã sắp xếp.
  const totalCount = visibleEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / params.pageSize));
  const currentPage = Math.min(params.page, totalPages);

  useEffect(() => {
    const next = new URLSearchParams();
    const search = debouncedSearch.trim();
    if (search) next.set("search", search);
    if (params.employmentStatus) next.set("status", params.employmentStatus);
    if (params.unitId) next.set("unitId", params.unitId);
    if (params.departmentId) next.set("departmentId", params.departmentId);
    if (quickFilter !== "all") next.set("quick", quickFilter);
    if (sortKey !== DEFAULT_SORT_KEY) next.set("sort", sortKey);
    if (sortDirection !== DEFAULT_SORT_DIRECTION) next.set("dir", sortDirection);
    if (currentPage > 1) next.set("page", String(currentPage));
    if (params.pageSize !== DEFAULT_PAGE_SIZE) {
      next.set("pageSize", String(params.pageSize));
    }
    setSearchParams(next, { replace: true });
  }, [
    currentPage,
    debouncedSearch,
    params.departmentId,
    params.employmentStatus,
    params.pageSize,
    params.unitId,
    quickFilter,
    setSearchParams,
    sortDirection,
    sortKey,
  ]);

  const pagedEmployees = useMemo(() => {
    const start = (currentPage - 1) * params.pageSize;
    return visibleEmployees.slice(start, start + params.pageSize);
  }, [visibleEmployees, currentPage, params.pageSize]);

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
    () => visibleEmployees.filter((emp) => selectedIds.has(emp.id)),
    [visibleEmployees, selectedIds],
  );

  const activeFilterCount = [
    debouncedSearch,
    params.employmentStatus,
    params.unitId,
    params.departmentId,
    quickFilter !== "all" ? quickFilter : undefined,
    sortKey !== DEFAULT_SORT_KEY ? sortKey : undefined,
    sortDirection !== DEFAULT_SORT_DIRECTION ? sortDirection : undefined,
  ].filter(Boolean).length;

  function clearListFilters() {
    setSearchInput("");
    setQuickFilter("all");
    setSortKey(DEFAULT_SORT_KEY);
    setSortDirection(DEFAULT_SORT_DIRECTION);
    setSelectedIds(new Set());
    setParams((current) => ({
      ...current,
      page: 1,
      employmentStatus: undefined,
      unitId: undefined,
      departmentId: undefined,
    }));
  }

  const updateSort = useCallback((nextKey: EmployeeSortKey) => {
    setSelectedIds(new Set());
    setParams((current) => ({ ...current, page: 1 }));
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }, [setParams, setSelectedIds, setSortDirection, setSortKey, sortKey]);

  const renderSortableHeader = useCallback((label: string, key: EmployeeSortKey) => {
    const active = sortKey === key;
    const Icon = active
      ? sortDirection === "asc"
        ? IconChevronUp
        : IconChevronDown
      : IconArrowsSort;

    return (
      <UnstyledButton
        className="employee-sort-header"
        data-active={active}
        onClick={() => updateSort(key)}
      >
        <Group gap={4} wrap="nowrap">
          <span>{label}</span>
          <Icon size={14} />
        </Group>
      </UnstyledButton>
    );
  }, [sortDirection, sortKey, updateSort]);

  function toggleColumn(key: EmployeeColumnKey) {
    setVisibleColumnKeys((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  }

  function resetColumns() {
    setVisibleColumnKeys(defaultVisibleEmployeeColumns);
  }

  const visibleColumnSet = useMemo(
    () => new Set<EmployeeColumnKey>(visibleColumnKeys),
    [visibleColumnKeys],
  );

  const allColumns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      {
        key: "employeeCode",
        header: renderSortableHeader("Mã NS", "employeeCode"),
        width: 110,
        render: (record) => record.employeeCode,
      },
      {
        key: "biotimeEmployeeCode",
        header: renderSortableHeader("Mã chấm công", "biotimeEmployeeCode"),
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
        header: renderSortableHeader("Họ tên", "fullName"),
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
      renderSortableHeader,
      setAccountDetailTarget,
      setProvisionTarget,
    ],
  );

  const columns = useMemo(
    () =>
      allColumns.filter((column) => {
        const key = column.key as EmployeeColumnKey;
        return fixedEmployeeColumnKeys.has(key) || visibleColumnSet.has(key);
      }),
    [allColumns, visibleColumnSet],
  );
  const formErrorMessages = Object.values(form.errors)
    .map((error) => String(error))
    .filter(Boolean);
  const biotimeEmployeeCodeError = getBiotimeEmployeeCodeError(biotimeEmployeeCode);

  return (
    <>
      <PageHeader
        title="Nhân sự"
        subtitle="Quản lý hồ sơ nhân sự, trạng thái làm việc và phân công hiện tại."
        actions={
          <Group gap="xs" wrap="wrap" className="employee-page-actions">
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
            {mayCreateEmployee ? (
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => void openCreateDrawer()}
              >
                Tạo nhân sự
              </Button>
            ) : null}
          </Group>
        }
      />

      <Stack gap="md">
        <Paper p="md" withBorder className="employee-filter-panel">
          <Stack gap="sm">
            <Group justify="space-between" align="center" className="employee-filter-header">
              <Stack gap={2}>
                <Text fw={700}>Bộ lọc danh sách</Text>
                <Text size="sm" c="dimmed">
                  Đang hiển thị {totalCount} nhân sự theo điều kiện hiện tại
                </Text>
              </Stack>
              <Group gap="xs" className="employee-filter-actions">
                <Menu position="bottom-end" width={220} closeOnItemClick={false}>
                  <Menu.Target>
                    <Button
                      variant="default"
                      leftSection={<IconColumns3 size={16} />}
                    >
                      Cột
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Hiển thị</Menu.Label>
                    {employeeColumnOptions.map((item) => (
                      <Menu.Item key={item.key} onClick={() => toggleColumn(item.key)}>
                        <Checkbox
                          checked={visibleColumnSet.has(item.key)}
                          label={item.label}
                          readOnly
                          size="xs"
                        />
                      </Menu.Item>
                    ))}
                    <Menu.Divider />
                    <Menu.Item onClick={resetColumns}>Mặc định</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={<IconFilterOff size={16} />}
                  disabled={activeFilterCount === 0}
                  onClick={clearListFilters}
                >
                  Xóa lọc
                </Button>
              </Group>
            </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
          <TextInput
            placeholder="Tìm tên, email, SĐT"
            leftSection={<IconSearch size={17} />}
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.currentTarget.value);
              setSelectedIds(new Set());
              setParams((current) => ({ ...current, page: 1 }));
            }}
          />
          <Select
            placeholder="Trạng thái"
            clearable
            data={employmentStatusOptions}
            value={params.employmentStatus ?? null}
            onChange={(value) => {
              setSelectedIds(new Set());
              setParams((current) => ({
                ...current,
                employmentStatus: value ?? undefined,
                page: 1,
              }));
            }}
          />
          <Select
            placeholder="Đơn vị"
            clearable
            data={unitOptions}
            disabled={unitsSelect.isLoading || unitsSelect.isError}
            nothingFoundMessage="Không có đơn vị active"
            value={params.unitId ?? null}
            onChange={(value) => {
              setSelectedIds(new Set());
              setParams((current) => ({
                ...current,
                unitId: value ?? undefined,
                departmentId: undefined,
                page: 1,
              }));
            }}
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
            onChange={(value) => {
              setSelectedIds(new Set());
              setParams((current) => ({
                ...current,
                departmentId: value ?? undefined,
                page: 1,
              }));
            }}
          />
        </SimpleGrid>

            <Box className="employee-quick-filter-scroll">
              <SegmentedControl
                value={quickFilter}
                onChange={(value) => {
                  setQuickFilter(value as EmployeeQuickFilter);
                  setSelectedIds(new Set());
                  setParams((current) => ({ ...current, page: 1 }));
                }}
                data={[
                  { value: "all", label: "Tất cả" },
                  {
                    value: "missingAccount",
                    label: `Chưa có TK (${employeeSummary.missingAccount})`,
                  },
                  {
                    value: "missingBioTime",
                    label: `Thiếu mã CC (${employeeSummary.missingBioTime})`,
                  },
                  {
                    value: "probation",
                    label: `Thử việc (${employeeSummary.probation})`,
                  },
                  {
                    value: "incompleteProfile",
                    label: `Thiếu hồ sơ (${employeeSummary.incompleteProfile})`,
                  },
                ]}
                className="employee-quick-filter"
                fullWidth
              />
            </Box>

            {selectedIds.size > 0 ? (
              <Group justify="space-between" className="employee-selection-bar">
                <Group gap="xs">
                  <ThemeIcon color="teal" variant="light" size="sm">
                    <IconIdBadge2 size={15} />
                  </ThemeIcon>
                  <Text size="sm" fw={600}>
                    Đã chọn {selectedIds.size} nhân sự
                  </Text>
                </Group>
                <Group gap="xs">
                  {mayProvisionAccounts ? (
                    <Button
                      size="xs"
                      color="teal"
                      variant="light"
                      leftSection={<IconUserCheck size={14} />}
                      onClick={() => setBulkProvisionOpen(true)}
                    >
                      Cấp tài khoản
                    </Button>
                  ) : null}
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Bỏ chọn
                  </Button>
                </Group>
              </Group>
            ) : null}
          </Stack>
        </Paper>

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
          emptyTitle={activeFilterCount > 0 ? "Không có nhân sự phù hợp" : "Chưa có nhân sự"}
          emptyDescription="Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại."
          maxHeight="calc(100vh - 360px)"
        />
      </Stack>

      <Drawer
        opened={open}
        onClose={closeEmployeeDrawer}
        title={editing ? "Sửa nhân sự" : "Tạo nhân sự"}
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit(submitEmployee, handleEmployeeFormValidationFailure)}>
          <Stack gap="sm">
            {formErrorMessages.length > 0 || biotimeEmployeeCodeError ? (
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertCircle size={18} />}
                title="Cần kiểm tra lại thông tin"
              >
                <Stack gap={4}>
                  {[...formErrorMessages, biotimeEmployeeCodeError]
                    .filter(Boolean)
                    .slice(0, 4)
                    .map((message) => (
                      <Text key={message} size="sm">
                        {message}
                      </Text>
                    ))}
                </Stack>
              </Alert>
            ) : null}

            <Divider label="Thông tin định danh" labelPosition="left" />
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
                placeholder={isLoadingNextCode ? "Đang lấy mã gợi ý..." : "HN000001"}
                disabled={isLoadingNextCode}
                error={form.errors.employeeCode ?? nextCodeError}
                {...form.getInputProps("employeeCode")}
              />
            )}
            <TextInput
              label="Mã chấm công BioTime/ZKTeco"
              placeholder="108"
              value={biotimeEmployeeCode}
              error={biotimeEmployeeCodeError}
              onChange={(e) => setBiotimeEmployeeCode(e.currentTarget.value)}
            />
            <Divider label="Thông tin cá nhân" labelPosition="left" />
            <TextInput
              label="Họ tên"
              withAsterisk
              {...form.getInputProps("fullName")}
            />
            <TextInput
              label="Email công ty"
              placeholder="ten@hacom.vn"
              {...form.getInputProps("companyEmail")}
            />
            <TextInput
              label="Email cá nhân"
              placeholder="ten@example.com"
              {...form.getInputProps("personalEmail")}
            />
            <TextInput
              label="Số điện thoại"
              placeholder="0901234567"
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
            <TextInput
              label="CCCD/CMND"
              placeholder="001234567890"
              {...form.getInputProps("citizenId")}
            />
            <Divider label="Phân công hiện tại" labelPosition="left" />
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
