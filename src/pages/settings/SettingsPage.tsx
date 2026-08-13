import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconBell,
  IconBuilding,
  IconCheck,
  IconDeviceFloppy,
  IconFingerprint,
  IconHistory,
  IconLockCheck,
  IconMail,
  IconMoon,
  IconPalette,
  IconRefresh,
  IconShieldLock,
  IconSun,
  IconUserShield,
} from '@tabler/icons-react';

import { AUTH_ADMIN_PERMISSIONS, HR_PERMISSIONS } from '../../features/auth/permissions';
import type { AuthUser } from '../../features/auth/types';
import { useAuth } from '../../features/auth/useAuth';
import {
  createDefaultNotificationSettings,
  readNotificationSettings,
  writeNotificationSettings,
  getReadableNotificationEvents,
  type NotificationChannel,
  type NotificationEvent,
  type NotificationSettings,
} from '../../features/notifications/notificationSettings';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatList } from '../../shared/utils/format';

type ThemeMode = 'light' | 'dark' | 'auto';

type CompanySettings = {
  name: string;
  taxCode: string;
  address: string;
  hotline: string;
};

type VisualSettings = {
  themeMode: ThemeMode;
  density: 'comfortable' | 'compact';
};

type SettingsSnapshot = {
  company: CompanySettings;
  visual: VisualSettings;
  notifications: NotificationSettings;
};

const themeCards: Array<{ key: ThemeMode; title: string; description: string; icon: typeof IconSun }> = [
  { key: 'light', title: 'Light', description: 'Nền sáng, tương phản cao cho ban ngày.', icon: IconSun },
  { key: 'dark', title: 'Dark', description: 'Nền tối dịu mắt khi làm việc buổi tối.', icon: IconMoon },
  { key: 'auto', title: 'Auto', description: 'Theo thiết lập hệ điều hành của người dùng.', icon: IconPalette },
];

const securityOverviewItems: Array<{
  title: string;
  description: string;
  icon: typeof IconShieldLock;
  color: string;
}> = [
  {
    title: 'Xác thực tập trung',
    description: 'Người dùng đăng nhập qua dịch vụ xác thực bên ngoài, HRM chỉ nhận hồ sơ và quyền đã xác minh.',
    icon: IconFingerprint,
    color: 'blue',
  },
  {
    title: 'Quyền theo vai trò',
    description: 'Mỗi tài khoản chỉ thấy dữ liệu và thao tác đúng phạm vi được cấp.',
    icon: IconUserShield,
    color: 'grape',
  },
  {
    title: 'Nhật ký thao tác',
    description: 'Các thay đổi quan trọng được ghi nhận để quản trị viên tra cứu khi cần đối chiếu.',
    icon: IconHistory,
    color: 'orange',
  },
  {
    title: 'Bảo vệ phiên',
    description: 'Khi phiên hết hạn hoặc quyền thay đổi, hệ thống yêu cầu xác thực lại để tiếp tục.',
    icon: IconLockCheck,
    color: 'green',
  },
];

function formatDataScopes(scopes: AuthUser['dataScopes'] | undefined) {
  return formatList(
    scopes?.map((scope) =>
      [scope.scopeType, scope.unitId, scope.departmentId]
        .filter(Boolean)
        .join(':'),
    ),
  );
}

function createInitialSettings(themeMode: ThemeMode): SettingsSnapshot {
  return {
    company: {
      name: 'HACOM HRM',
      taxCode: 'Chưa cấu hình',
      address: 'Tầng vận hành nhân sự',
      hotline: '1900 0000',
    },
    visual: {
      themeMode,
      density: 'comfortable',
    },
    notifications: typeof window === 'undefined'
      ? createDefaultNotificationSettings()
      : readNotificationSettings(),
  };
}

function canUseAdminSurface(user: AuthUser | null | undefined) {
  return Boolean(user?.roles?.includes('SUPER_ADMIN') || user?.permissions?.includes('*'));
}

function SettingsCardHeader({
  icon,
  title,
  subtitle,
  badge,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <Group justify="space-between" align="flex-start" mb="md">
      <Group align="flex-start" gap="sm">
        <span className="settings-card-icon">{icon}</span>
        <Box>
          <Title order={4}>{title}</Title>
          <Text size="sm" c="dimmed">{subtitle}</Text>
        </Box>
      </Group>
      {badge ? <Badge variant="light">{badge}</Badge> : null}
    </Group>
  );
}

