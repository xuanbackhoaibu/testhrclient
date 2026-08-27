import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Group,
  Image,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
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
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
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
  IconChecklist,
} from "@tabler/icons-react";
import { Suspense } from "react";
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
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const primaryItems: NavItem[] = [
  { label: "Dashboard", path: ROUTES.dashboard, icon: IconDashboard },
  { label: "Nhân sự", path: ROUTES.employees, icon: IconUsers },
];

const preAttendanceItems: NavItem[] = [
  { label: "Điều chuyển", path: ROUTES.movements, icon: IconTransfer },
];

/* Bốn nhóm theo đúng thứ tự HR vận hành, mỗi nhóm có thể thu gọn độc lập. */
const attendanceSections: NavSection[] = [
  {
    label: "Quy trình chấm công",
    items: [
      {
        label: "Xếp lịch làm việc",
        path: ROUTES.shiftAssignments,
        icon: IconCalendarTime,
      },
      { label: "Bảng chấm công", path: ROUTES.timesheetGrid, icon: IconTable },
      {
        label: "Duyệt công ca phép",
        path: ROUTES.approvalInbox,
        icon: IconChecklist,
      },
      {
        label: "Kỳ chốt công",
        path: ROUTES.timesheetPeriods,
        icon: IconCalendarStats,
      },
      {
        label: "Bảng phép năm",
        path: ROUTES.annualLeaveBalances,
        icon: IconCalendarStats,
      },
    ],
  },
  {
    label: "Thiết lập",
    items: [
      { label: "Ca làm việc", path: ROUTES.workShifts, icon: IconClock },
      { label: "Loại nghỉ phép", path: ROUTES.leave, icon: IconCalendarCheck },
      {
        label: "Mẫu lịch tuần",
        path: ROUTES.weeklyShifts,
        icon: IconCalendarTime,
      },
    ],
  },
  {
    label: "Máy chấm công",
    items: [
      {
        label: "Dữ liệu chấm công",
        path: ROUTES.attendance,
        icon: IconClipboardList,
      },
      {
        label: "Đối soát dữ liệu",
        path: ROUTES.attendanceMapping,
        icon: IconLink,
      },
    ],
  },
  {
    label: "Cấu hình",
    items: [
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
    ],
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
  [ROUTES.leave]: "Loại nghỉ phép",
  [ROUTES.leaveApprovalAssignments]: "Cấu hình duyệt phép",
  [ROUTES.attendance]: "Dữ liệu chấm công",
  [ROUTES.attendanceMapping]: "Đối soát dữ liệu",
  [ROUTES.monthlyTimesheetRoster]: "Sắp ca tháng",
  [ROUTES.timesheetGrid]: "Bảng chấm công",
  [ROUTES.approvalInbox]: "Duyệt công ca phép",
  [ROUTES.annualLeaveBalances]: "Bảng phép năm",
  [ROUTES.timesheetPeriods]: "Kỳ chốt công",
  [ROUTES.attendanceRowOrder]: "Thứ tự nhân sự",
  [ROUTES.workShifts]: "Ca làm việc",
  [ROUTES.weeklyShifts]: "Mẫu lịch tuần",
  [ROUTES.holidays]: "Ngày lễ",
  [ROUTES.shiftAssignments]: "Xếp lịch làm việc",
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
  const [desktopCollapsed, setDesktopCollapsed] = useLocalStorage({
    key: "hr-web-client.sidebar-collapsed",
    defaultValue: false,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const visiblePrimaryItems = primaryItems.filter((item) =>
    canAccessRoute(user, item.path),
  );
  const visiblePreAttendanceItems = preAttendanceItems.filter((item) =>
    canAccessRoute(user, item.path),
  );
  const visibleAttendanceSections = attendanceSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessRoute(user, item.path)),
    }))
    .filter((section) => section.items.length > 0);
  const visibleAttendanceItems = visibleAttendanceSections.flatMap(
    (section) => section.items,
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
  const visibleIamAccountItems = visibleIamItems.filter(
    (item) =>
      item.path === ROUTES.accounts ||
      item.path === ROUTES.pendingHrLinkAccounts,
  );
  const visibleIamCatalogItems = visibleIamItems.filter(
    (item) =>
      item.path === ROUTES.roles ||
      item.path === ROUTES.permissionGroups ||
      item.path === ROUTES.permissions,
  );
  const visibleIamAuthorizationItems = visibleIamItems.filter(
    (item) =>
      item.path === ROUTES.accountAuthorizations ||
      item.path === ROUTES.workReportAuthorizations,
  );

  const showOrganizationMenu = visibleOrgItems.length > 0;
  const showIamMenu = visibleIamItems.length > 0;
  const isOrgActive = visibleOrgItems.some((item) =>
    isActive(location.pathname, item.path),
  );
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
      layout="alt"
      header={{ height: 56 }}
      navbar={{
        width: desktopCollapsed ? 64 : 256,
        breakpoint: "md",
        collapsed: { mobile: !opened },
      }}
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

      <AppShell.Navbar p={desktopCollapsed ? "xs" : "md"}>
        <Stack gap="sm" h="100%" align={desktopCollapsed ? "center" : "stretch"}>
          {desktopCollapsed ? (
            <Stack align="center" gap={10} w="100%" pt={4}>
              <Image src="/logo.png" w={28} h={28} fit="contain" alt="HACOM" />
              <Tooltip label="Mở rộng thanh bên" withArrow position="right" openDelay={200}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  radius="md"
                  aria-label="Mở rộng thanh bên"
                  className="gemini-sidebar-toggle-btn"
                  onClick={() => setDesktopCollapsed(false)}
                >
                  <IconLayoutSidebarLeftExpand size={20} stroke={1.75} />
                </ActionIcon>
              </Tooltip>
            </Stack>
          ) : (
            <Group px="xs" justify="space-between" wrap="nowrap">
              <BrandLogo compact />
              <Tooltip label="Đóng thanh bên" withArrow position="right" openDelay={200}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  radius="md"
                  aria-label="Đóng thanh bên"
                  className="gemini-sidebar-toggle-btn"
                  onClick={() => {
                    setDesktopCollapsed(true);
                    close();
                  }}
                >
                  <IconLayoutSidebarLeftCollapse size={20} stroke={1.75} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}

          <ScrollArea flex={1} type="never" style={{ width: "100%" }}>
            <Stack gap={4} align={desktopCollapsed ? "center" : "stretch"}>
              {visiblePrimaryItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(location.pathname, item.path);
                if (desktopCollapsed) {
                  return (
                    <Tooltip key={item.path} label={item.label} position="right" withArrow openDelay={150}>
                      <ActionIcon
                        variant={active ? "light" : "subtle"}
                        color={active ? "blue" : "gray"}
                        size={38}
                        radius="md"
                        onClick={() => goTo(item.path)}
                      >
                        <Icon size={20} />
                      </ActionIcon>
                    </Tooltip>
                  );
                }
                return (
                  <NavLink
                    key={item.path}
                    label={item.label}
                    leftSection={<Icon size={18} />}
                    active={active}
                    onClick={() => goTo(item.path)}
                    className="app-nav-link"
                  />
                );
              })}

              {showOrganizationMenu ? (
                desktopCollapsed ? (
                  <Menu position="right-start" withArrow shadow="md" width={200} trigger="hover" openDelay={100}>
                    <Menu.Target>
                      <ActionIcon
                        variant={isOrgActive ? "light" : "subtle"}
                        color={isOrgActive ? "blue" : "gray"}
                        size={38}
                        radius="md"
                      >
                        <IconBuildingBank size={20} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Tổ chức</Menu.Label>
                      {visibleOrgItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Menu.Item
                            key={item.path}
                            leftSection={<Icon size={16} />}
                            onClick={() => goTo(item.path)}
                            color={isActive(location.pathname, item.path) ? "blue" : undefined}
                          >
                            {item.label}
                          </Menu.Item>
                        );
                      })}
                    </Menu.Dropdown>
                  </Menu>
                ) : (
                  <NavLink
                    label="Tổ chức"
                    leftSection={<IconBuildingBank size={18} />}
                    defaultOpened={isOrgActive}
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
                )
              ) : null}

              {showIamMenu ? (
                desktopCollapsed ? (
                  <Menu position="right-start" withArrow shadow="md" width={220} trigger="hover" openDelay={100}>
                    <Menu.Target>
                      <ActionIcon
                        variant={isIamRoute ? "light" : "subtle"}
                        color={isIamRoute ? "blue" : "gray"}
                        size={38}
                        radius="md"
                      >
                        <IconShield size={20} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Phân quyền</Menu.Label>
                      {visibleIamItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Menu.Item
                            key={item.path}
                            leftSection={<Icon size={16} />}
                            onClick={() => goTo(item.path)}
                            color={isActive(location.pathname, item.path) ? "blue" : undefined}
                          >
                            {item.label}
                          </Menu.Item>
                        );
                      })}
                    </Menu.Dropdown>
                  </Menu>
                ) : (
                  <NavLink
                    label="Phân quyền"
                    leftSection={<IconShield size={18} />}
                    defaultOpened={isIamRoute}
                    className="app-nav-link"
                  >
                    <NavLink
                      label="Người dùng và tài khoản"
                      defaultOpened={visibleIamAccountItems.some((item) =>
                        isActive(location.pathname, item.path),
                      )}
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
                      defaultOpened={visibleIamCatalogItems.some((item) =>
                        isActive(location.pathname, item.path),
                      )}
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
                          label={
                            item.path === ROUTES.workReportAuthorizations
                              ? "Báo cáo công việc"
                              : item.label
                          }
                          leftSection={<Icon size={17} />}
                          active={isActive(location.pathname, item.path)}
                          onClick={() => goTo(item.path)}
                          className="app-nav-link"
                        />
                      );
                    })}
                  </NavLink>
                )
              ) : null}

              {visiblePreAttendanceItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(location.pathname, item.path);
                if (desktopCollapsed) {
                  return (
                    <Tooltip key={item.path} label={item.label} position="right" withArrow openDelay={150}>
                      <ActionIcon
                        variant={active ? "light" : "subtle"}
                        color={active ? "blue" : "gray"}
                        size={38}
                        radius="md"
                        onClick={() => goTo(item.path)}
                      >
                        <Icon size={20} />
                      </ActionIcon>
                    </Tooltip>
                  );
                }
                return (
                  <NavLink
                    key={item.path}
                    label={item.label}
                    leftSection={<Icon size={18} />}
                    active={active}
                    onClick={() => goTo(item.path)}
                    className="app-nav-link"
                  />
                );
              })}

              {visibleAttendanceItems.length ? (
                desktopCollapsed ? (
                  <Menu position="right-start" withArrow shadow="md" width={220} trigger="hover" openDelay={100}>
                    <Menu.Target>
                      <ActionIcon
                        variant={isAttendanceRoute ? "light" : "subtle"}
                        color={isAttendanceRoute ? "blue" : "gray"}
                        size={38}
                        radius="md"
                      >
                        <IconClipboardList size={20} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Chấm công & Ca</Menu.Label>
                      {visibleAttendanceItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Menu.Item
                            key={item.path}
                            leftSection={<Icon size={16} />}
                            onClick={() => goTo(item.path)}
                            color={isActive(location.pathname, item.path) ? "blue" : undefined}
                          >
                            {item.label}
                          </Menu.Item>
                        );
                      })}
                    </Menu.Dropdown>
                  </Menu>
                ) : (
                  <NavLink
                    label="Chấm công"
                    leftSection={<IconClipboardList size={18} />}
                    defaultOpened={isAttendanceRoute}
                    className="app-nav-link"
                  >
                    {visibleAttendanceSections.map((section) => (
                      <NavLink
                        key={section.label}
                        label={section.label}
                        defaultOpened
                        className="app-nav-link"
                      >
                        {section.items.map((item) => {
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
                    ))}
                  </NavLink>
                )
              ) : null}

              {visibleFinalItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(location.pathname, item.path);
                if (desktopCollapsed) {
                  return (
                    <Tooltip key={item.path} label={item.label} position="right" withArrow openDelay={150}>
                      <ActionIcon
                        variant={active ? "light" : "subtle"}
                        color={active ? "blue" : "gray"}
                        size={38}
                        radius="md"
                        onClick={() => goTo(item.path)}
                      >
                        <Icon size={20} />
                      </ActionIcon>
                    </Tooltip>
                  );
                }
                return (
                  <NavLink
                    key={item.path}
                    label={item.label}
                    leftSection={<Icon size={18} />}
                    active={active}
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
