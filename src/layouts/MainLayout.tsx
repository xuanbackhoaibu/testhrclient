import {
  AppShell,
  ActionIcon,
  Button,
  Avatar,
  Burger,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
  useMantineColorScheme,
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
  IconMoon,
  IconSettings,
  IconShield,
  IconSitemap,
  IconTable,
  IconTransfer,
  IconUserCheck,
  IconUsers,
  IconCalendarStats,
  IconSearch,
  IconSun,
} from "@tabler/icons-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../features/auth/useAuth";
import { canAccessRoute } from "../features/auth/routePolicies";
import { GlobalCommandCenter } from "../features/command-center/GlobalCommandCenter";
import { NotificationBell } from "../features/notifications/NotificationBell";
import { BrandLogo } from "../shared/components/BrandLogo";
import { ROUTES } from "../shared/constants/routes";

interface NavItem {
  label: string;
  path: string;
  icon: typeof IconDashboard;
}

const mainItems: NavItem[] = [
  { label: "Dashboard", path: ROUTES.dashboard, icon: IconDashboard },
  { label: "Nhân sự", path: ROUTES.employees, icon: IconUsers },
  { label: "Điều chuyển", path: ROUTES.movements, icon: IconTransfer },
  // { label: "Hợp đồng", path: ROUTES.contracts, icon: IconBriefcase },
  // { label: "Nghỉ phép", path: ROUTES.leave, icon: IconCalendarCheck },
  { label: "Chấm công", path: ROUTES.attendance, icon: IconClipboardList },
  { label: "Xử lý mapping", path: ROUTES.attendanceMapping, icon: IconLink },
  { label: "Bảng công tháng", path: ROUTES.timesheetGrid, icon: IconTable },
  { label: "Kỳ công", path: ROUTES.timesheetPeriods, icon: IconCalendarStats },
  { label: "Ca làm việc", path: ROUTES.workShifts, icon: IconClock },
  { label: "Ngày lễ", path: ROUTES.holidays, icon: IconCalendarCheck },
  { label: "Phân ca", path: ROUTES.shiftAssignments, icon: IconCalendarTime },
  // { label: "Onboarding", path: ROUTES.onboarding, icon: IconFolderOpen },
  // { label: "Offboarding", path: ROUTES.offboarding, icon: IconFileImport },
  // { label: "Audit logs", path: ROUTES.auditLogs, icon: IconFileAnalytics },
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
  { label: "Tài khoản chờ liên kết", path: ROUTES.pendingHrLinkAccounts, icon: IconLink },
  { label: "Vai trò", path: ROUTES.roles, icon: IconShield },
  { label: "Nhóm quyền", path: ROUTES.permissionGroups, icon: IconShield },
  { label: "Danh mục quyền", path: ROUTES.permissions, icon: IconKey },
  { label: "Phân quyền báo cáo công việc", path: ROUTES.workReportAuthorizations, icon: IconClipboardList },
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
  [ROUTES.attendance]: "Chấm công",
  [ROUTES.attendanceMapping]: "Xử lý mapping",
  [ROUTES.timesheetGrid]: "Bảng công tháng",
  [ROUTES.timesheetPeriods]: "Kỳ công",
  [ROUTES.workShifts]: "Ca làm việc",
  [ROUTES.holidays]: "Ngày lễ",
  [ROUTES.shiftAssignments]: "Phân ca",
  [ROUTES.onboarding]: "Onboarding",
  [ROUTES.offboarding]: "Offboarding",
  [ROUTES.imports]: "Imports",
  [ROUTES.auditLogs]: "Audit logs",
  [ROUTES.settings]: "Cài đặt",
  [ROUTES.accounts]: "Tài khoản",
  [ROUTES.pendingHrLinkAccounts]: "Tài khoản chờ liên kết nhân sự",
  [ROUTES.roles]: "Vai trò",
  [ROUTES.permissionGroups]: "Nhóm quyền",
  [ROUTES.permissions]: "Danh mục quyền",
  [ROUTES.workReportAuthorizations]: "Phân quyền báo cáo công việc",
};

function isActive(pathname: string, path: string) {
  if (path === ROUTES.employees) {
    return pathname === path || pathname.startsWith("/employees/");
  }
  return pathname === path;
}

