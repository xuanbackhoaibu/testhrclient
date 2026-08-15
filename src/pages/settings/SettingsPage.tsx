import { useMemo, useState } from 'react';
import {
  Badge,
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
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBell,
  IconBuilding,
  IconCheck,
  IconClock,
  IconCloudLock,
  IconDeviceDesktop,
  IconHistory,
  IconMoon,
  IconPalette,
  IconRefresh,
  IconShieldCheck,
  IconSun,
  IconUserShield,
} from '@tabler/icons-react';

import type { AuthUser } from '../../features/auth/types';
import { useAuth } from '../../features/auth/useAuth';
import {
  createDefaultNotificationSettings,
  getReadableNotificationEvents,
  readNotificationSettings,
  writeNotificationSettings,
  type NotificationChannel,
  type NotificationEvent,
  type NotificationSettings,
} from '../../features/notifications/notificationSettings';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatList } from '../../shared/utils/format';

type ThemeMode = 'light' | 'dark' | 'auto';

const channelLabels: Record<NotificationChannel, string> = {
  inApp: 'Trong app',
  email: 'Email',
};

const themeOptions: Array<{
  value: ThemeMode;
  label: string;
  description: string;
  icon: typeof IconSun;
  className: string;
}> = [
  {
    value: 'light',
    label: 'Light',
    description: 'Nền sáng cho ca làm việc ban ngày.',
    icon: IconSun,
    className: 'is-light',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Giảm chói khi HR xử lý dữ liệu buổi tối.',
    icon: IconMoon,
    className: 'is-dark',
  },
  {
    value: 'auto',
    label: 'Auto',
    description: 'Theo chế độ hệ điều hành.',
    icon: IconDeviceDesktop,
    className: 'is-auto',
  },
];

