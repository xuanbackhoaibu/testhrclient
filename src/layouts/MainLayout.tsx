import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Button,
  Group,
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
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
} from "@tabler/icons-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../features/auth/useAuth";
import { canAccessRoute } from "../features/auth/routePolicies";
import { NotificationBell } from "../features/notifications/NotificationBell";
import { BrandLogo } from "../shared/components/BrandLogo";
import {
  bottomLevelItems,
  filterNavGroups,
  isActive,
  navGroups,
  routeTitles,
  topLevelItems,
  type NavGroup,
  type NavItem,
  type NavSection,
} from "./navigation";

function NavItemLink({
  item,
  pathname,
  goTo,
  size = 18,
}: {
  item: NavItem;
  pathname: string;
  goTo: (path: string) => void;
  size?: number;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      label={item.label}
      leftSection={<Icon size={size} />}
      active={isActive(pathname, item.path)}
      onClick={() => goTo(item.path)}
      className="app-nav-link"
    />
  );
}

function NavItems({
  items,
  pathname,
  goTo,
}: {
  items: NavItem[];
  pathname: string;
  goTo: (path: string) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <NavItemLink key={item.path} item={item} pathname={pathname} goTo={goTo} size={17} />
      ))}
    </>
  );
}

function isSectionActive(section: NavSection, pathname: string) {
  return section.items.some((item) => isActive(pathname, item.path));
}

/** Renders one collapsible nav group. A section with no `label` renders its
 *  items directly (no extra nesting); a labeled section renders as its own
 *  nested expandable NavLink — used for groups with sub-categories. */
function NavGroupMenu({
  group,
  pathname,
  goTo,
}: {
  group: NavGroup;
  pathname: string;
  goTo: (path: string) => void;
}) {
  const Icon = group.icon;
  const isGroupActive = group.sections.some((section) => isSectionActive(section, pathname));

  return (
    <NavLink
      label={group.label}
      leftSection={<Icon size={18} />}
      defaultOpened={isGroupActive}
      className="app-nav-link"
    >
      {group.sections.map((section, index) =>
        section.label ? (
          <NavLink
            key={section.label}
            label={section.label}
            defaultOpened={isSectionActive(section, pathname)}
          >
            {section.items.map((item) => (
              <NavItemLink key={item.path} item={item} pathname={pathname} goTo={goTo} size={17} />
            ))}
          </NavLink>
        ) : (
          // Unlabeled sections are stable per group definition, so index is a safe key here.
          <NavItems key={index} items={section.items} pathname={pathname} goTo={goTo} />
        ),
      )}
    </NavLink>
  );
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

  const canAccess = (path: string) => canAccessRoute(user, path);
  const visibleTopLevelItems = topLevelItems.filter((item) => canAccess(item.path));
  const visibleBottomLevelItems = bottomLevelItems.filter((item) => canAccess(item.path));
  const visibleGroups = filterNavGroups(navGroups, canAccess);

  const selectedPath = location.pathname.startsWith("/employees/")
    ? "/employees"
    : location.pathname;

  function goTo(path: string) {
    navigate(path);
    close();
  }

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 260, breakpoint: "md", collapsed: { mobile: !opened, desktop: desktopCollapsed } }}
      padding="lg"
      bg="#f6f8fb"
      className={`app-shell ${desktopCollapsed ? "is-sidebar-collapsed" : ""}`}
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
            {desktopCollapsed ? (
              <Tooltip label="Mở rộng thanh bên">
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label="Mở rộng thanh bên"
                  visibleFrom="md"
                  onClick={() => setDesktopCollapsed(false)}
                >
                  <IconChevronRight size={18} />
                </ActionIcon>
              </Tooltip>
            ) : null}
            <Title order={1} size="h3" className="app-shell-title">
              {routeTitles[selectedPath] ?? "HACOM HRM"}
            </Title>
          </Group>

          <Group gap="sm" wrap="nowrap" className="app-shell-user-tools">
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
              {visibleTopLevelItems.map((item) => (
                <NavItemLink key={item.path} item={item} pathname={location.pathname} goTo={goTo} />
              ))}

              {visibleGroups.map((group) => (
                <NavGroupMenu key={group.label} group={group} pathname={location.pathname} goTo={goTo} />
              ))}

              {visibleBottomLevelItems.map((item) => (
                <NavItemLink key={item.path} item={item} pathname={location.pathname} goTo={goTo} />
              ))}
            </Stack>
          </ScrollArea>

          <Group className="app-sidebar-footer" justify="center" visibleFrom="md">
            <Button
              variant="subtle"
              size="xs"
              fullWidth
              leftSection={<IconChevronLeft size={15} />}
              onClick={() => setDesktopCollapsed(true)}
            >
              Thu gọn
            </Button>
          </Group>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main className="app-shell-main">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