export function SettingsPage() {
  const { user, roles, canAny } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [saved, setSaved] = useState<SettingsSnapshot>(() => createInitialSettings(colorScheme as ThemeMode));
  const [settings, setSettings] = useState<SettingsSnapshot>(() => createInitialSettings(colorScheme as ThemeMode));

  const isSystemAdmin = canUseAdminSurface(user);
  const canManageCompany = isSystemAdmin || canAny([
    AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
    AUTH_ADMIN_PERMISSIONS.ROLES_MANAGE,
  ]);
  const readableNotificationEvents = getReadableNotificationEvents(user);
  const canManageNotifications = readableNotificationEvents.length > 0;
  const canManagePasswordPolicy = isSystemAdmin || canAny([
    HR_PERMISSIONS.ACCOUNT_RESET_PASSWORD,
    AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
    AUTH_ADMIN_PERMISSIONS.ROLES_MANAGE,
  ]);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(saved);
  function updateCompany(key: keyof CompanySettings, value: string) {
    setSettings((current) => ({
      ...current,
      company: { ...current.company, [key]: value },
    }));
  }

  function updateTheme(themeMode: ThemeMode) {
    setColorScheme(themeMode);
    setSettings((current) => ({
      ...current,
      visual: { ...current.visual, themeMode },
    }));
  }

  function updateNotification(event: NotificationEvent, channel: NotificationChannel, value: boolean) {
    setSettings((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        matrix: {
          ...current.notifications.matrix,
          [event]: {
            ...current.notifications.matrix[event],
            [channel]: value,
          },
        },
      },
    }));
  }

  function updateVisualDensity(compact: boolean) {
    setSettings((current) => ({
      ...current,
      visual: { ...current.visual, density: compact ? 'compact' : 'comfortable' },
    }));
  }

  function updateQuietHours(key: 'quietFrom' | 'quietTo', value: string) {
    setSettings((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: value },
    }));
  }

  function updateQuietHoursEnabled(value: boolean) {
    setSettings((current) => ({
      ...current,
      notifications: { ...current.notifications, quietHoursEnabled: value },
    }));
  }

  function saveSettings() {
    setSaved(settings);
    writeNotificationSettings(settings.notifications);
    window.dispatchEvent(new CustomEvent('hrm:notification-settings-updated'));
    notifications.show({ color: 'green', message: 'Đã lưu cấu hình giao diện cục bộ.' });
  }

  function resetSettings() {
    setSettings(saved);
    setColorScheme(saved.visual.themeMode);
  }

  return (
    <>
      <PageHeader title="Cài đặt" subtitle="Quản lý thông tin công ty, giao diện, thông báo và chính sách mật khẩu." />

      <Stack gap="md" pb={hasChanges ? 84 : 0}>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <Card withBorder className="settings-panel">
            <SettingsCardHeader
              icon={<IconBuilding size={18} />}
              title="Thông tin công ty"
              subtitle="Thông tin hiển thị trong báo cáo, email và hồ sơ nội bộ."
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput disabled={!canManageCompany} label="Tên công ty" value={settings.company.name} onChange={(event) => updateCompany('name', event.currentTarget.value)} />
              <TextInput disabled={!canManageCompany} label="Mã số thuế" value={settings.company.taxCode} onChange={(event) => updateCompany('taxCode', event.currentTarget.value)} />
              <TextInput disabled={!canManageCompany} label="Hotline HR" value={settings.company.hotline} onChange={(event) => updateCompany('hotline', event.currentTarget.value)} />
              <TextInput disabled={!canManageCompany} label="Địa chỉ" value={settings.company.address} onChange={(event) => updateCompany('address', event.currentTarget.value)} />
            </SimpleGrid>

            {!canManageCompany ? (
              <Text size="sm" c="dimmed" mt="sm">
                Bạn đang xem thông tin công ty ở chế độ chỉ đọc. Cần quyền quản trị tài khoản hoặc quản trị hệ thống để sửa.
              </Text>
            ) : null}

            <Divider my="md" />
            <Paper withBorder p="sm" mt="md" className="settings-runtime-box">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                <Text size="sm"><Text span c="dimmed">API:</Text> {import.meta.env.VITE_API_BASE_URL ?? '-'}</Text>
                <Text size="sm"><Text span c="dimmed">Mock:</Text> {import.meta.env.VITE_USE_MOCKS ?? '-'}</Text>
                <Text size="sm"><Text span c="dimmed">User:</Text> {user?.fullName ?? '-'}</Text>
                <Text size="sm"><Text span c="dimmed">Roles:</Text> {formatList(roles)}</Text>
                <Text size="sm"><Text span c="dimmed">Account:</Text> {user?.accountStatus ?? user?.account_status ?? '-'}</Text>
                <Text size="sm"><Text span c="dimmed">Scope:</Text> {formatDataScopes(user?.dataScopes)}</Text>
              </SimpleGrid>
            </Paper>
          </Card>

          <Card withBorder className="settings-panel">
            <SettingsCardHeader
              icon={<IconPalette size={18} />}
              title="Giao diện"
              subtitle="Chọn theme áp dụng ngay cho toàn bộ hệ thống."
              badge={settings.visual.themeMode}
            />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              {themeCards.map((theme) => {
                const Icon = theme.icon;
                const selected = settings.visual.themeMode === theme.key;
                return (
                  <button
                    key={theme.key}
                    type="button"
                    className={`settings-theme-card ${selected ? 'is-selected' : ''} is-${theme.key}`}
                    onClick={() => updateTheme(theme.key)}
                  >
                    <Group justify="space-between">
                      <Icon size={18} />
                      {selected ? <IconCheck size={16} /> : null}
                    </Group>
                    <div className="settings-theme-preview">
                      <span />
                      <span />
                      <span />
                    </div>
                    <Text fw={800}>{theme.title}</Text>
                    <Text size="xs" c="dimmed">{theme.description}</Text>
                  </button>
                );
              })}
            </SimpleGrid>
            <Group justify="space-between" mt="md" className="settings-row">
              <Box>
                <Text fw={700}>Mật độ giao diện</Text>
                <Text size="sm" c="dimmed">Compact giúp bảng và form hiển thị nhiều dữ liệu hơn.</Text>
              </Box>
              <Switch
                checked={settings.visual.density === 'compact'}
                label={settings.visual.density === 'compact' ? 'Compact' : 'Comfortable'}
                onChange={(event) => updateVisualDensity(event.currentTarget.checked)}
              />
            </Group>
          </Card>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          {canManageNotifications ? (
            <Card withBorder className="settings-panel">
              <SettingsCardHeader
                icon={<IconBell size={18} />}
                title="Thông báo"
                subtitle="Bật/tắt kênh nhận thông báo theo từng loại sự kiện."
              />
              <Table className="settings-notification-table">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Sự kiện</Table.Th>
                    <Table.Th><Group gap={6}><IconBell size={15} /> Trong app</Group></Table.Th>
                    <Table.Th><Group gap={6}><IconMail size={15} /> Email</Group></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {readableNotificationEvents.map((event) => (
                    <Table.Tr key={event.key}>
                      <Table.Td>
                        <Text fw={700}>{event.label}</Text>
                        <Text size="xs" c="dimmed">{event.description}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Switch
                          checked={settings.notifications.matrix[event.key].inApp}
                          onChange={(change) => updateNotification(event.key, 'inApp', change.currentTarget.checked)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Switch
                          checked={settings.notifications.matrix[event.key].email}
                          onChange={(change) => updateNotification(event.key, 'email', change.currentTarget.checked)}
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Group mt="md" grow align="flex-start">
                <TimeInput
                  label="Bắt đầu"
                  disabled={!settings.notifications.quietHoursEnabled}
                  value={settings.notifications.quietFrom}
                  onChange={(event) => updateQuietHours('quietFrom', event.currentTarget.value)}
                />
                <TimeInput
                  label="Kết thúc"
                  disabled={!settings.notifications.quietHoursEnabled}
                  value={settings.notifications.quietTo}
                  onChange={(event) => updateQuietHours('quietTo', event.currentTarget.value)}
                />
              </Group>
              <Group justify="space-between" mt="md" className="settings-row">
                <Box>
                  <Text fw={700}>Tắt thông báo ngoài giờ làm việc</Text>
                  <Text size="sm" c="dimmed">Áp dụng cho thông báo trong app và email theo khung giờ yên lặng.</Text>
                </Box>
                <Switch
                  checked={settings.notifications.quietHoursEnabled}
                  onChange={(event) => updateQuietHoursEnabled(event.currentTarget.checked)}
                />
              </Group>
            </Card>
          ) : null}

          {canManagePasswordPolicy ? (
            <Card withBorder className="settings-panel">
              <SettingsCardHeader
                icon={<IconShieldLock size={18} />}
                title="Bảo mật tài khoản"
                subtitle="Tóm tắt các lớp bảo vệ đang áp dụng cho người dùng HRM."
              />
              <Paper withBorder p={0} className="settings-security-overview">
                <Stack gap={0}>
                  {securityOverviewItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Group key={item.title} gap="sm" wrap="nowrap" className="settings-security-row">
                        <span className={`settings-security-icon is-${item.color}`}>
                          <Icon size={18} />
                        </span>
                        <Box>
                          <Text fw={800}>{item.title}</Text>
                          <Text size="sm" c="dimmed">{item.description}</Text>
                        </Box>
                      </Group>
                    );
                  })}
                </Stack>
              </Paper>
            </Card>
          ) : null}
        </SimpleGrid>
      </Stack>

      {hasChanges ? (
        <Paper withBorder p="sm" className="settings-unsaved-bar">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Badge color="orange" variant="filled">Chưa lưu</Badge>
              <Text size="sm" fw={700}>Bạn có thay đổi cấu hình chưa được lưu.</Text>
            </Group>
            <Group gap="xs" wrap="nowrap">
              <Tooltip label="Hoàn tác về cấu hình đã lưu gần nhất">
                <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={resetSettings}>
                  Hoàn tác
                </Button>
              </Tooltip>
              <Button leftSection={<IconDeviceFloppy size={16} />} onClick={saveSettings}>
                Lưu
              </Button>
            </Group>
          </Group>
        </Paper>
      ) : null}
    </>
  );
}
