import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
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
  IconId,
  IconKey,
  IconLanguage,
  IconMoon,
  IconPalette,
  IconSettings,
  IconShield,
  IconSun,
  IconUserCheck,
  IconUsersGroup,
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
import {
  applyAppLanguage,
  readAppLanguageMode,
  translateUiText,
  writeAppLanguageMode,
  type AppLanguageMode,
} from '../../shared/i18n/appLanguage';
import { formatList } from '../../shared/utils/format';
import { useNavigate } from 'react-router-dom';

type ThemeMode = 'light' | 'dark' | 'auto';
type FontSizeMode = 'small' | 'medium' | 'large';
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
  value: AppLanguageMode;
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

function formatDataScopes(scopes: AuthUser['dataScopes'] | undefined) {
  return formatList(
    scopes?.map((scope) =>
      [scope.scopeType, scope.unitId, scope.departmentId]
        .filter(Boolean)
        .join(':'),
    ),
  );
}

function DescriptionCard({ title, rows }: { title: string; rows: [string, ReactNode][] }) {
  return (
    <Paper className="page-card" p="lg" radius="md">
      <Stack gap="sm">
        <Title order={4}>{title}</Title>
        <Table variant="vertical" withRowBorders={false}>
          <Table.Tbody>
            {rows.map(([label, value]) => (
              <Table.Tr key={label}>
                <Table.Th w={220}>
                  <Text size="sm" c="dimmed" fw={500}>
                    {label}
                  </Text>
                </Table.Th>
                <Table.Td>
                  <Text size="sm">{value || '-'}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
}

export function SettingsPage() {
  const { user, roles } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [fontSizeMode, setFontSizeMode] = useState<FontSizeMode>(() => readFontSizeMode());
  const [languageMode, setLanguageMode] = useState<AppLanguageMode>(() => readAppLanguageMode());
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
  const accountName = user?.fullName ?? user?.email ?? '-';
  const accountEmail = user?.email ?? '-';
  const accountStatus = user?.accountStatus ?? user?.account_status ?? '-';
  const authUserId = user?.authUserId ?? user?.externalAuthUserId ?? '-';
  const employeeId = user?.employeeId ?? '-';
  const rolesText = formatList(roles);
  const dataScopesText = formatDataScopes(user?.dataScopes);
  const accountInitial = accountName && accountName !== '-' ? accountName.charAt(0).toUpperCase() : 'H';
  const accountDetailItems = [
    { icon: IconUserCheck, label: 'User', value: accountName },
    { icon: IconId, label: 'Auth user ID', value: authUserId },
    { icon: IconShield, label: 'Account status', value: accountStatus },
    { icon: IconId, label: 'Employee ID', value: employeeId ?? '-' },
    { icon: IconUsersGroup, label: 'Roles', value: rolesText },
    { icon: IconKey, label: 'Data scopes', value: dataScopesText },
  ];
  const selectedLanguage =
    languageOptions.find((option) => option.value === languageMode) ?? languageOptions[0];
  const browserLanguage = typeof navigator === 'undefined' ? '-' : navigator.language;
  const t = (value: string) => translateUiText(value, languageMode);

  const settingsSections: Array<{
    key: SettingsSection;
    label: string;
    icon: typeof IconSun;
  }> = [
    {
      key: 'general',
      label: t('Cài đặt chung'),
      icon: IconSettings,
    },
    {
      key: 'session',
      label: t('Tài khoản và bảo mật'),
      icon: IconShield,
    },
    {
      key: 'language',
      label: t('Ngôn ngữ'),
      icon: IconLanguage,
    },
    {
      key: 'data',
      label: t('Quản lý dữ liệu'),
      icon: IconDatabase,
    },
    {
      key: 'appearance',
      label: t('Giao diện'),
      icon: IconPalette,
    },
    ...(readableNotificationEvents.length > 0
      ? [{
          key: 'notifications' as const,
          label: t('Thông báo'),
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

  useEffect(() => {
    applyAppLanguage(languageMode);
  }, [languageMode]);

  function selectFontSize(mode: FontSizeMode) {
    setFontSizeMode(mode);
    notifications.show({
      color: 'green',
      message: `Đã áp dụng cỡ chữ ${mode === 'small' ? 'nhỏ' : mode === 'large' ? 'lớn' : 'vừa'}.`,
    });
  }

  function selectLanguage(mode: AppLanguageMode) {
    setLanguageMode(mode);
    writeAppLanguageMode(mode);
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
          <Title order={1} className="settings-zalo-title">{t('Cài đặt')}</Title>
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
            aria-label={t('Cài đặt')}
            onClick={() => navigate(-1)}
          >
            <IconX size={28} />
          </ActionIcon>

          {activeSection === 'appearance' ? (
            <Stack gap="xl">
              <Title order={2} className="settings-zalo-content-title">{t('Cài đặt giao diện')}</Title>

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
                          {option.value === 'light' ? t('Sáng') : option.value === 'dark' ? t('Tối') : t('Theo hệ thống')}
                        </Text>
                      </Group>
                    </button>
                  );
                })}
              </div>



              <div>
                <Title order={3} className="settings-zalo-section-title" mb="sm">{t('Cỡ chữ')}</Title>
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
                          <Text size="sm">{t(option.label)}</Text>
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
                <Title order={2} className="settings-zalo-content-title">{t('Cài đặt thông báo')}</Title>
                <Text className="settings-zalo-subtitle">{t('Nhận được thông báo mỗi khi có cập nhật mới trong HRM')}</Text>
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
                        <Text size="sm">{t(option.label)}</Text>
                      </Group>
                    </button>
                  );
                })}
              </div>

              <div>
                <Title order={3} className="settings-zalo-section-title" mb="sm">{t('Âm thanh thông báo')}</Title>
                <Group justify="space-between" className="settings-zalo-section-card settings-zalo-row">
                  <Text size="sm">{t('Phát âm thanh khi có tin nhắn & thông báo mới')}</Text>
                  <Switch
                    color="blue"
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
                <Title order={2} className="settings-zalo-content-title">{t('Cài đặt chung')}</Title>
                <Text size="sm" c="dimmed">{t('Runtime config đang dùng trong phiên hiện tại.')}</Text>
              </div>

              <div>
                <Group justify="space-between" mb="sm">
                  <Title order={3} className="settings-zalo-section-title">{t('Cấu hình vận hành')}</Title>
                  <Badge variant="light" color="gray" className="settings-zalo-badge">{t('Runtime')}</Badge>
                </Group>
                <Stack gap={0} className="settings-zalo-section-card">
                {runtimeItems.map((item) => (
                  <Group key={item.label} justify="space-between" gap="md" className="settings-zalo-row">
                    <Text size="sm" c="dimmed">{t(item.label)}</Text>
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
                <Title order={2} className="settings-zalo-content-title">{t('Ngôn ngữ')}</Title>
                <Text className="settings-zalo-subtitle">{t('Chọn ngôn ngữ hiển thị trong ứng dụng.')}</Text>
              </div>

              <div>
                <Title order={3} className="settings-zalo-section-title" mb="sm">{t('Ngôn ngữ hiển thị')}</Title>
                <div className="settings-zalo-language-panel">
                  <Group justify="space-between" className="settings-zalo-language-current">
                    <div>
                      <Text size="sm" c="dimmed">{t('Đang áp dụng')}</Text>
                      <Text size="sm">{t(selectedLanguage.label)}</Text>
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
                          <Text size="sm">{t(option.label)}</Text>
                          <Text size="xs" c="dimmed">{t(option.description)}</Text>
                        </span>
                        <span className={`settings-zalo-radio${selected ? ' is-selected' : ''}`} />
                      </button>
                    );
                  })}
                  </div>

                  <Group justify="space-between" className="settings-zalo-language-browser">
                    <Text size="sm" c="dimmed">{t('Ngôn ngữ trình duyệt')}</Text>
                    <Text size="sm">{browserLanguage}</Text>
                  </Group>
                </div>
              </div>
            </Stack>
          ) : null}

          {activeSection === 'session' ? (
            <Stack gap="xl">
              <div>
                <Title order={2} className="settings-zalo-content-title">{t('Tài khoản và bảo mật')}</Title>
                <Text size="sm" c="dimmed">{t('Thông tin nhận diện tài khoản HRM đang đăng nhập.')}</Text>
              </div>

              <div className="settings-zalo-account-summary">
                <span className="settings-zalo-account-avatar" aria-hidden="true">{accountInitial}</span>
                <div className="settings-zalo-account-copy">
                  <Text className="settings-zalo-account-name">{accountName}</Text>
                  <Text className="settings-zalo-account-email">{accountEmail}</Text>
                </div>
                <Badge variant="light" color="blue" className="settings-zalo-badge">
                  {accountStatus}
                </Badge>
                <div className="settings-zalo-account-meta">
                  <span>Roles: {rolesText}</span>
                  <span>Data scopes: {dataScopesText}</span>
                </div>
              </div>

              <div className="settings-zalo-account-grid">
                {accountDetailItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="settings-zalo-account-card">
                      <span className="settings-zalo-account-card-icon" aria-hidden="true">
                        <Icon size={16} stroke={1.8} />
                      </span>
                      <Text className="settings-zalo-account-card-label">{item.label}</Text>
                      <Text className="settings-zalo-account-card-value" truncate="end">{item.value}</Text>
                    </div>
                  );
                })}
              </div>
            </Stack>
          ) : null}

          {activeSection === 'data' ? (
            <Stack gap="xl">
              <Title order={2} className="settings-zalo-content-title">
                {settingsSections.find((item) => item.key === activeSection)?.label}
              </Title>
              <div className="settings-zalo-section-card">
                <Group justify="space-between" className="settings-zalo-row">
                  <Text size="sm">{t('Cấu hình sẽ được đồng bộ theo quyền và API tương ứng.')}</Text>
                  <Badge variant="light" color="gray" className="settings-zalo-badge">{t('Sắp có')}</Badge>
                </Group>
              </div>
            </Stack>
          ) : null}
        </section>
      </Box>
    </Box>
  );
}
