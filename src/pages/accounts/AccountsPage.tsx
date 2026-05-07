import { useState } from "react";
import {
  Alert,
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  CopyButton,
  Drawer,
  Group,
  Loader,
  Menu,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconDots,
  IconEye,
  IconKey,
  IconLock,
  IconLockOpen,
  IconRefresh,
  IconSearch,
  IconShield,
  IconTrash,
  IconUserCheck,
  IconUserOff,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth/useAuth";
import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { validatePasswordPolicy } from "../../features/auth/passwordPolicy";
import { AUTH_ADMIN_PERMISSIONS } from "../../features/auth/permissions";
import { AccountAuthorizationModal } from "../../features/auth-admin/AccountAuthorizationModal";
import { listAccountManagementRows } from "../../features/auth-admin/accountAuthorizationService";
import { useAccountAuthorization } from "../../features/auth-admin/useAccountAuthorization";
import {
  activateAccount,
  forceChangePassword,
  resetPassword,
  revokeSessions,
  softDeleteAccount,
  unlockAccount,
  lockAccount,
  deactivateAccount,
} from "../../features/auth-admin/authAdminApi";
import {
  ACCOUNT_STATE_COLOR,
  ACCOUNT_STATUS_LABELS,
  type AuthAdminUser,
  extractTemporaryPassword,
} from "../../features/auth-admin/authAdminTypes";
import type { AccountManagementRow } from "../../features/auth-admin/accountAuthorizationTypes";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { PageHeader } from "../../shared/components/PageHeader";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "PENDING_ACTIVATION", label: "Chờ kích hoạt" },
  { value: "LOCKED", label: "Bị khóa" },
  { value: "DISABLED", label: "Vô hiệu" },
  { value: "DEACTIVATED", label: "Đã vô hiệu" },
  { value: "SOFT_DELETED", label: "Đã xóa mềm" },
];

function accountDisplayName(row: AccountManagementRow) {
  return (
    row.employee?.fullName ??
    row.account.displayName ??
    row.account.username ??
    "-"
  );
}

function unitName(row: AccountManagementRow) {
  return (
    row.employee?.currentEmployeeAssignment?.unitName ??
    row.employee?.unitName ??
    "-"
  );
}

function departmentName(row: AccountManagementRow) {
  return (
    row.employee?.currentEmployeeAssignment?.departmentName ??
    row.employee?.departmentName ??
    "-"
  );
}

function firstLoginStatus(account: AuthAdminUser) {
  if (account.mustChangePassword) {
    return { color: "orange", label: "Phải đổi mật khẩu" };
  }

  if (!account.lastLoginAt) {
    return { color: "yellow", label: "Lần đăng nhập đầu tiên" };
  }

  return { color: "green", label: "Bình thường" };
}

function disabledTooltip(disabled: boolean) {
  return disabled ? "Bạn không có quyền thực hiện thao tác này" : "";
}

interface ResetPasswordFormState {
  autoGenerate: boolean;
  password: string;
  mustChangePassword: boolean;
  notifyUser: boolean;
}

interface ResetPasswordRevealState {
  temporaryPassword: string | null;
  mustChangePassword: boolean;
  accountEmail: string;
}

const DEFAULT_RESET_PASSWORD_FORM: ResetPasswordFormState = {
  autoGenerate: true,
  password: "",
  mustChangePassword: true,
  notifyUser: false,
};

