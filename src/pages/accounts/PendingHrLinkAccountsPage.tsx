import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconEdit,
  IconLink,
  IconRefresh,
  IconSearch,
  IconUserOff,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AUTH_ADMIN_PERMISSIONS, HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  disablePendingHrLinkUser,
  getPendingHrLinkUsers,
  linkUserToEmployee,
  updateHrClaim,
} from "../../features/auth-admin/authAdminApi";
import {
  ACCOUNT_STATE_COLOR,
  ACCOUNT_STATUS_LABELS,
  type AuthAdminUser,
} from "../../features/auth-admin/authAdminTypes";
import { listEmployees } from "../../features/employees/employeesApi";
import type { Employee } from "../../features/employees/employeeTypes";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { PageHeader } from "../../shared/components/PageHeader";
import { useImeSafeSearch } from "../../shared/hooks/useImeSafeSearch";
import { useImeSafeSelectFilter } from "../../shared/hooks/useImeSafeSelectFilter";
import { sortByCode } from "../../shared/utils/sort";

const PAGE_SIZE = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ClaimFormState {
  claimedEmployeeCode: string;
  claimedEmail: string;
  reason: string;
}

interface LinkFormState {
  employeeSearch: string;
  selectedEmployeeCode: string | null;
  syncEmailFromHr: boolean;
  reason: string;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("vi-VN");
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function displayName(user: AuthAdminUser) {
  return user.displayName ?? user.username ?? "-";
}

function emailValue(user: AuthAdminUser) {
  return user.claimedEmail ?? user.email ?? "-";
}

function codeValue(user: AuthAdminUser) {
  return user.claimedEmployeeCode ?? user.employeeCode ?? "-";
}

function buildClaimForm(user: AuthAdminUser): ClaimFormState {
  return {
    claimedEmployeeCode: user.claimedEmployeeCode ?? "",
    claimedEmail: user.claimedEmail ?? user.email ?? "",
    reason: "",
  };
}

function employeeLabel(employee: Employee) {
  const email = employee.companyEmail ? ` · ${employee.companyEmail}` : "";
  const department =
    employee.currentEmployeeAssignment?.departmentName ??
    employee.departmentName ??
    "";
  const org = department ? ` · ${department}` : "";
  return `${employee.employeeCode} · ${employee.fullName}${email}${org}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function PendingHrLinkAccountsPage() {
  const selectSearch = useImeSafeSelectFilter();
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const canRead = can(AUTH_ADMIN_PERMISSIONS.USERS_READ);
  const canUpdateClaim = can(AUTH_ADMIN_PERMISSIONS.USERS_UPDATE);
  const canLink =
    can(AUTH_ADMIN_PERMISSIONS.USERS_PROVISION) && can(HR_PERMISSIONS.EMPLOYEE_READ);
  const canDisable = can(AUTH_ADMIN_PERMISSIONS.USERS_UPDATE);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pendingSearch = useImeSafeSearch({
    value: search,
    onSearch: (value) => {
      setSearch(value);
      setPage(1);
    },
  });

  const [claimUser, setClaimUser] = useState<AuthAdminUser | null>(null);
  const [claimForm, setClaimForm] = useState<ClaimFormState>({
    claimedEmployeeCode: "",
    claimedEmail: "",
    reason: "",
  });
  const [linkUser, setLinkUser] = useState<AuthAdminUser | null>(null);
  const [linkForm, setLinkForm] = useState<LinkFormState>({
    employeeSearch: "",
    selectedEmployeeCode: null,
    syncEmailFromHr: true,
    reason: "",
  });
  const [disableUser, setDisableUser] = useState<AuthAdminUser | null>(null);
  const [disableReason, setDisableReason] = useState("");

  const [claimOpened, { open: openClaim, close: closeClaim }] =
    useDisclosure(false);
  const [linkOpened, { open: openLink, close: closeLink }] =
    useDisclosure(false);
  const [disableOpened, { open: openDisable, close: closeDisable }] =
    useDisclosure(false);
  const employeeSearch = useImeSafeSearch({
    value: linkForm.employeeSearch,
    onSearch: (value) => setLinkForm((current) => ({ ...current, employeeSearch: value })),
  });

  const pendingQuery = useQuery({
    queryKey: [
      "admin",
      "users",
      "pending-hr-link",
      { search, page },
    ],
    queryFn: () =>
      getPendingHrLinkUsers({
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: canRead,
  });

  const employeeQuery = useQuery({
    queryKey: ["employees", "pending-hr-link-search", linkForm.employeeSearch],
    queryFn: () =>
      listEmployees({
        search: linkForm.employeeSearch || undefined,
        page: 1,
        pageSize: 10,
      }),
    enabled: linkOpened,
  });

  // This endpoint is paginated. Sort only the returned candidates here; the
  // canonical global employee order must be supplied by the backend.
  const employees = useMemo(
    () => sortByCode(employeeQuery.data?.items ?? employeeQuery.data?.data, (employee) => employee.employeeCode),
    [employeeQuery.data],
  );
  const selectedEmployee = useMemo(
    () =>
      employees.find(
        (employee) => employee.employeeCode === linkForm.selectedEmployeeCode,
      ) ?? null,
    [employees, linkForm.selectedEmployeeCode],
  );

  const invalidatePendingList = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", "pending-hr-link"],
      }),
      queryClient.invalidateQueries({ queryKey: ["auth-admin-users"] }),
    ]);
  };

  const updateClaimMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: {
        claimedEmployeeCode?: string | null;
        claimedEmail?: string | null;
        reason?: string;
      };
    }) => updateHrClaim(userId, payload),
    onSuccess: async () => {
      notifications.show({
        color: "green",
        message: "Đã cập nhật thông tin khai báo.",
      });
      closeClaim();
      setClaimUser(null);
      await invalidatePendingList();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: getErrorMessage(error, "Không thể cập nhật thông tin khai báo."),
      });
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({
      userId,
      employeeCode,
      syncEmailFromHr,
      reason,
      claimedEmployeeCode,
      claimedEmail,
    }: {
      userId: string;
      employeeCode: string;
      syncEmailFromHr: boolean;
      reason?: string;
      claimedEmployeeCode?: string | null;
      claimedEmail?: string | null;
    }) =>
      linkUserToEmployee(userId, {
        employeeCode,
        syncEmailFromHr,
        reason,
        claimedEmployeeCode,
        claimedEmail,
      }),
    onSuccess: async () => {
      notifications.show({
        color: "green",
        message: "Đã liên kết tài khoản với hồ sơ nhân sự.",
      });
      closeLink();
      setLinkUser(null);
      await invalidatePendingList();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: getErrorMessage(
          error,
          "Không thể liên kết hồ sơ nhân sự. Vui lòng kiểm tra xung đột.",
        ),
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      disablePendingHrLinkUser(userId, reason ? { reason } : undefined),
    onSuccess: async () => {
      notifications.show({
        color: "green",
        message: "Đã vô hiệu hóa tài khoản.",
      });
      closeDisable();
      setDisableUser(null);
      setDisableReason("");
      await invalidatePendingList();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: getErrorMessage(error, "Không thể vô hiệu hóa tài khoản."),
      });
    },
  });

  const openClaimModal = (user: AuthAdminUser) => {
    setClaimUser(user);
    setClaimForm(buildClaimForm(user));
    openClaim();
  };

  const openLinkModal = (user: AuthAdminUser) => {
    const searchTerm = user.claimedEmployeeCode ?? user.claimedEmail ?? user.email ?? "";
    setLinkUser(user);
    setLinkForm({
      employeeSearch: searchTerm,
      selectedEmployeeCode: null,
      syncEmailFromHr: true,
      reason: "",
    });
    openLink();
  };

  const openDisableModal = (user: AuthAdminUser) => {
    setDisableUser(user);
    setDisableReason("");
    openDisable();
  };

  const handleSaveClaim = () => {
    if (!claimUser) return;

    const claimedEmployeeCode = claimForm.claimedEmployeeCode.trim().toUpperCase();
    const claimedEmail = claimForm.claimedEmail.trim().toLowerCase();
    if (!claimedEmployeeCode && !claimedEmail) {
      notifications.show({
        color: "red",
        message: "Cần nhập mã nhân sự claim hoặc email claim.",
      });
      return;
    }
    if (claimedEmail && !EMAIL_RE.test(claimedEmail)) {
      notifications.show({ color: "red", message: "Email không đúng định dạng." });
      return;
    }

    updateClaimMutation.mutate({
      userId: claimUser.authUserId,
      payload: {
        claimedEmployeeCode: claimedEmployeeCode || null,
        claimedEmail: claimedEmail || null,
        reason: claimForm.reason.trim() || undefined,
      },
    });
  };

  const handleLink = () => {
    if (!linkUser || !selectedEmployee) {
      notifications.show({
        color: "red",
        message: "Vui lòng chọn hồ sơ nhân sự chính thức trước khi liên kết.",
      });
      return;
    }

    linkMutation.mutate({
      userId: linkUser.authUserId,
      employeeCode: selectedEmployee.employeeCode,
      syncEmailFromHr: linkForm.syncEmailFromHr,
      reason: linkForm.reason.trim() || undefined,
      claimedEmployeeCode: linkUser.claimedEmployeeCode ?? null,
      claimedEmail: linkUser.claimedEmail ?? null,
    });
  };

  const columns: DataTableColumn<AuthAdminUser>[] = [
    {
      key: "user",
      header: "User",
      minWidth: 180,
      render: (user) => (
        <Stack gap={2}>
          <Text size="sm" fw={600}>
            {displayName(user)}
          </Text>
          <Tooltip label={user.authUserId}>
            <Text size="xs" c="dimmed">
              {shortId(user.authUserId)}
            </Text>
          </Tooltip>
        </Stack>
      ),
    },
    {
      key: "claim",
      header: "Thông tin claim",
      minWidth: 220,
      render: (user) => (
        <Stack gap={2}>
          <Text size="sm">Mã NS: {codeValue(user)}</Text>
          <Text size="xs" c="dimmed">
            Email: {emailValue(user)}
          </Text>
        </Stack>
      ),
    },
    {
      key: "accountEmail",
      header: "Email tài khoản",
      minWidth: 180,
      render: (user) => <Text size="sm">{user.email ?? "-"}</Text>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (user) => (
        <Badge
          color={ACCOUNT_STATE_COLOR[user.accountState] ?? "yellow"}
          variant="light"
        >
          {ACCOUNT_STATUS_LABELS[user.accountState] ?? user.accountState}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Tạo / cập nhật",
      minWidth: 180,
      render: (user) => (
        <Stack gap={2}>
          <Text size="xs">Tạo: {formatDate(user.createdAt)}</Text>
          <Text size="xs" c="dimmed">
            Cập nhật: {formatDate(user.updatedAt)}
          </Text>
        </Stack>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (user) => (
        <Group gap={6} justify="flex-end" onClick={(event) => event.stopPropagation()}>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconEdit size={14} />}
            disabled={!canUpdateClaim}
            onClick={() => openClaimModal(user)}
          >
            Sửa claim
          </Button>
          <Button
            size="xs"
            leftSection={<IconLink size={14} />}
            disabled={!canLink}
            onClick={() => openLinkModal(user)}
          >
            Link nhân sự
          </Button>
          <Button
            size="xs"
            color="red"
            variant="light"
            leftSection={<IconUserOff size={14} />}
            disabled={!canDisable}
            onClick={() => openDisableModal(user)}
          >
            Disable
          </Button>
        </Group>
      ),
    },
  ];

  return (
    <Stack gap="md">
      <PageHeader
        title="Tài khoản chờ liên kết nhân sự"
        subtitle="Xác minh claim và liên kết tài khoản PENDING_HR_LINK với hồ sơ HRM chính thức"
        breadcrumbs={["Phân quyền", "Tài khoản chờ liên kết nhân sự"]}
      />

      <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
        Không tạo hồ sơ HR giả và không dùng mã/email claim làm identity chính thức.
        Chỉ liên kết khi đã chọn đúng hồ sơ nhân sự từ HRM và xác nhận lại thông tin.
      </Alert>

      <Group gap="sm">
        <TextInput
          placeholder="Tìm theo email, mã nhân sự claim, username..."
          leftSection={<IconSearch size={16} />}
          {...pendingSearch.inputProps}
          w={380}
        />
        <Button
          variant="default"
          leftSection={<IconRefresh size={16} />}
          onClick={() => pendingQuery.refetch()}
        >
          Tải lại
        </Button>
      </Group>

      <DataTable
        data={pendingQuery.data?.data ?? []}
        columns={columns}
        rowKey={(user) => user.authUserId}
        loading={pendingQuery.isLoading}
        error={pendingQuery.error}
        onRetry={() => pendingQuery.refetch()}
        emptyTitle="Không có tài khoản nào đang chờ liên kết nhân sự."
        emptyDescription="Danh sách sẽ có dữ liệu khi user đăng ký/login nhưng HRM chưa có hồ sơ tương ứng."
        meta={
          pendingQuery.data
            ? {
                total: pendingQuery.data.total,
                page: pendingQuery.data.page,
                pageSize: pendingQuery.data.pageSize,
                totalPages: pendingQuery.data.totalPages,
                hasNextPage: pendingQuery.data.page < pendingQuery.data.totalPages,
                hasPreviousPage: pendingQuery.data.page > 1,
              }
            : undefined
        }
        onPageChange={(nextPage) => setPage(nextPage)}
      />

      <Modal
        opened={claimOpened}
        onClose={() => {
          closeClaim();
          setClaimUser(null);
        }}
        title="Sửa thông tin khai báo"
        size="md"
      >
        {claimUser ? (
          <Stack>
            <Text size="sm">
              Chỉ cập nhật thông tin claim trong auth-service. Không cập nhật
              trực tiếp dữ liệu HRM.
            </Text>
            <TextInput
              label="Mã nhân sự claim"
              value={claimForm.claimedEmployeeCode}
              onChange={(event) =>
                setClaimForm((current) => ({
                  ...current,
                  claimedEmployeeCode: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Email claim"
              value={claimForm.claimedEmail}
              onChange={(event) =>
                setClaimForm((current) => ({
                  ...current,
                  claimedEmail: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Lý do (tùy chọn)"
              value={claimForm.reason}
              onChange={(event) =>
                setClaimForm((current) => ({
                  ...current,
                  reason: event.currentTarget.value,
                }))
              }
            />
            <Alert color="blue" variant="light">
              Xác nhận lưu sẽ thay đổi claim dùng để admin đối chiếu trước khi
              link. Tài khoản vẫn ở trạng thái PENDING_HR_LINK.
            </Alert>
            <Group justify="flex-end">
              <Button variant="default" onClick={closeClaim}>
                Hủy
              </Button>
              <Button
                onClick={handleSaveClaim}
                loading={updateClaimMutation.isPending}
              >
                Xác nhận lưu
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>

      <Modal
        opened={linkOpened}
        onClose={() => {
          closeLink();
          setLinkUser(null);
        }}
        title="Liên kết hồ sơ nhân sự"
        size="lg"
      >
        {linkUser ? (
          <Stack>
            <Box>
              <Text fw={600} size="sm">
                User pending
              </Text>
              <Text size="sm">Email claim: {emailValue(linkUser)}</Text>
              <Text size="sm">Mã nhân sự claim: {codeValue(linkUser)}</Text>
              <Text size="sm">Trạng thái: {linkUser.accountState}</Text>
            </Box>

            <TextInput
              label="Tìm hồ sơ nhân sự HRM"
              placeholder="Nhập mã nhân sự, email hoặc họ tên"
              leftSection={<IconSearch size={16} />}
              {...employeeSearch.inputProps}
            />
            <Select
              label="Hồ sơ nhân sự chính thức"
              searchable
              {...selectSearch}
              clearable
              placeholder={
                employeeQuery.isFetching
                  ? "Đang tìm..."
                  : "Chọn hồ sơ nhân sự"
              }
              data={employees.map((employee) => ({
                value: employee.employeeCode,
                label: employeeLabel(employee),
              }))}
              value={linkForm.selectedEmployeeCode}
              onChange={(value) =>
                setLinkForm((current) => ({
                  ...current,
                  selectedEmployeeCode: value,
                }))
              }
              nothingFoundMessage="Không tìm thấy hồ sơ HRM phù hợp"
            />

            {selectedEmployee ? (
              <Alert color="green" variant="light">
                <Text size="sm" fw={600}>
                  Hồ sơ HRM sẽ được liên kết
                </Text>
                <Text size="sm">Mã nhân sự: {selectedEmployee.employeeCode}</Text>
                <Text size="sm">Email HR: {selectedEmployee.companyEmail ?? "-"}</Text>
                <Text size="sm">Họ tên: {selectedEmployee.fullName}</Text>
                <Text size="sm">
                  Đơn vị/Phòng ban:{" "}
                  {selectedEmployee.currentEmployeeAssignment?.unitName ??
                    selectedEmployee.unitName ??
                    "-"}{" "}
                  /{" "}
                  {selectedEmployee.currentEmployeeAssignment?.departmentName ??
                    selectedEmployee.departmentName ??
                    "-"}
                </Text>
              </Alert>
            ) : null}

            <Checkbox
              label="Đồng bộ email tài khoản theo email chính thức từ HRM"
              checked={linkForm.syncEmailFromHr}
              onChange={(event) =>
                setLinkForm((current) => ({
                  ...current,
                  syncEmailFromHr: event.currentTarget.checked,
                }))
              }
            />
            <TextInput
              label="Lý do (tùy chọn)"
              value={linkForm.reason}
              onChange={(event) =>
                setLinkForm((current) => ({
                  ...current,
                  reason: event.currentTarget.value,
                }))
              }
            />
            <Alert color="orange" variant="light">
              Sau khi liên kết, tài khoản sẽ chuyển sang ACTIVE và dùng
              email/mã nhân sự chính thức từ HR. Hãy kiểm tra kỹ để tránh link
              nhầm nhân sự.
            </Alert>
            <Group justify="flex-end">
              <Button variant="default" onClick={closeLink}>
                Hủy
              </Button>
              <Button
                color="green"
                leftSection={<IconLink size={16} />}
                onClick={handleLink}
                loading={linkMutation.isPending}
                disabled={!selectedEmployee}
              >
                Xác nhận liên kết
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>

      <Modal
        opened={disableOpened}
        onClose={() => {
          closeDisable();
          setDisableUser(null);
        }}
        title="Vô hiệu hóa tài khoản"
        size="md"
      >
        {disableUser ? (
          <Stack>
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
              Bạn có chắc chắn muốn vô hiệu hóa tài khoản này?
              Tài khoản sẽ không thể đăng nhập/sử dụng hệ thống cho đến khi
              được xử lý lại. Thao tác này nên dùng cho tài khoản tạo nhầm,
              không hợp lệ hoặc không có hồ sơ HR tương ứng.
            </Alert>
            <Text size="sm">
              Tài khoản: <strong>{disableUser.email ?? disableUser.username}</strong>
            </Text>
            <TextInput
              label="Lý do (tùy chọn)"
              value={disableReason}
              onChange={(event) => setDisableReason(event.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDisable}>
                Hủy
              </Button>
              <Button
                color="red"
                onClick={() =>
                  disableMutation.mutate({
                    userId: disableUser.authUserId,
                    reason: disableReason.trim() || undefined,
                  })
                }
                loading={disableMutation.isPending}
              >
                Xác nhận vô hiệu hóa
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </Stack>
  );
}
