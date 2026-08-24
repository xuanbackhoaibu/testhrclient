import {
  Button,
  Modal,
  Alert,
  Badge,
  Box,
  Center,
  Group,
  Loader,
  Pagination,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconShieldCheck, IconUserCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useBeforeUnload, useBlocker, useSearchParams } from "react-router-dom";

import { useAuth } from "../../features/auth/useAuth";
import { AUTH_ADMIN_PERMISSIONS } from "../../features/auth/permissions";
import {
  AccountAuthorizationPanel,
  type AccountAuthorizationTab,
} from "../../features/auth-admin/AccountAuthorizationModal";
import { listAccountManagementRows } from "../../features/auth-admin/accountAuthorizationService";
import type { AccountManagementRow } from "../../features/auth-admin/accountAuthorizationTypes";
import {
  ACCOUNT_STATE_COLOR,
  ACCOUNT_STATUS_LABELS,
} from "../../features/auth-admin/authAdminTypes";
import { NormalizedSearchInput } from "../../shared/components/NormalizedSearchInput";
import { PageHeader } from "../../shared/components/PageHeader";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "PENDING_ACTIVATION", label: "Chờ kích hoạt" },
  { value: "LOCKED", label: "Bị khóa" },
  { value: "DISABLED", label: "Vô hiệu" },
  { value: "DEACTIVATED", label: "Đã vô hiệu" },
  { value: "SOFT_DELETED", label: "Đã xóa mềm" },
];

function accountName(row: AccountManagementRow) {
  return (
    row.employee?.fullName ??
    row.account.displayName ??
    row.account.username ??
    row.account.email
  );
}