export function AccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can, hasAnyPermission } = useAuth();

  const canReadAccounts = can(AUTH_ADMIN_PERMISSIONS.USERS_READ);
  const canResetPassword = hasAnyPermission([
    HR_PERMISSIONS.ACCOUNT_RESET_PASSWORD,
    AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
  ]);
  const canUpdateAccounts = hasAnyPermission([
    AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
    AUTH_ADMIN_PERMISSIONS.USERS_REVOKE_SESSIONS,
    AUTH_ADMIN_PERMISSIONS.USERS_SEND_ACTIVATION,
  ]);
  const canAuthorizeAccounts = hasAnyPermission([
    AUTH_ADMIN_PERMISSIONS.ROLES_ASSIGN,
    AUTH_ADMIN_PERMISSIONS.PERMISSIONS_ASSIGN,
    AUTH_ADMIN_PERMISSIONS.PERMISSION_GROUPS_ASSIGN,
    AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
  ]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    row: AccountManagementRow;
    label: string;
    color: string;
  } | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [resetForm, setResetForm] = useState<ResetPasswordFormState>(
    DEFAULT_RESET_PASSWORD_FORM,
  );
  const [resetResult, setResetResult] =
    useState<ResetPasswordRevealState | null>(null);
  const [selectedRow, setSelectedRow] = useState<AccountManagementRow | null>(
    null,
  );
  const [authorizationAccountId, setAuthorizationAccountId] = useState<
    string | null
  >(null);

  const [confirmOpened, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const [detailOpened, { open: openDetail, close: closeDetail }] =
    useDisclosure(false);
  const manualPasswordError =
    !resetForm.autoGenerate && resetForm.password
      ? validatePasswordPolicy(resetForm.password)
      : !resetForm.autoGenerate
        ? "Nhap mat khau tam thoi."
        : null;

  const accountsQuery = useQuery({
    queryKey: ["auth-admin-users", debouncedSearch, status, page],
    queryFn: () =>
      listAccountManagementRows({
        search: debouncedSearch || undefined,
        status: status || undefined,
        page,
        pageSize: 20,
      }),
    enabled: canReadAccounts,
  });

  const detailAuthorizationQuery = useAccountAuthorization(
    selectedRow?.account.authUserId ?? null,
    detailOpened,
  );
  const detailRoles =
    detailAuthorizationQuery.data?.roles ?? selectedRow?.roles ?? [];

  const invalidateList = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["auth-admin-users"] }),
      selectedRow?.account.authUserId
        ? queryClient.invalidateQueries({
            queryKey: ["account-authorization", selectedRow.account.authUserId],
          })
        : Promise.resolve(),
    ]);
  };

  const lifecycleMutation = useMutation({
    mutationFn: async ({
      type,
      userId,
      reason,
    }: {
      type: string;
      userId: string;
      reason: string;
    }) => {
      switch (type) {
        case "lock":
          return lockAccount(userId, reason);
        case "unlock":
          return unlockAccount(userId, reason);
        case "deactivate":
          return deactivateAccount(userId, reason);
        case "activate":
          return activateAccount(userId, reason);
        case "soft-delete":
          return softDeleteAccount(userId, reason);
        case "revoke-sessions":
          return revokeSessions(userId, reason);
        default:
          throw new Error("Hành động không hợp lệ");
      }
    },
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Thực hiện thành công." });
      await invalidateList();
      closeConfirm();
      setConfirmReason("");
      if (selectedRow) {
        await detailAuthorizationQuery.refetch();
      }
    },
    onError: (error: Error) => {
      notifications.show({ color: "red", message: error.message });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: {
        password?: string;
        autoGenerate: boolean;
        mustChangePassword: boolean;
        notifyUser: boolean;
        reason?: string;
      };
    }) => resetPassword(userId, payload),
    onSuccess: async (result, variables) => {
      await invalidateList();
      closeConfirm();
      setConfirmReason("");
      setResetForm(DEFAULT_RESET_PASSWORD_FORM);
      setResetResult({
        temporaryPassword: extractTemporaryPassword(result),
        mustChangePassword: result.mustChangePassword,
        accountEmail: confirmAction?.row.account.email ?? variables.userId,
      });
    },
    onError: (error: Error) => {
      notifications.show({ color: "red", message: error.message });
    },
  });

  const forceChangeMutation = useMutation({
    mutationFn: (userId: string) => forceChangePassword(userId),
    onSuccess: async () => {
      notifications.show({
        color: "green",
        message: "Đã bắt yêu cầu đổi mật khẩu.",
      });
      await invalidateList();
      if (selectedRow) {
        await detailAuthorizationQuery.refetch();
      }
    },
    onError: (error: Error) => {
      notifications.show({ color: "red", message: error.message });
    },
  });

  const handleAction = (
    type: string,
    row: AccountManagementRow,
    label: string,
    color = "blue",
  ) => {
    setConfirmAction({ type, row, label, color });
    setConfirmReason("");
    if (type === "reset-password") {
      setResetForm(DEFAULT_RESET_PASSWORD_FORM);
    }
    openConfirm();
  };

  const handleConfirm = () => {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === "reset-password") {
      if (manualPasswordError) {
        notifications.show({ color: "red", message: manualPasswordError });
        return;
      }

      resetPasswordMutation.mutate({
        userId: confirmAction.row.account.authUserId,
        payload: {
          autoGenerate: resetForm.autoGenerate,
          password: resetForm.autoGenerate ? undefined : resetForm.password,
          mustChangePassword: resetForm.mustChangePassword,
          notifyUser: resetForm.notifyUser,
          reason: confirmReason || undefined,
        },
      });
      return;
    }

    lifecycleMutation.mutate({
      type: confirmAction.type,
      userId: confirmAction.row.account.authUserId,
      reason: confirmReason,
    });
  };

  const columns: DataTableColumn<AccountManagementRow>[] = [
    {
      key: "account",
      header: "Mã nhân viên / username",
      render: (row) => (
        <Stack gap={2}>
          <Text fw={600} size="sm">
            {row.account.employeeCode ?? "-"}
          </Text>
          <Text size="xs" c="dimmed">
            {row.account.username ?? row.account.email}
          </Text>
        </Stack>
      ),
    },
    {
      key: "fullName",
      header: "Họ tên",
      render: (row) => <Text size="sm">{accountDisplayName(row)}</Text>,
    },
    {
      key: "email",
      header: "Email",
      render: (row) => <Text size="sm">{row.account.email}</Text>,
    },
    {
      key: "unit",
      header: "Đơn vị",
      render: (row) => <Text size="sm">{unitName(row)}</Text>,
    },
    {
      key: "department",
      header: "Phòng ban",
      render: (row) => <Text size="sm">{departmentName(row)}</Text>,
    },
    {
      key: "status",
      header: "Trạng thái tài khoản",
      render: (row) => (
        <Badge
          color={ACCOUNT_STATE_COLOR[row.account.accountState] ?? "gray"}
          variant="light"
          size="sm"
        >
          {ACCOUNT_STATUS_LABELS[row.account.accountState] ??
            row.account.accountState}
        </Badge>
      ),
    },
    {
      key: "roles",
      header: "Vai trò hiện tại",
      render: (row) => (
        <Group gap={4}>
          {row.roles.length === 0 ? (
            <Text size="sm" c="dimmed">
              -
            </Text>
          ) : (
            row.roles.slice(0, 2).map((role) => (
              <Badge key={role.code} size="sm" variant="light" color="blue">
                {role.code}
              </Badge>
            ))
          )}
          {row.roles.length > 2 ? (
            <Badge size="sm" variant="light" color="gray">
              +{row.roles.length - 2}
            </Badge>
          ) : null}
        </Group>
      ),
    },
    {
      key: "firstLogin",
      header: "Lần đầu / Phải đổi mật khẩu",
      render: (row) => {
        const state = firstLoginStatus(row.account);
        return (
          <Badge color={state.color} variant="light" size="sm">
            {state.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Group
          gap={4}
          justify="flex-end"
          onClick={(event) => event.stopPropagation()}
        >
          <Tooltip label="Xem chi tiet">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => {
                setSelectedRow(row);
                openDetail();
              }}
            >
              <IconEye size={15} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={disabledTooltip(!canAuthorizeAccounts)}>
            <span>
              <ActionIcon
                variant="subtle"
                size="sm"
                disabled={!canAuthorizeAccounts}
                onClick={() =>
                  setAuthorizationAccountId(row.account.authUserId)
                }
              >
                <IconShield size={15} />
              </ActionIcon>
            </span>
          </Tooltip>

          <Tooltip label={disabledTooltip(!canUpdateAccounts)}>
            <span>
              <Menu withinPortal position="bottom-end" shadow="sm">
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    disabled={!canUpdateAccounts}
                  >
                    <IconDots size={15} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Tài khoản</Menu.Label>

                  {row.account.accountState === "ACTIVE" ? (
                    <Menu.Item
                      leftSection={<IconLock size={14} />}
                      color="orange"
                      onClick={() =>
                        handleAction("lock", row, "Khóa tài khoản", "orange")
                      }
                    >
                      Khóa tài khoản
                    </Menu.Item>
                  ) : null}

                  {row.account.accountState === "LOCKED" ? (
                    <Menu.Item
                      leftSection={<IconLockOpen size={14} />}
                      color="green"
                      onClick={() =>
                        handleAction(
                          "unlock",
                          row,
                          "Mở khóa tài khoản",
                          "green",
                        )
                      }
                    >
                      Mở khóa
                    </Menu.Item>
                  ) : null}

                  {row.account.accountState === "ACTIVE" ? (
                    <Menu.Item
                      leftSection={<IconUserOff size={14} />}
                      color="red"
                      onClick={() =>
                        handleAction(
                          "deactivate",
                          row,
                          "Vô hiệu tài khoản",
                          "red",
                        )
                      }
                    >
                      Vô hiệu tài khoản
                    </Menu.Item>
                  ) : null}

                  {row.account.accountState === "DEACTIVATED" ||
                  row.account.accountState === "DISABLED" ? (
                    <Menu.Item
                      leftSection={<IconUserCheck size={14} />}
                      color="green"
                      onClick={() =>
                        handleAction(
                          "activate",
                          row,
                          "Kích hoạt lại tài khoản",
                          "green",
                        )
                      }
                    >
                      Kích hoạt lại
                    </Menu.Item>
                  ) : null}

                  {row.account.accountState !== "TOMBSTONED" ? (
                    <Menu.Item
                      leftSection={<IconTrash size={14} />}
                      color="red"
                      onClick={() =>
                        handleAction(
                          "soft-delete",
                          row,
                          "Xóa mềm tài khoản",
                          "red",
                        )
                      }
                    >
                      Xóa mềm
                    </Menu.Item>
                  ) : null}

                  <Menu.Divider />

                  <Menu.Item
                    leftSection={<IconKey size={14} />}
                    disabled={!canResetPassword}
                    onClick={() =>
                      handleAction(
                        "reset-password",
                        row,
                        "Đặt lại mật khẩu",
                        "blue",
                      )
                    }
                  >
                    Đặt lại mật khẩu
                  </Menu.Item>

                  <Menu.Item
                    leftSection={<IconRefresh size={14} />}
                    color="orange"
                    onClick={() =>
                      forceChangeMutation.mutate(row.account.authUserId)
                    }
                  >
                    Bắt đổi mật khẩu
                  </Menu.Item>

                  <Menu.Item
                    leftSection={<IconRefresh size={14} />}
                    onClick={() =>
                      handleAction(
                        "revoke-sessions",
                        row,
                        "Thu hồi phiên",
                        "gray",
                      )
                    }
                  >
                    Thu hồi phiên
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </span>
          </Tooltip>
        </Group>
      ),
    },
  ];

  return (
    <Stack gap="md">
      <PageHeader
        title="Quản lý tài khoản"
        subtitle="Quản trị tài khoản đăng nhập và phân quyền cho nhân sự"
        breadcrumbs={["Hệ thống", "Tài khoản"]}
      />

      <Group gap="sm">
        <TextInput
          placeholder="Tìm theo email, username, mã nhân sự..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
          w={360}
        />
        <Select
          data={STATUS_OPTIONS}
          value={status}
          onChange={(value) => {
            setStatus(value ?? "");
            setPage(1);
          }}
          w={220}
          clearable={false}
        />
      </Group>

      <DataTable
        data={accountsQuery.data?.data ?? []}
        columns={columns}
        rowKey={(row) => row.account.authUserId}
        meta={
          accountsQuery.data
            ? {
                total: accountsQuery.data.total,
                page: accountsQuery.data.page,
                pageSize: accountsQuery.data.pageSize,
                totalPages: accountsQuery.data.totalPages,
                hasNextPage:
                  accountsQuery.data.page < accountsQuery.data.totalPages,
                hasPreviousPage: accountsQuery.data.page > 1,
              }
            : undefined
        }
        loading={accountsQuery.isLoading}
        error={accountsQuery.error}
        emptyTitle="Không có tài khoản"
        emptyDescription="Chưa có tài khoản nào khớp với bộ lọc"
        onPageChange={(nextPage) => setPage(nextPage)}
        onRowClick={(row) => {
          if (row.employee?.id) {
            navigate(`/employees/${row.employee.id}`);
            return;
          }

          if (row.account.employeeCode) {
            navigate(`/employees?search=${row.account.employeeCode}`);
          }
        }}
      />

      <Modal
        opened={confirmOpened}
        onClose={() => {
          closeConfirm();
          setConfirmReason("");
          setResetForm(DEFAULT_RESET_PASSWORD_FORM);
        }}
        title={confirmAction?.label ?? "Xác nhân"}
        size="sm"
      >
        {confirmAction ? (
          <Stack>
            <Text size="sm">
              Thực hiện <strong>{confirmAction.label}</strong> cho tài khoản{" "}
              <strong>{confirmAction.row.account.email}</strong>?
            </Text>
            <TextInput
              label="Lý do (tùy chọn)"
              placeholder="Nhập lý do"
              value={confirmReason}
              onChange={(event) => setConfirmReason(event.currentTarget.value)}
            />
            {confirmAction.type === "reset-password" ? (
              <>
                <Checkbox
                  label="Tự sinh mật khẩu tạm"
                  checked={resetForm.autoGenerate}
                  onChange={(event) =>
                    setResetForm((current) => ({
                      ...current,
                      autoGenerate: event.currentTarget.checked,
                      password: event.currentTarget.checked
                        ? ""
                        : current.password,
                    }))
                  }
                />
                {!resetForm.autoGenerate ? (
                  <PasswordInput
                    label="Mật khẩu tạm thủ công"
                    placeholder="Dung 12 ky tu, co chu hoa, chu thuong, chu so, ky tu dac biet"
                    value={resetForm.password}
                    error={manualPasswordError ?? undefined}
                    onChange={(event) =>
                      setResetForm((current) => ({
                        ...current,
                        password: event.currentTarget.value,
                      }))
                    }
                  />
                ) : null}
                <Checkbox
                  label="Bắt buộc người dùng đổi mật khẩu ở lần đăng nhập tới"
                  checked={resetForm.mustChangePassword}
                  onChange={(event) =>
                    setResetForm((current) => ({
                      ...current,
                      mustChangePassword: event.currentTarget.checked,
                    }))
                  }
                />
                <Checkbox
                  label="Gửi thông báo/OTP/email cho người dùng"
                  checked={resetForm.notifyUser}
                  disabled
                  description="Flow gửi thông báo reset password chủ động chưa được hỗ trợ an toàn ở backend."
                />
                <Alert color="orange" variant="light">
                  Mật khẩu tạm chỉ hiển thị một lần trong modal kết quả. Đóng
                  modal là mất.
                </Alert>
              </>
            ) : null}
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => {
                  closeConfirm();
                  setConfirmReason("");
                  setResetForm(DEFAULT_RESET_PASSWORD_FORM);
                }}
              >
                Hủy
              </Button>
              <Button
                color={confirmAction.color}
                onClick={handleConfirm}
                loading={
                  lifecycleMutation.isPending || resetPasswordMutation.isPending
                }
              >
                Xác nhân
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>

      <Modal
        opened={Boolean(resetResult)}
        onClose={() => setResetResult(null)}
        title="Mật khẩu tạm thời"
        size="sm"
      >
        <Stack>
          <Text size="sm">
            Mật khẩu tạm thời đã được tạo. Vui lòng gửi cho người dùng qua kênh
            an toàn:
          </Text>
          <Text
            ff="monospace"
            fw={700}
            size="lg"
            ta="center"
            p="md"
            style={{ background: "#f8f9fa", borderRadius: 8 }}
          >
            {resetResult?.temporaryPassword ?? ""}
          </Text>
          <Button onClick={() => setResetResult(null)}>Đóng</Button>
          <Alert color="orange" variant="light">
            Mật khẩu chỉ hiển thị một lần cho{" "}
            {resetResult?.accountEmail ?? "người dùng"}.
          </Alert>
          {resetResult?.temporaryPassword ? (
            <CopyButton value={resetResult.temporaryPassword}>
              {({ copied, copy }) => (
                <Button
                  variant={copied ? "filled" : "light"}
                  color={copied ? "teal" : "blue"}
                  onClick={copy}
                >
                  {copied ? "Đã copy" : "Copy mật khẩu"}
                </Button>
              )}
            </CopyButton>
          ) : null}
          <Text size="sm" c="dimmed">
            {resetResult?.mustChangePassword
              ? "Người dùng sẽ phải đổi mật khẩu khi đăng nhập bằng mật khẩu này."
              : "Người dùng có thể dùng ngay mật khẩu này để vào hệ thống."}
          </Text>
        </Stack>
      </Modal>

      <Drawer
        opened={detailOpened}
        onClose={() => {
          closeDetail();
          setSelectedRow(null);
        }}
        title={
          selectedRow
            ? `Tài khoản: ${selectedRow.account.email}`
            : "Chi tiết tài khoản"
        }
        position="right"
        size="lg"
      >
        {selectedRow ? (
          <Stack>
            <Box>
              <Text size="xs" c="dimmed">
                Họ tên
              </Text>
              <Text size="sm">{accountDisplayName(selectedRow)}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">
                Mã nhân viên
              </Text>
              <Text size="sm">{selectedRow.account.employeeCode ?? "-"}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">
                Đơn vị / phòng ban
              </Text>
              <Text size="sm">
                {unitName(selectedRow)} / {departmentName(selectedRow)}
              </Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">
                Trạng thái
              </Text>
              <Badge
                color={
                  ACCOUNT_STATE_COLOR[selectedRow.account.accountState] ??
                  "gray"
                }
                variant="light"
              >
                {ACCOUNT_STATUS_LABELS[selectedRow.account.accountState] ??
                  selectedRow.account.accountState}
              </Badge>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">
                Vai trò hiện tại
              </Text>
              <Group gap={4}>
                {detailRoles.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    -
                  </Text>
                ) : (
                  detailRoles.map((role) => (
                    <Badge key={role.code} color="blue" variant="light">
                      {role.code}
                    </Badge>
                  ))
                )}
              </Group>
            </Box>

            <Group justify="space-between" mt="sm">
              <Text fw={600}>Quyền hiệu lực</Text>
              <Tooltip label={disabledTooltip(!canAuthorizeAccounts)}>
                <span>
                  <Button
                    size="xs"
                    leftSection={<IconShield size={14} />}
                    disabled={!canAuthorizeAccounts}
                    onClick={() =>
                      setAuthorizationAccountId(selectedRow.account.authUserId)
                    }
                  >
                    Phân quyền
                  </Button>
                </span>
              </Tooltip>
            </Group>

            {detailAuthorizationQuery.isLoading ? (
              <Group justify="center" py="lg">
                <Loader size="sm" />
              </Group>
            ) : detailAuthorizationQuery.data ? (
              <Stack gap="xs">
                {detailAuthorizationQuery.data.effectivePermissions.length ===
                0 ? (
                  <Text size="sm" c="dimmed">
                    Không có quyền hiệu lực nào.
                  </Text>
                ) : (
                  detailAuthorizationQuery.data.effectivePermissions.map(
                    (entry) => (
                      <Box
                        key={entry.permission.code}
                        p="sm"
                        style={{
                          border: "1px solid var(--mantine-color-gray-3)",
                          borderRadius: 8,
                        }}
                      >
                        <Text size="sm" fw={600}>
                          {entry.permission.code}
                        </Text>
                        <Group gap={4} mt={6}>
                          {entry.sources.map((source) => (
                            <Badge
                              key={`${source.type}-${source.id}-${source.code}`}
                              size="sm"
                              variant="light"
                            >
                              {source.type}: {source.code}
                            </Badge>
                          ))}
                        </Group>
                      </Box>
                    ),
                  )
                )}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                Không tải được thông tin quyền.
              </Text>
            )}
          </Stack>
        ) : null}
      </Drawer>

      <AccountAuthorizationModal
        accountId={authorizationAccountId}
        opened={Boolean(authorizationAccountId)}
        onClose={() => setAuthorizationAccountId(null)}
        onUpdated={async () => {
          await invalidateList();
          if (selectedRow?.account.authUserId === authorizationAccountId) {
            await detailAuthorizationQuery.refetch();
          }
        }}
      />
    </Stack>
  );
}