const securityPrinciples = [
  {
    title: 'Xác thực',
    value: 'Qua dịch vụ đăng nhập tập trung',
    description: 'Frontend nhận phiên đăng nhập từ hệ thống SSO rồi tải HRM profile qua API.',
    icon: IconCloudLock,
    tone: 'is-blue',
  },
  {
    title: 'Phân quyền',
    value: 'Theo vai trò và phạm vi dữ liệu',
    description: 'Menu và thao tác được lọc bằng permissions, roles và data scopes hiện tại.',
    icon: IconUserShield,
    tone: 'is-grape',
  },
  {
    title: 'Theo dõi thay đổi',
    value: 'Ghi nhận vào nhật ký audit',
    description: 'Các thay đổi quan trọng được điều hướng về Audit logs để đối soát.',
    icon: IconHistory,
    tone: 'is-orange',
  },
  {
    title: 'Phiên làm việc',
    value: 'Tự yêu cầu đăng nhập lại khi hết phiên',
    description: 'Khi token không còn hợp lệ, người dùng được đưa về luồng đăng nhập an toàn.',
    icon: IconShieldCheck,
    tone: 'is-green',
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

function updateNotificationMatrix(
  settings: NotificationSettings,
  event: NotificationEvent,
  channel: NotificationChannel,
  checked: boolean,
): NotificationSettings {
  return {
    ...settings,
    matrix: {
      ...settings.matrix,
      [event]: {
        ...settings.matrix[event],
        [channel]: checked,
      },
    },
  };
}

export function SettingsPage() {
  const { user, roles } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() =>
    readNotificationSettings(),
  );
  const [savedNotificationSettings, setSavedNotificationSettings] = useState<NotificationSettings>(() =>
    readNotificationSettings(),
  );

  const readableNotificationEvents = useMemo(
    () => getReadableNotificationEvents(user),
    [user],
  );

  const settingsDirty =
    JSON.stringify(notificationSettings) !== JSON.stringify(savedNotificationSettings);

  const runtimeItems = [
    { label: 'API base URL', value: import.meta.env.VITE_API_BASE_URL || '-' },
    { label: 'Auth mode', value: import.meta.env.VITE_AUTH_MODE || '-' },
    { label: 'Mock mode', value: import.meta.env.VITE_USE_MOCKS || 'false' },
    {
      label: 'Auth service',
      value: import.meta.env.VITE_AUTH_SERVICE_BASE_URL ?? import.meta.env.VITE_CHAT_AUTH_BASE_URL ?? '-',
    },
    {
      label: 'Redirect URI',
      value: import.meta.env.VITE_AUTH_SERVICE_REDIRECT_URI ?? import.meta.env.VITE_CHAT_AUTH_REDIRECT_URI ?? '-',
    },
  ];

  function selectTheme(mode: ThemeMode) {
    setColorScheme(mode);
    notifications.show({
      color: 'green',
      message: `Đã áp dụng giao diện ${mode === 'auto' ? 'tự động' : mode}.`,
    });
  }

  function saveNotificationSettings() {
    writeNotificationSettings(notificationSettings);
    setSavedNotificationSettings(notificationSettings);
    window.dispatchEvent(new Event('hrm:notification-settings-updated'));
    notifications.show({ color: 'green', message: 'Đã lưu cài đặt thông báo.' });
  }

  function resetNotificationSettings() {
    const defaults = createDefaultNotificationSettings();
    setNotificationSettings(defaults);
  }

  return (
    <>
      <PageHeader
        title="Cài đặt"
        subtitle="Quản lý giao diện cá nhân, thông báo và thông tin phiên đăng nhập hiện tại."
      />

      <Stack gap="lg">
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <Card withBorder radius="md" p="lg" className="settings-panel">
            <Group justify="space-between" align="flex-start" mb="md">
              <Group gap="sm">
                <ThemeIcon variant="light" color="red" className="settings-card-icon">
                  <IconBuilding size={18} />
                </ThemeIcon>
                <div>
                  <Title order={2} size="h4">Thông tin công ty</Title>
                  <Text size="sm" c="dimmed">Runtime config đang dùng trong phiên hiện tại.</Text>
                </div>
              </Group>
              <Badge variant="light" color="gray">Runtime</Badge>
            </Group>

            <Stack gap={0} className="settings-runtime-box">
              {runtimeItems.map((item) => (
                <Group key={item.label} justify="space-between" gap="md" className="settings-security-row">
                  <Text size="sm" c="dimmed">{item.label}</Text>
                  <Text size="sm" fw={600} ta="right" maw={380} truncate="end">
                    {item.value}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Card>

          <Card withBorder radius="md" p="lg" className="settings-panel">
            <Group justify="space-between" align="flex-start" mb="md">
              <Group gap="sm">
                <ThemeIcon variant="light" color="red" className="settings-card-icon">
                  <IconPalette size={18} />
                </ThemeIcon>
                <div>
                  <Title order={2} size="h4">Giao diện cá nhân</Title>
                  <Text size="sm" c="dimmed">Chọn chế độ hiển thị áp dụng ngay cho tài khoản này.</Text>
                </div>
              </Group>
              <Badge variant="light" color="green">Áp dụng ngay</Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const selected = colorScheme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`settings-theme-card ${option.className}${selected ? ' is-selected' : ''}`}
                    onClick={() => selectTheme(option.value)}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Icon size={18} />
                      {selected ? <IconCheck size={17} /> : null}
                    </Group>
                    <div className="settings-theme-preview" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    <Text size="sm" fw={700}>{option.label}</Text>
                    <Text size="xs" c="dimmed" mt={3}>{option.description}</Text>
                  </button>
                );
              })}
            </SimpleGrid>
          </Card>
        </SimpleGrid>

        {readableNotificationEvents.length > 0 ? (
          <Card withBorder radius="md" p="lg" className="settings-panel">
            <Group justify="space-between" align="flex-start" mb="md">
              <Group gap="sm">
                <ThemeIcon variant="light" color="red" className="settings-card-icon">
                  <IconBell size={18} />
                </ThemeIcon>
                <div>
                  <Title order={2} size="h4">Thông báo hệ thống</Title>
                  <Text size="sm" c="dimmed">Chỉ hiển thị các loại thông báo phù hợp quyền của tài khoản.</Text>
                </div>
              </Group>
              {settingsDirty ? <Badge color="yellow">Chưa lưu</Badge> : <Badge color="green" variant="light">Đã lưu</Badge>}
            </Group>

            <Table className="settings-notification-table" verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Loại sự kiện</Table.Th>
                  <Table.Th>{channelLabels.inApp}</Table.Th>
                  <Table.Th>{channelLabels.email}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {readableNotificationEvents.map((event) => (
                  <Table.Tr key={event.key}>
                    <Table.Td>
                      <Text size="sm" fw={650}>{event.label}</Text>
                      <Text size="xs" c="dimmed">{event.description}</Text>
                    </Table.Td>
                    {(['inApp', 'email'] as NotificationChannel[]).map((channel) => (
                      <Table.Td key={channel}>
                        <Switch
                          checked={notificationSettings.matrix[event.key][channel]}
                          onChange={(e) =>
                            setNotificationSettings((current) =>
                              updateNotificationMatrix(current, event.key, channel, e.currentTarget.checked),
                            )
                          }
                          aria-label={`${event.label} ${channelLabels[channel]}`}
                        />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Divider my="md" />
            <Group justify="space-between" align="flex-end">
              <Group gap="sm" align="flex-end">
                <Switch
                  label="Tắt thông báo ngoài giờ làm việc"
                  checked={notificationSettings.quietHoursEnabled}
                  onChange={(e) =>
                    setNotificationSettings((current) => ({
                      ...current,
                      quietHoursEnabled: e.currentTarget.checked,
                    }))
                  }
                />
                <TextInput
                  label="Bắt đầu"
                  type="time"
                  w={128}
                  value={notificationSettings.quietFrom}
                  disabled={!notificationSettings.quietHoursEnabled}
                  onChange={(e) =>
                    setNotificationSettings((current) => ({
                      ...current,
                      quietFrom: e.currentTarget.value,
                    }))
                  }
                />
                <TextInput
                  label="Kết thúc"
                  type="time"
                  w={128}
                  value={notificationSettings.quietTo}
                  disabled={!notificationSettings.quietHoursEnabled}
                  onChange={(e) =>
                    setNotificationSettings((current) => ({
                      ...current,
                      quietTo: e.currentTarget.value,
                    }))
                  }
                />
              </Group>
              <Group gap="xs">
                <Button variant="subtle" leftSection={<IconRefresh size={15} />} onClick={resetNotificationSettings}>
                  Khôi phục
                </Button>
                <Button disabled={!settingsDirty} onClick={saveNotificationSettings}>
                  Lưu thay đổi
                </Button>
              </Group>
            </Group>
          </Card>
        ) : null}

        <Card withBorder radius="md" p="lg" className="settings-panel">
          <Group gap="sm" mb="md">
            <ThemeIcon variant="light" color="red" className="settings-card-icon">
              <IconShieldCheck size={18} />
            </ThemeIcon>
            <div>
              <Title order={2} size="h4">Bảo mật tài khoản</Title>
              <Text size="sm" c="dimmed">Các nguyên tắc bảo vệ phiên đăng nhập và quyền truy cập HRM.</Text>
            </div>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md" className="settings-security-grid">
            {securityPrinciples.map((item) => {
              const Icon = item.icon;
              return (
                <Paper key={item.title} withBorder className="settings-security-card">
                  <Group gap="sm" align="flex-start" wrap="nowrap">
                    <span className={`settings-security-icon ${item.tone}`}>
                      <Icon size={18} />
                    </span>
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{item.title}</Text>
                      <Text size="sm" fw={700} mt={3}>{item.value}</Text>
                    </div>
                  </Group>
                  <Text size="xs" c="dimmed" mt="md" className="settings-security-detail">
                    {item.description}
                  </Text>
                </Paper>
              );
            })}
          </SimpleGrid>
        </Card>

        <Card withBorder radius="md" p="lg" className="settings-panel">
          <Group gap="sm" mb="md">
            <ThemeIcon variant="light" color="red" className="settings-card-icon">
              <IconClock size={18} />
            </ThemeIcon>
            <div>
              <Title order={2} size="h4">Phiên hiện tại</Title>
              <Text size="sm" c="dimmed">Thông tin nhận diện tài khoản HRM đang đăng nhập.</Text>
            </div>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} className="settings-runtime-box">
            {[
              ['Người dùng', user?.fullName ?? '-'],
              ['Email', user?.email ?? '-'],
              ['Auth user ID', user?.authUserId ?? user?.externalAuthUserId ?? '-'],
              ['Trạng thái tài khoản', user?.accountStatus ?? user?.account_status ?? '-'],
              ['Employee ID', user?.employeeId ?? '-'],
              ['Roles', formatList(roles)],
              ['Data scopes', formatDataScopes(user?.dataScopes)],
            ].map(([label, value]) => (
              <Group key={label} justify="space-between" gap="md" className="settings-security-row">
                <Text size="sm" c="dimmed">{label}</Text>
                <Text size="sm" fw={650} ta="right" maw={360} truncate="end">{value}</Text>
              </Group>
            ))}
          </SimpleGrid>
        </Card>
      </Stack>
    </>
  );
}