export function AccountAuthorizationsPage() {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const selectedAccountId = searchParams.get("accountId");
  const canReadAccounts = can(AUTH_ADMIN_PERMISSIONS.USERS_READ);
  const [activeTab, setActiveTab] = useState<AccountAuthorizationTab>("roles");
  const [dirty, setDirty] = useState(false);
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const allowAccountChangeRef = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!dirty || allowAccountChangeRef.current) return false;
    if (currentLocation.pathname !== nextLocation.pathname) return true;
    return (
      new URLSearchParams(currentLocation.search).get("accountId") !==
      new URLSearchParams(nextLocation.search).get("accountId")
    );
  });

  const updateQuery = (changes: Record<string, string | null>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      return next;
    }, { replace: true });
  };

  useBeforeUnload((event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  useEffect(() => {
    if (
      selectedAccountId &&
      window.matchMedia("(max-width: 61.99em)").matches
    ) {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      editorRef.current?.focus({ preventScroll: true });
    }
  }, [selectedAccountId]);

  const selectAccount = (accountId: string) => {
    if (accountId === selectedAccountId) return;
    if (dirty) {
      setPendingAccountId(accountId);
      return;
    }
    updateQuery({ accountId });
  };

  const discardAndContinue = () => {
    setDirty(false);
    if (pendingAccountId) {
      allowAccountChangeRef.current = true;
      updateQuery({ accountId: pendingAccountId });
      queueMicrotask(() => {
        allowAccountChangeRef.current = false;
      });
      setPendingAccountId(null);
      return;
    }
    if (blocker.state === "blocked") blocker.proceed();
  };

  const stayOnAccount = () => {
    setPendingAccountId(null);
    if (blocker.state === "blocked") blocker.reset();
  };

  const accountsQuery = useQuery({
    queryKey: ["auth-admin-users", search, status, page, 20],
    queryFn: () =>
      listAccountManagementRows({
        search: search || undefined,
        status: status || undefined,
        page,
        pageSize: 20,
      }),
    enabled: canReadAccounts,
  });

  return (
    <Stack gap="lg">
      <PageHeader
        title="Phân quyền tài khoản"
        subtitle="Chỉ Super Admin được gán vai trò, nhóm quyền hoặc quyền trực tiếp. Quyền báo cáo công việc được quản lý tại màn hình chuyên biệt."
      />

      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
          gap: "var(--mantine-spacing-lg)",
          alignItems: "start",
        }}
        className="account-authorization-layout"
      >
        <Paper
          ref={listRef}
          tabIndex={-1}
          aria-label="Danh sách tài khoản"
          withBorder
          radius="md"
          style={{ overflow: "hidden" }}
        >
          <Stack gap="sm" p="md">
            <Group gap="xs">
              <IconUserCheck size={20} color="var(--mantine-color-blue-6)" />
              <Title order={2} size="h4">
                Tài khoản
              </Title>
            </Group>
            <NormalizedSearchInput
              label="Tìm tài khoản"
              placeholder="Tên, email, tên đăng nhập hoặc mã nhân viên"
              value={search}
              onChange={(value) =>
                updateQuery({ q: value || null, page: null })
              }
            />
            <Select
              clearable
              label="Trạng thái"
              placeholder="Tất cả trạng thái"
              data={STATUS_OPTIONS}
              value={status || null}
              onChange={(value) =>
                updateQuery({ status: value, page: null })
              }
            />
          </Stack>

          <Box style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
            {accountsQuery.isLoading ? (
              <Center h={360}>
                <Loader size="sm" />
              </Center>
            ) : accountsQuery.error ? (
              <Alert color="red" m="md" title="Không thể tải tài khoản">
                {(accountsQuery.error as Error).message}
              </Alert>
            ) : accountsQuery.data?.data.length ? (
              <ScrollArea h={{ base: 340, md: 480 }} type="auto">
                {accountsQuery.data.data.map((row) => {
                  const selected =
                    row.account.authUserId === selectedAccountId;
                  return (
                    <UnstyledButton
                      key={row.account.authUserId}
                      w="100%"
                      p="md"
                      aria-pressed={selected}
                      onClick={() => selectAccount(row.account.authUserId)}
                      style={{
                        background: selected
                          ? "var(--mantine-color-blue-0)"
                          : "transparent",
                        borderBottom:
                          "1px solid var(--mantine-color-gray-2)",
                        boxShadow: selected
                          ? "inset 3px 0 0 var(--mantine-color-blue-6)"
                          : undefined,
                      }}
                    >
                      <Stack gap={5}>
                        <Group justify="space-between" wrap="nowrap" gap="xs">
                          <Text size="sm" fw={selected ? 700 : 600} truncate>
                            {accountName(row)}
                          </Text>
                          <Badge
                            size="xs"
                            variant="light"
                            color={
                              ACCOUNT_STATE_COLOR[
                                row.account.accountState
                              ] ?? "gray"
                            }
                          >
                            {ACCOUNT_STATUS_LABELS[
                              row.account.accountState
                            ] ?? row.account.accountState}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed" truncate>
                          {row.account.employeeCode ??
                            row.account.username ??
                            "Chưa có mã"}
                          {" · "}
                          {row.account.email}
                        </Text>
                      </Stack>
                    </UnstyledButton>
                  );
                })}
              </ScrollArea>
            ) : (
              <Center h={300} p="xl">
                <Text size="sm" c="dimmed" ta="center">
                  Không tìm thấy tài khoản phù hợp.
                </Text>
              </Center>
            )}
          </Box>

          {accountsQuery.data && accountsQuery.data.totalPages > 1 ? (
            <Group
              justify="center"
              p="md"
              style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
            >
              <Pagination
                size="sm"
                value={accountsQuery.data.page}
                total={accountsQuery.data.totalPages}
                onChange={(value) =>
                  updateQuery({ page: value === 1 ? null : String(value) })
                }
              />
            </Group>
          ) : null}
        </Paper>

        <Paper
          ref={editorRef}
          tabIndex={-1}
          aria-label="Cấu hình quyền của tài khoản đã chọn"
          withBorder
          radius="md"
          p={{ base: "md", md: "lg" }}
          mih={{ base: 480, md: 620 }}
        >
          {selectedAccountId ? (
            <Stack gap="md">
              <Button
                hiddenFrom="md"
                variant="light"
                size="xs"
                onClick={() => {
                  listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  listRef.current?.focus({ preventScroll: true });
                }}
                style={{ alignSelf: "flex-start" }}
              >
                Chọn tài khoản khác
              </Button>
              <AccountAuthorizationPanel
                key={selectedAccountId}
                accountId={selectedAccountId}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onDirtyChange={setDirty}
                onUpdated={async () => {
                  await accountsQuery.refetch();
                }}
              />
            </Stack>
          ) : (
            <Center mih={{ base: 420, md: 560 }}>
              <Stack align="center" gap="xs" maw={380} ta="center">
                <IconShieldCheck
                  size={44}
                  stroke={1.5}
                  color="var(--mantine-color-blue-6)"
                />
                <Title order={2} size="h4">
                  Chọn tài khoản để phân quyền
                </Title>
                <Text size="sm" c="dimmed">
                  Danh sách ở bên trái giúp chuyển nhanh giữa các tài khoản mà
                  không phải mở và đóng nhiều cửa sổ.
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>
      </Box>

      <Modal
        opened={Boolean(pendingAccountId) || blocker.state === "blocked"}
        onClose={stayOnAccount}
        title="Bỏ thay đổi chưa lưu?"
        centered
        size="sm"
      >
        <Stack>
          <Text size="sm">
            Các lựa chọn quyền chưa lưu của tài khoản hiện tại sẽ bị mất nếu bạn tiếp tục.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={stayOnAccount}>
              Tiếp tục chỉnh sửa
            </Button>
            <Button color="red" onClick={discardAndContinue}>
              Bỏ thay đổi
            </Button>
          </Group>
        </Stack>
      </Modal>

      <style>{`
        @media (max-width: 61.99em) {
          .account-authorization-layout {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </Stack>
  );
}
