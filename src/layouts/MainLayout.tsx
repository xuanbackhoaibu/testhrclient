import { AppShell, Avatar, Burger, Group, Menu, NavLink, ScrollArea, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBriefcase,
  IconBuildingBank,
  IconCalendarCheck,
  IconChevronDown,
  IconClipboardList,
  IconDashboard,
  IconFileAnalytics,
  IconFileImport,
  IconFolderOpen,
  IconLogout,
  IconSettings,
  IconSitemap,
  IconTableImport,
  IconTransfer,
  IconUsers,
} from '@tabler/icons-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../features/auth/useAuth';
import { BrandLogo } from '../shared/components/BrandLogo';
import { ROUTES } from '../shared/constants/routes';

interface NavItem {
  label: string;
  path: string;
  icon: typeof IconDashboard;
}

const mainItems: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.dashboard, icon: IconDashboard },
  { label: 'Nhân sự', path: ROUTES.employees, icon: IconUsers },
  { label: 'Điều chuyển', path: ROUTES.movements, icon: IconTransfer },
  { label: 'Hợp đồng', path: ROUTES.contracts, icon: IconBriefcase },
  { label: 'Nghỉ phép', path: ROUTES.leave, icon: IconCalendarCheck },
  { label: 'Chấm công', path: ROUTES.attendance, icon: IconClipboardList },
  { label: 'Onboarding', path: ROUTES.onboarding, icon: IconFolderOpen },
  { label: 'Offboarding', path: ROUTES.offboarding, icon: IconFileImport },
  { label: 'Imports', path: ROUTES.imports, icon: IconTableImport },
  { label: 'Audit logs', path: ROUTES.auditLogs, icon: IconFileAnalytics },
  { label: 'Cài đặt', path: ROUTES.settings, icon: IconSettings },
];

const orgItems: NavItem[] = [
  { label: 'Pháp nhân', path: ROUTES.units, icon: IconBuildingBank },
  { label: 'Đơn vị', path: ROUTES.departments, icon: IconSitemap },
  { label: 'Chức vụ', path: ROUTES.positions, icon: IconBriefcase },
];

const routeTitles: Record<string, string> = {
  [ROUTES.dashboard]: 'Dashboard',
  [ROUTES.employees]: 'Nhân sự',
  [ROUTES.units]: 'Pháp nhân',
  [ROUTES.departments]: 'Đơn vị',
  [ROUTES.positions]: 'Chức vụ',
  [ROUTES.movements]: 'Điều chuyển',
  [ROUTES.contracts]: 'Hợp đồng',
  [ROUTES.leave]: 'Nghỉ phép',
  [ROUTES.attendance]: 'Chấm công',
  [ROUTES.onboarding]: 'Onboarding',
  [ROUTES.offboarding]: 'Offboarding',
  [ROUTES.imports]: 'Imports',
  [ROUTES.auditLogs]: 'Audit logs',
  [ROUTES.settings]: 'Cài đặt',
};

function isActive(pathname: string, path: string) {
  if (path === ROUTES.employees) {
    return pathname === path || pathname.startsWith('/employees/');
  }
  return pathname === path;
}

export function MainLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const selectedPath = location.pathname.startsWith('/employees/')
    ? ROUTES.employees
    : location.pathname;

  function goTo(path: string) {
    navigate(path);
    close();
  }

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 260, breakpoint: 'md', collapsed: { mobile: !opened } }}
      padding="lg"
      bg="#f6f8fb"
    >
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
            <Title order={1} size="h3">
              {routeTitles[selectedPath] ?? 'HACOM HRM'}
            </Title>
          </Group>

          <Menu position="bottom-end" shadow="md" width={230}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs" wrap="nowrap">
                  <Avatar size={32} radius="xl" color="blue">
                    {(user?.fullName ?? user?.email ?? 'U').slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Stack gap={0} visibleFrom="sm">
                    <Text size="sm" fw={600} maw={160} truncate>
                      {user?.fullName ?? 'User'}
                    </Text>
                    <Text size="xs" c="dimmed" maw={160} truncate>
                      {user?.email ?? '-'}
                    </Text>
                  </Stack>
                  <IconChevronDown size={16} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Tài khoản</Menu.Label>
              <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={() => logout()}>
                Đăng xuất
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="md" h="100%">
          <Group px="xs">
            <BrandLogo />
          </Group>

          <ScrollArea flex={1}>
            <Stack gap={4}>
              {mainItems.slice(0, 2).map((item) => {
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

              <NavLink
                label="Tổ chức"
                leftSection={<IconBuildingBank size={18} />}
                defaultOpened
                className="app-nav-link"
              >
                {orgItems.map((item) => {
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

              {mainItems.slice(2).map((item) => {
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
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
