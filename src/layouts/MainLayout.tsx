import {
  AppShell,
  Avatar,
  Burger,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBriefcase,
  IconBuildingBank,
  IconCalendarCheck,
  IconCalendarTime,
  IconChevronDown,
  IconClipboardList,
  IconClock,
  IconDashboard,
  IconKey,
  IconLink,
  IconLogout,
  IconSettings,
  IconShield,
  IconShieldCheck,
  IconSitemap,
  IconTable,
  IconTransfer,
  IconUserCheck,
  IconUsers,
  IconArrowsSort,
  IconCalendarStats,
} from "@tabler/icons-react";
import { Fragment, Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../features/auth/useAuth";
import { canAccessRoute } from "../features/auth/routePolicies";
import { NotificationBell } from "../features/notifications/NotificationBell";
import { LoadingState } from "../shared/components/LoadingState";
import { BrandLogo } from "../shared/components/BrandLogo";
import { ROUTES } from "../shared/constants/routes";

interface NavItem {
  label: string;
  path: string;
  icon: typeof IconDashboard;
  /**
   * Tiêu đề nhóm hiện NGAY TRÊN mục này. Chỉ để phân tách thị giác — vẫn là
   * danh sách phẳng, một cú nhấn là tới, không phải menu lồng nhau.
   */
  sectionLabel?: string;
}

const primaryItems: NavItem[] = [
  { label: "Dashboard", path: ROUTES.dashboard, icon: IconDashboard },
  { label: "Nhân sự", path: ROUTES.employees, icon: IconUsers },
];

const preAttendanceItems: NavItem[] = [
  { label: "Điều chuyển", path: ROUTES.movements, icon: IconTransfer },
];

/*
 * Ba nhóm theo đúng việc HR làm, không trộn lẫn:
 *
 *   1. Khai báo ca   — dựng mẫu ca, dùng lại nhiều tháng
 *   2. Làm hằng tháng — gán ca cho người, chốt công, xử lý phép
 *   3. Cấu hình      — dựng một lần rồi hiếm khi đụng
 *
 * Vẫn là danh sách phẳng: `sectionLabel` chỉ thêm tiêu đề phân tách, không
 * biến thành menu lồng nhau bắt HR bấm hai lần mới tới nơi.
 */
const attendanceItems: NavItem[] = [
  {
    label: "Dữ liệu chấm công",
    path: ROUTES.attendance,
    icon: IconClipboardList,
    sectionLabel: "Dữ liệu máy chấm công",
  },
  // Xử lý mapping là việc sửa lỗi của chính dữ liệu máy chấm công. Trước đây
  // nó nằm NGOÀI nhóm Chấm công, hiện ngang hàng Dashboard — tách rời khỏi
  // đúng màn nó phục vụ.
  { label: "Xử lý mapping", path: ROUTES.attendanceMapping, icon: IconLink },
  {
    label: "Ca làm việc",
    path: ROUTES.workShifts,
    icon: IconClock,
    sectionLabel: "Khai báo ca",
  },
  { label: "Ca tuần", path: ROUTES.weeklyShifts, icon: IconCalendarTime },
  {
    label: "Phân ca",
    path: ROUTES.shiftAssignments,
    icon: IconCalendarTime,
    sectionLabel: "Làm hằng tháng",
  },
  { label: "Bảng công tháng", path: ROUTES.timesheetGrid, icon: IconTable },
  { label: "Nghỉ phép", path: ROUTES.leave, icon: IconCalendarCheck },
  {
    label: "Kỳ công",
    path: ROUTES.timesheetPeriods,
    icon: IconCalendarStats,
    sectionLabel: "Cấu hình",
  },
  {
    label: "Thứ tự nhân sự",
    path: ROUTES.attendanceRowOrder,
    icon: IconArrowsSort,
  },
  { label: "Ngày lễ", path: ROUTES.holidays, icon: IconCalendarCheck },
  {
    label: "Cấu hình duyệt phép",
    path: ROUTES.leaveApprovalAssignments,
    icon: IconUserCheck,
  },
];

const finalItems: NavItem[] = [
  // Keep global settings as the final action in the sidebar.
  { label: "Cài đặt", path: ROUTES.settings, icon: IconSettings },
];

const orgItems: NavItem[] = [
  { label: "Lĩnh vực", path: ROUTES.businessSectors, icon: IconBuildingBank },
  { label: "Đơn vị", path: ROUTES.units, icon: IconBuildingBank },
  { label: "Phòng ban", path: ROUTES.departments, icon: IconSitemap },
  { label: "Chức danh", path: ROUTES.positions, icon: IconBriefcase },
];

const iamItems: NavItem[] = [
  { label: "Danh sách tài khoản", path: ROUTES.accounts, icon: IconUserCheck },
  {
    label: "Tài khoản chờ liên kết",
    path: ROUTES.pendingHrLinkAccounts,
    icon: IconLink,
  },
  { label: "Vai trò", path: ROUTES.roles, icon: IconShield },
  { label: "Nhóm quyền", path: ROUTES.permissionGroups, icon: IconShield },
  { label: "Danh mục quyền", path: ROUTES.permissions, icon: IconKey },
  {
    label: "Phân quyền tài khoản",
    path: ROUTES.accountAuthorizations,
    icon: IconUserCheck,
  },
  {
    label: "Phân quyền báo cáo công việc",
    path: ROUTES.workReportAuthorizations,
    icon: IconClipboardList,
  },
];

const routeTitles: Record<string, string> = {
  [ROUTES.dashboard]: "Dashboard",
  [ROUTES.employees]: "Nhân sự",
  [ROUTES.businessSectors]: "Lĩnh vực",
  [ROUTES.units]: "Đơn vị",
  [ROUTES.departments]: "Phòng ban",
  [ROUTES.positions]: "Chức danh",
  [ROUTES.movements]: "Điều chuyển",
  [ROUTES.contracts]: "Hợp đồng",
  [ROUTES.leave]: "Nghỉ phép",
  [ROUTES.leaveApprovalAssignments]: "Cấu hình duyệt phép",
  [ROUTES.attendance]: "Chấm công",
  [ROUTES.attendanceMapping]: "Xử lý mapping",
  [ROUTES.monthlyTimesheetRoster]: "Sắp ca tháng",
  [ROUTES.timesheetGrid]: "Bảng công tháng",
  [ROUTES.timesheetPeriods]: "Kỳ công",
  [ROUTES.attendanceRowOrder]: "Thứ tự nhân sự",
  [ROUTES.workShifts]: "Ca làm việc",
  [ROUTES.weeklyShifts]: "Ca tuần",
  [ROUTES.holidays]: "Ngày lễ",
  [ROUTES.shiftAssignments]: "Phân ca",
  [ROUTES.onboarding]: "Onboarding",
  [ROUTES.offboarding]: "Offboarding",
  [ROUTES.imports]: "Imports",
  [ROUTES.auditLogs]: "Audit logs",
  [ROUTES.settings]: "Cài đặt",
  [ROUTES.accounts]: "Tài khoản",
  [ROUTES.pendingHrLinkAccounts]: "Tài khoản chờ liên kết nhân sự",
  [ROUTES.accountAuthorizations]: "Phân quyền tài khoản",
  [ROUTES.roles]: "Vai trò",
  [ROUTES.permissionGroups]: "Nhóm quyền",
  [ROUTES.permissions]: "Danh mục quyền",
  [ROUTES.workReportAuthorizations]: "Phân quyền báo cáo công việc",
  [ROUTES.myAccess]: "Quyền truy cập của tôi",
};

function isActive(pathname: string, path: string) {
  if (path === ROUTES.employees) {
    return pathname === path || pathname.startsWith("/employees/");
  }
  return pathname === path;
}

export function MainLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const visiblePrimaryItems = primaryItems.filter((item) =>
    canAccessRoute(user, item.path),
  );
  const visiblePreAttendanceItems = preAttendanceItems.filter((item) =>
    canAccessRoute(user, item.path),
  );
  const visibleAttendanceItems = attendanceItems.filter((item) =>
    canAccessRoute(user, item.path),
  );
  const visibleFinalItems = finalItems.filter((item) =>
    canAccessRoute(user, item.path),
  );
  const visibleOrgItems = orgItems.filter((item) =>
    canAccessRoute(user, item.path),
  );
  const visibleIamItems = iamItems.filter((item) =>
    canAccessRoute(user, item.path),
  );
  const visibleIamAccountItems = visibleIamItems.filter((item) =>
    item.path === ROUTES.accounts || item.path === ROUTES.pendingHrLinkAccounts,
  );
  const visibleIamCatalogItems = visibleIamItems.filter((item) =>
    item.path === ROUTES.roles ||
      item.path === ROUTES.permissionGroups ||
      item.path === ROUTES.permissions,
  );
  const visibleIamAuthorizationItems = visibleIamItems.filter((item) =>
    item.path === ROUTES.accountAuthorizations ||
      item.path === ROUTES.workReportAuthorizations,
  );

  const showOrganizationMenu = visibleOrgItems.length > 0;
  const showIamMenu = visibleIamItems.length > 0;
  const isIamRoute = visibleIamItems.some((item) =>
    isActive(location.pathname, item.path),
  );
  const isAttendanceRoute = visibleAttendanceItems.some((item) =>
    isActive(location.pathname, item.path),
  );
  const selectedPath = location.pathname.startsWith("/employees/")
    ? ROUTES.employees
    : location.pathname;

  function goTo(path: string) {
    navigate(path);
    close();
  }

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 232, breakpoint: "md", collapsed: { mobile: !opened } }}
      padding="md"
      bg="#f6f8fb"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="md"
              size="sm"
            />
            <Title order={1} size="h4">
              {routeTitles[selectedPath] ?? "HACOM HRM"}
            </Title>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <NotificationBell />
            <Menu position="bottom-end" shadow="md" width={230}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs" wrap="nowrap">
                    <Avatar size={28} radius="xl" color="blue">
                      {(user?.fullName ?? user?.email ?? "U")
                        .slice(0, 1)
                        .toUpperCase()}
                    </Avatar>
                    <Stack gap={0} visibleFrom="sm">
                      <Text size="sm" fw={600} maw={160} truncate>
                        {user?.fullName ?? "User"}
                      </Text>
                      <Text size="xs" c="dimmed" maw={160} truncate>
                        {user?.email ?? "-"}
                      </Text>
                    </Stack>
                    <IconChevronDown size={16} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Tài khoản</Menu.Label>
                <Menu.Item
                  leftSection={<IconShieldCheck size={16} />}
                  onClick={() => goTo(ROUTES.myAccess)}
                >
                  Quyền của tôi
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={16} />}
                  onClick={() => logout()}
                >
                  Đăng xuất
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="sm" h="100%">
          <Group px="xs">
            <BrandLogo compact />
          </Group>

          <ScrollArea flex={1}>
            <Stack gap={4}>
              {visiblePrimaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    label={item.label}
                    leftSection={<Icon size={18} />}
                    active={isActive(location.pathname, item.path)}
                    onClick={() => goTo(item.path)}
                    className="app-nav-link"
                  />
                );
              })}

              {showOrganizationMenu ? (
                <NavLink
                  label="Tổ chức"
                  leftSection={<IconBuildingBank size={18} />}
                  defaultOpened
                  className="app-nav-link"
                >
                  {visibleOrgItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        label={item.label}
                        leftSection={<Icon size={17} />}
                        active={isActive(location.pathname, item.path)}
                        onClick={() => goTo(item.path)}
                        className="app-nav-link"
                      />
                    );
                  })}
                </NavLink>
              ) : null}

              {showIamMenu ? (
                <NavLink
                  label="Phân quyền"
                  leftSection={<IconShield size={18} />}
                  defaultOpened={isIamRoute}
                  className="app-nav-link"
                >
                  <NavLink
                    label="Người dùng và tài khoản"
                    defaultOpened={visibleIamAccountItems
                      .some((item) => isActive(location.pathname, item.path))}
                  >
                    {visibleIamAccountItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          label={item.label}
                          leftSection={<Icon size={17} />}
                          active={isActive(location.pathname, item.path)}
                          onClick={() => goTo(item.path)}
                          className="app-nav-link"
                        />
                      );
                    })}
                  </NavLink>
                  <NavLink
                    label="Vai trò và quyền"
                    defaultOpened={visibleIamCatalogItems
                      .some((item) => isActive(location.pathname, item.path))}
                  >
                    {visibleIamCatalogItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          label={item.label}
                          leftSection={<Icon size={17} />}
                          active={isActive(location.pathname, item.path)}
                          onClick={() => goTo(item.path)}
                          className="app-nav-link"
                        />
                      );
                    })}
                  </NavLink>
                  {visibleIamAuthorizationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        label={item.path === ROUTES.workReportAuthorizations ? "Báo cáo công việc" : item.label}
                        leftSection={<Icon size={17} />}
                        active={isActive(location.pathname, item.path)}
                        onClick={() => goTo(item.path)}
                        className="app-nav-link"
                      />
                    );
                  })}
                </NavLink>
              ) : null}

              {visiblePreAttendanceItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    label={item.label}
                    leftSection={<Icon size={18} />}
                    active={isActive(location.pathname, item.path)}
                    onClick={() => goTo(item.path)}
                    className="app-nav-link"
                  />
                );
              })}

              {visibleAttendanceItems.length ? (
                <NavLink
                  label="Chấm công"
                  leftSection={<IconClipboardList size={18} />}
                  defaultOpened={isAttendanceRoute}
                  className="app-nav-link"
                >
                  {visibleAttendanceItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Fragment key={item.path}>
                        {item.sectionLabel ? (
                          <Text
                            fz={11}
                            fw={700}
                            c="dimmed"
                            pl="md"
                            pt={8}
                            pb={2}
                          >
                            {item.sectionLabel}
                          </Text>
                        ) : null}
                        <NavLink
                          label={item.label}
                          leftSection={<Icon size={17} />}
                          active={isActive(location.pathname, item.path)}
                          onClick={() => goTo(item.path)}
                          className="app-nav-link"
                        />
                      </Fragment>
                    );
                  })}
                </NavLink>
              ) : null}


              {visibleFinalItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    label={item.label}
                    leftSection={<Icon size={18} />}
                    active={isActive(location.pathname, item.path)}
                    onClick={() => goTo(item.path)}
                    className="app-nav-link"
                  />
                );
              })}
            </Stack>
          </ScrollArea>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Suspense fallback={<LoadingState tip="Đang tải màn hình..." />}>
          <Outlet />
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}
