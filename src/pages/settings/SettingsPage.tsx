import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
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
  IconLanguage,
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
type FontSizeMode = 'small' | 'medium' | 'large';
type LanguageMode = 'vi' | 'en' | 'system';
type SettingsSection =
  | 'general'
  | 'language'
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

const fontSizeStorageKey = 'hrm:appearance-font-size';
const languageStorageKey = 'hrm:appearance-language';
const fontSizeOptions: Array<{
  value: FontSizeMode;
  label: string;
  sample: string;
}> = [
  { value: 'small', label: 'Nhỏ', sample: 'Aa' },
  { value: 'medium', label: 'Vừa', sample: 'Aa' },
  { value: 'large', label: 'Lớn', sample: 'Aa' },
];
const languageOptions: Array<{
  value: LanguageMode;
  label: string;
  locale: string;
  description: string;
}> = [
  {
    value: 'vi',
    label: 'Tiếng Việt',
    locale: 'VI',
    description: 'Giao diện tiếng Việt cho vận hành HRM hằng ngày.',
  },
  {
    value: 'en',
    label: 'English',
    locale: 'EN',
    description: 'English interface for bilingual teams.',
  },
  {
    value: 'system',
    label: 'Theo hệ thống',
    locale: 'AUTO',
    description: 'Sử dụng ngôn ngữ của trình duyệt.',
  },
];

function readFontSizeMode(): FontSizeMode {
  if (typeof window === 'undefined') return 'medium';
  const saved = window.localStorage.getItem(fontSizeStorageKey);
  return saved === 'small' || saved === 'large' ? saved : 'medium';
}

function readLanguageMode(): LanguageMode {
  if (typeof window === 'undefined') return 'vi';
  const saved = window.localStorage.getItem(languageStorageKey);
  return saved === 'en' || saved === 'system' ? saved : 'vi';
}

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
  const [fontSizeMode, setFontSizeMode] = useState<FontSizeMode>(() => readFontSizeMode());
  const [languageMode, setLanguageMode] = useState<LanguageMode>(() => readLanguageMode());
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
  const selectedLanguage =
    languageOptions.find((option) => option.value === languageMode) ?? languageOptions[0];
  const browserLanguage = typeof navigator === 'undefined' ? '-' : navigator.language;

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
      key: 'language',
      label: 'Ngôn ngữ',
      icon: IconLanguage,
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

  useEffect(() => {
    document.documentElement.dataset.hrmFontSize = fontSizeMode;
    window.localStorage.setItem(fontSizeStorageKey, fontSizeMode);
  }, [fontSizeMode]);

  function selectFontSize(mode: FontSizeMode) {
    setFontSizeMode(mode);
    notifications.show({
      color: 'green',
      message: `Đã áp dụng cỡ chữ ${mode === 'small' ? 'nhỏ' : mode === 'large' ? 'lớn' : 'vừa'}.`,
    });
  }

  function selectLanguage(mode: LanguageMode) {
    setLanguageMode(mode);
    window.localStorage.setItem(languageStorageKey, mode);
    notifications.show({
      color: 'green',
      message: `Đã chọn ngôn ngữ ${
        mode === 'vi' ? 'Tiếng Việt' : mode === 'en' ? 'English' : 'theo hệ thống'
      }.`,
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
    <Box
      className="settings-zalo-stage"
      onClick={(event) => {
        if (event.currentTarget === event.target) {
          navigate(-1);
        }
      }}
    >
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
                    <Icon size={16} stroke={1.9} />
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

              <div>
                <Title order={3} className="settings-zalo-section-title" mb="sm">Cỡ chữ</Title>
                <div className="settings-zalo-section-card settings-zalo-font-size">
                  {fontSizeOptions.map((option) => {
                    const selected = fontSizeMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`settings-zalo-font-choice is-${option.value}${selected ? ' is-selected' : ''}`}
                        onClick={() => selectFontSize(option.value)}
                      >
                        <span className="settings-zalo-font-sample">{option.sample}</span>
                        <Group gap="xs" justify="center">
                          <span className={`settings-zalo-radio${selected ? ' is-selected' : ''}`} />
                          <Text size="sm">{option.label}</Text>
                        </Group>
                      </button>
                    );
                  })}
                </div>
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
                <Title order={2} className="settings-zalo-content-title">Cài đặt chung</Title>
                <Text size="sm" c="dimmed">Runtime config đang dùng trong phiên hiện tại.</Text>
              </div>

              <div>
                <Group justify="space-between" mb="sm">
                  <Title order={3} className="settings-zalo-section-title">Cấu hình vận hành</Title>
                  <Badge variant="light" color="gray" className="settings-zalo-badge">Runtime</Badge>
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

          {activeSection === 'language' ? (
            <Stack gap="xl">
              <div>
                <Title order={2} className="settings-zalo-content-title">Ngôn ngữ</Title>
                <Text className="settings-zalo-subtitle">Chọn ngôn ngữ hiển thị trong ứng dụng.</Text>
              </div>

              <div>
                <Title order={3} className="settings-zalo-section-title" mb="sm">Ngôn ngữ hiển thị</Title>
                <div className="settings-zalo-language-panel">
                  <Group justify="space-between" className="settings-zalo-language-current">
                    <div>
                      <Text size="sm" c="dimmed">Đang áp dụng</Text>
                      <Text size="sm">{selectedLanguage.label}</Text>
                    </div>
                    <Badge variant="light" color="blue">{selectedLanguage.locale}</Badge>
                  </Group>

                  <div className="settings-zalo-language-grid">
                    {languageOptions.map((option) => {
                    const selected = languageMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`settings-zalo-language-card${selected ? ' is-selected' : ''}`}
                        onClick={() => selectLanguage(option.value)}
                      >
                        <span className="settings-zalo-language-locale">{option.locale}</span>
                        <span className="settings-zalo-language-copy">
                          <Text size="sm">{option.label}</Text>
                          <Text size="xs" c="dimmed">{option.description}</Text>
                        </span>
                        <span className={`settings-zalo-radio${selected ? ' is-selected' : ''}`} />
                      </button>
                    );
                  })}
                  </div>

                  <Group justify="space-between" className="settings-zalo-language-browser">
                    <Text size="sm" c="dimmed">Ngôn ngữ trình duyệt</Text>
                    <Text size="sm">{browserLanguage}</Text>
                  </Group>
                </div>
              </div>
            </Stack>
          ) : null}

          {activeSection === 'session' ? (
            <Stack gap="xl">
              <div>
                <Title order={2} className="settings-zalo-content-title">Tài khoản và bảo mật</Title>
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
              <Title order={2} className="settings-zalo-content-title">
                {settingsSections.find((item) => item.key === activeSection)?.label}
              </Title>
              <div className="settings-zalo-section-card">
                <Group justify="space-between" className="settings-zalo-row">
                  <Text size="sm">Cấu hình sẽ được đồng bộ theo quyền và API tương ứng.</Text>
                  <Badge variant="light" color="gray" className="settings-zalo-badge">Sắp có</Badge>
                </Group>
              </div>
            </Stack>
          ) : null}
        </section>
      </Box>
    </Box>
  );
}