export function MainLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const visibleMainItems = mainItems.filter((item) => canAccessRoute(user, item.path));
  const visibleOrgItems = orgItems.filter((item) => canAccessRoute(user, item.path));
  const visibleIamItems = iamItems.filter((item) => canAccessRoute(user, item.path));
  const commandRoutes = [...visibleMainItems, ...visibleOrgItems, ...visibleIamItems];

  const showOrganizationMenu = visibleOrgItems.length > 0;
  const showIamMenu = visibleIamItems.length > 0;
  const isIamRoute = visibleIamItems.some((item) => isActive(location.pathname, item.path));
  const selectedPath = location.pathname.startsWith("/employees/")
    ? ROUTES.employees
    : location.pathname;

  function goTo(path: string) {
    navigate(path);
    close();
  }

  const isDarkMode = colorScheme === "dark";

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 260, breakpoint: "md", collapsed: { mobile: !opened } }}
      padding="lg"
      bg="var(--hrm-bg)"
      className="app-shell"
    >
      <AppShell.Header className="app-shell-header">
        <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="md"
              size="sm"
            />
            <Title order={1} size="h3" className="app-shell-title">
              {routeTitles[selectedPath] ?? "HACOM HRM"}
            </Title>
          </Group>

          <Group gap="sm" wrap="nowrap" className="app-shell-user-tools">
          <Tooltip label={isDarkMode ? "Tắt Dark Mode" : "Bật Dark Mode"}>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label={isDarkMode ? "Tắt Dark Mode" : "Bật Dark Mode"}
              onClick={() => setColorScheme(isDarkMode ? "light" : "dark")}
            >
              {isDarkMode ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
          </Tooltip>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconSearch size={15} />}
            visibleFrom="sm"
            onClick={() => window.dispatchEvent(new CustomEvent("hrm:open-command-center"))}
          >
            Ctrl K
          </Button>
          <NotificationBell />
          <Menu position="bottom-end" shadow="md" width={230}>
            <Menu.Target>
              <UnstyledButton className="app-user-menu-button">
                <Group gap="xs" wrap="nowrap">
                  <Avatar size={32} radius="xl" color="blue">
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

      <AppShell.Navbar p="md" className="app-shell-navbar">
        <Stack gap="md" h="100%">
          <Group px="xs">
            <BrandLogo />
          </Group>

          <ScrollArea flex={1}>
            <Stack gap={4}>
              {visibleMainItems.length > 0 ? (
                <Text size="xs" fw={750} c="dimmed" className="app-nav-section-label">
                  Vận hành
                </Text>
              ) : null}
              {visibleMainItems.slice(0, 2).map((item) => {
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
                <>
                <Text size="xs" fw={750} c="dimmed" className="app-nav-section-label">
                  Danh mục
                </Text>
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
                </>
              ) : null}

              {showIamMenu ? (
                <>
                <Text size="xs" fw={750} c="dimmed" className="app-nav-section-label">
                  Quản trị
                </Text>
                <NavLink
                  label="Phân quyền"
                  leftSection={<IconShield size={18} />}
                  defaultOpened={isIamRoute}
                  className="app-nav-link"
                >
                  <NavLink label="Người dùng và tài khoản" defaultOpened={visibleIamItems.slice(0, 2).some((item) => isActive(location.pathname, item.path))}>
                    {visibleIamItems.slice(0, 2).map((item) => {
                      const Icon = item.icon;
                      return <NavLink key={item.path} label={item.label} leftSection={<Icon size={17} />} active={isActive(location.pathname, item.path)} onClick={() => goTo(item.path)} className="app-nav-link" />;
                    })}
                  </NavLink>
                  <NavLink label="Vai trò và quyền" defaultOpened={visibleIamItems.slice(2, 5).some((item) => isActive(location.pathname, item.path))}>
                    {visibleIamItems.slice(2, 5).map((item) => {
                      const Icon = item.icon;
                      return <NavLink key={item.path} label={item.label} leftSection={<Icon size={17} />} active={isActive(location.pathname, item.path)} onClick={() => goTo(item.path)} className="app-nav-link" />;
                    })}
                  </NavLink>
                  {visibleIamItems.slice(5).map((item) => {
                    const Icon = item.icon;
                    return <NavLink key={item.path} label="Báo cáo công việc" leftSection={<Icon size={17} />} active={isActive(location.pathname, item.path)} onClick={() => goTo(item.path)} className="app-nav-link" />;
                  })}
                </NavLink>
                </>
              ) : null}

              {visibleMainItems.slice(2).map((item) => {
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

      <AppShell.Main className="app-shell-main">
        <Outlet />
      </AppShell.Main>
      <GlobalCommandCenter routes={commandRoutes} />
    </AppShell>
  );
}
