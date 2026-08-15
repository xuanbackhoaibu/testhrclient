import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBell,
  IconDatabase,
  IconDeviceDesktop,
  IconMoon,
  IconPalette,
  IconSettings,
  IconShield,
  IconSun,
  IconX,
} from '@tabler/icons-react';

import type { AuthUser } from '../../features/auth/types';
import { useAuth } from '../../features/auth/useAuth';
import {
  getReadableNotificationEvents,
  readNotificationSettings,
  writeNotificationSettings,
  type NotificationSettings,
} from '../../features/notifications/notificationSettings';
import { formatList } from '../../shared/utils/format';
import { useNavigate } from 'react-router-dom';

type ThemeMode = 'light' | 'dark' | 'auto';
type SettingsSection =
  | 'general'
  | 'session'
  | 'data'
  | 'appearance'
  | 'notifications';

const themeOptions: Array<{
  value: ThemeMode;
  icon: typeof IconSun;
  className: string;
}> = [
  {
    value: 'light',
    icon: IconSun,
    className: 'is-light',
  },
  {
    value: 'dark',
    icon: IconMoon,
    className: 'is-dark',
  },
  {
    value: 'auto',
    icon: IconDeviceDesktop,
    className: 'is-auto',
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

export function SettingsPage() {
  const { user, roles } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [useAvatarBackground, setUseAvatarBackground] = useState(false);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() =>
    readNotificationSettings(),
  );

  const readableNotificationEvents = useMemo(
    () => getReadableNotificationEvents(user),
    [user],
  );

  const notificationsEnabled = readableNotificationEvents.some((event) =>
    Object.values(notificationSettings.matrix[event.key]).some(Boolean),
  );

  const settingsSections: Array<{
    key: SettingsSection;
    label: string;
    icon: typeof IconSun;
  }> = [
    {
      key: 'general',
      label: 'Cài đặt chung',
      icon: IconSettings,
    },
    {
      key: 'session',
      label: 'Tài khoản và bảo mật',
      icon: IconShield,
    },
    {
      key: 'data',
      label: 'Quản lý dữ liệu',
      icon: IconDatabase,
    },
    {
      key: 'appearance',
      label: 'Giao diện',
      icon: IconPalette,
    },
    ...(readableNotificationEvents.length > 0
      ? [{
          key: 'notifications' as const,
          label: 'Thông báo',
          icon: IconBell,
        }]
      : []),
  ];

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

  function toggleAllNotifications(enabled: boolean) {
    setNotificationSettings((current) => {
      const next = {
        ...current,
        matrix: readableNotificationEvents.reduce<NotificationSettings['matrix']>(
          (matrix, event) => ({
            ...matrix,
            [event.key]: {
              inApp: enabled,
              email: enabled,
            },
          }),
          current.matrix,
        ),
      };
      writeNotificationSettings(next);
      window.dispatchEvent(new Event('hrm:notification-settings-updated'));
      notifications.show({
        color: 'green',
        message: enabled ? 'Đã bật thông báo.' : 'Đã tắt thông báo.',
      });
      return next;
    });
  }

  return (
    <Box className="settings-zalo-stage">
      <Box className="settings-zalo-window">
        <aside className="settings-zalo-nav">
          <Title order={1} className="settings-zalo-title">Cài đặt</Title>
          <Stack gap={4} className="settings-zalo-nav-list">
            {settingsSections.map((item) => {
              const Icon = item.icon;
              const selected = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`settings-zalo-nav-item${selected ? ' is-active' : ''}`}
                  onClick={() => setActiveSection(item.key)}
                >
                  <span className="settings-zalo-nav-icon">
                    <Icon size={18} stroke={1.9} />
                  </span>
                  <span className="settings-zalo-nav-copy">
                    <Text size="sm" lh={1.2}>{item.label}</Text>
                  </span>
                </button>
              );
            })}
          </Stack>
        </aside>

        <section className="settings-zalo-content">
          <ActionIcon
            variant="subtle"
            size="xl"
            className="settings-zalo-close"
            aria-label="Đóng cài đặt"
            onClick={() => navigate(-1)}
          >
            <IconX size={28} />
          </ActionIcon>

          {activeSection === 'appearance' ? (
            <Stack gap="xl">
              <Title order={2} className="settings-zalo-content-title">Cài đặt giao diện</Title>

              <div className="settings-zalo-section-card settings-zalo-theme-section">
                {themeOptions.map((option) => {
                  const selected = colorScheme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`settings-zalo-theme-choice ${option.className}${selected ? ' is-selected' : ''}`}
                      onClick={() => selectTheme(option.value)}
                    >
                      <div className="settings-theme-preview" aria-hidden="true">
                        <span className="settings-theme-dot" />
                        <span className="settings-theme-bubble is-primary" />
                        <span className="settings-theme-bubble is-secondary" />
                      </div>
                      <Group justify="center" gap="xs" mt="md">
                        <span className={`settings-zalo-radio${selected ? ' is-selected' : ''}`} />
                        <Text size="sm">
                          {option.value === 'light' ? 'Sáng' : option.value === 'dark' ? 'Tối' : 'Hệ Thống'}
                        </Text>
                      </Group>
                    </button>
                  );
                })}
              </div>

              <div>
                <Title order={3} className="settings-zalo-section-title" mb="sm">Hình nền chat</Title>
                <Group justify="space-between" className="settings-zalo-section-card settings-zalo-row">
                  <Text size="sm">Sử dụng Avatar làm hình nền</Text>
                  <Switch
                    checked={useAvatarBackground}
                    onChange={(event) => setUseAvatarBackground(event.currentTarget.checked)}
                    aria-label="Sử dụng Avatar làm hình nền"
                  />
                </Group>
              </div>
            </Stack>
          ) : null}

          {activeSection === 'notifications' && readableNotificationEvents.length > 0 ? (
            <Stack gap="xl">
              <div>
                <Title order={2} className="settings-zalo-content-title">Cài đặt thông báo</Title>
                <Text className="settings-zalo-subtitle">Nhận được thông báo mỗi khi có cập nhật mới trong HRM</Text>
              </div>

              <div className="settings-zalo-section-card settings-zalo-notification-mode">
                {[
                  { label: 'Bật', enabled: true },
                  { label: 'Tắt', enabled: false },
                ].map((option) => {
                  const selected = notificationsEnabled === option.enabled;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      className={`settings-zalo-notification-choice${selected ? ' is-selected' : ''}`}
                      onClick={() => toggleAllNotifications(option.enabled)}
                    >
                      <span className="settings-zalo-laptop" aria-hidden="true">
                        <span className="settings-zalo-laptop-screen">
                          {option.enabled ? <span className="settings-zalo-laptop-message" /> : null}
                        </span>
                        <span className="settings-zalo-laptop-base" />
                      </span>
                      <Group justify="center" gap="xs">
                        <span className={`settings-zalo-radio${selected ? ' is-selected' : ''}`} />
                        <Text size="sm">{option.label}</Text>
                      </Group>
                    </button>
                  );
                })}
              </div>

              <div>
                <Title order={3} className="settings-zalo-section-title" mb="sm">Âm thanh thông báo</Title>
                <Group justify="space-between" className="settings-zalo-section-card settings-zalo-row">
                  <Text size="sm">Phát âm thanh khi có tin nhắn & thông báo mới</Text>
                  <Switch
                    checked={notificationSoundEnabled}
                    onChange={(event) => setNotificationSoundEnabled(event.currentTarget.checked)}
                    aria-label="Phát âm thanh khi có tin nhắn và thông báo mới"
                  />
                </Group>
              </div>

            </Stack>
          ) : null}

          {activeSection === 'general' ? (
            <Stack gap="xl">
              <div>
                <Title order={2} size="h3">Cài đặt chung</Title>
                <Text size="sm" c="dimmed">Runtime config đang dùng trong phiên hiện tại.</Text>
              </div>

              <div>
                <Title order={3} size="h4" mb="sm">Ngôn ngữ</Title>
                <Card withBorder radius="md" p={0} className="settings-zalo-section-card">
                  <Group justify="space-between" className="settings-zalo-row">
                    <Text size="sm">Thay đổi ngôn ngữ</Text>
                    <Button variant="default" size="sm">Tiếng Việt</Button>
                  </Group>
                </Card>
              </div>

              <div>
                <Group justify="space-between" mb="sm">
                  <Title order={3} size="h4">Cấu hình vận hành</Title>
                  <Badge variant="light" color="gray">Runtime</Badge>
                </Group>
                <Stack gap={0} className="settings-zalo-section-card">
                {runtimeItems.map((item) => (
                  <Group key={item.label} justify="space-between" gap="md" className="settings-zalo-row">
                    <Text size="sm" c="dimmed">{item.label}</Text>
                    <Text size="sm" ta="right" maw={520} truncate="end">
                      {item.value}
                    </Text>
                  </Group>
                ))}
                </Stack>
              </div>
            </Stack>
          ) : null}

          {activeSection === 'session' ? (
            <Stack gap="xl">
              <div>
                <Title order={2} size="h3">Tài khoản và bảo mật</Title>
                <Text size="sm" c="dimmed">Thông tin nhận diện tài khoản HRM đang đăng nhập.</Text>
              </div>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} className="settings-zalo-section-card">
            {[
              ['Người dùng', user?.fullName ?? '-'],
              ['Email', user?.email ?? '-'],
              ['Auth user ID', user?.authUserId ?? user?.externalAuthUserId ?? '-'],
              ['Trạng thái tài khoản', user?.accountStatus ?? user?.account_status ?? '-'],
              ['Employee ID', user?.employeeId ?? '-'],
              ['Roles', formatList(roles)],
              ['Data scopes', formatDataScopes(user?.dataScopes)],
            ].map(([label, value]) => (
              <Group key={label} justify="space-between" gap="md" className="settings-zalo-row">
                <Text size="sm" c="dimmed">{label}</Text>
                <Text size="sm" ta="right" maw={360} truncate="end">{value}</Text>
              </Group>
            ))}
              </SimpleGrid>
            </Stack>
          ) : null}

          {activeSection === 'data' ? (
            <Stack gap="xl">
              <Title order={2} size="h3">
                {settingsSections.find((item) => item.key === activeSection)?.label}
              </Title>
              <div className="settings-zalo-section-card">
                <Group justify="space-between" className="settings-zalo-row">
                  <Text size="sm">Cấu hình sẽ được đồng bộ theo quyền và API tương ứng.</Text>
                  <Badge variant="light" color="gray">Sắp có</Badge>
                </Group>
              </div>
            </Stack>
          ) : null}
        </section>
      </Box>
    </Box>
  );
}
