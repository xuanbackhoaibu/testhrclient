import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Slider,
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
  IconMail,
  IconMoon,
  IconPalette,
  IconRefresh,
  IconShieldLock,
  IconSun,
} from '@tabler/icons-react';

import { AUTH_ADMIN_PERMISSIONS, HR_PERMISSIONS } from '../../features/auth/permissions';
import type { AuthUser } from '../../features/auth/types';
import { useAuth } from '../../features/auth/useAuth';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatList } from '../../shared/utils/format';

type ThemeMode = 'light' | 'dark' | 'auto';
type NotificationChannel = 'email' | 'push';
type NotificationEvent = 'leave' | 'contract' | 'import' | 'security';

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

type NotificationSettings = {
  matrix: Record<NotificationEvent, Record<NotificationChannel, boolean>>;
  quietFrom: string;
  quietTo: string;
};

type PasswordSettings = {
  minLength: number;
  requireSpecial: boolean;
  requireNumber: boolean;
  expireDays: number;
};

type SettingsSnapshot = {
  company: CompanySettings;
  visual: VisualSettings;
  notifications: NotificationSettings;
  password: PasswordSettings;
};

const notificationEvents: Array<{ key: NotificationEvent; label: string; description: string }> = [
  { key: 'leave', label: 'Đơn nghỉ phép', description: 'Có đơn mới, duyệt/từ chối đơn.' },
  { key: 'contract', label: 'Hợp đồng', description: 'Sắp hết hạn, cần gia hạn hoặc đánh giá.' },
  { key: 'import', label: 'Import Excel', description: 'Hoàn tất, lỗi một phần, thất bại.' },
  { key: 'security', label: 'Bảo mật', description: 'Đăng nhập lạ, khóa tài khoản, đổi mật khẩu.' },
];

const themeCards: Array<{ key: ThemeMode; title: string; description: string; icon: typeof IconSun }> = [
  { key: 'light', title: 'Light', description: 'Nền sáng, tương phản cao cho ban ngày.', icon: IconSun },
  { key: 'dark', title: 'Dark', description: 'Nền tối dịu mắt khi làm việc buổi tối.', icon: IconMoon },
  { key: 'auto', title: 'Auto', description: 'Theo thiết lập hệ điều hành của người dùng.', icon: IconPalette },
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
    notifications: {
      matrix: {
        leave: { email: true, push: true },
        contract: { email: true, push: true },
        import: { email: true, push: false },
        security: { email: true, push: true },
      },
      quietFrom: '22:00',
      quietTo: '07:00',
    },
    password: {
      minLength: 10,
      requireSpecial: true,
      requireNumber: true,
      expireDays: 90,
    },
  };
}

function buildSamplePassword(settings: PasswordSettings) {
  const base = 'HacomSecure';
  const numberPart = settings.requireNumber ? '24' : '';
  const specialPart = settings.requireSpecial ? '@' : '';
  const sample = `${base}${numberPart}${specialPart}`;
  return sample.padEnd(settings.minLength, 'x');
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
  const canManageNotifications = isSystemAdmin || canAny([
    HR_PERMISSIONS.AUDIT_READ,
    AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
  ]);
  const canManagePasswordPolicy = isSystemAdmin || canAny([
    HR_PERMISSIONS.ACCOUNT_RESET_PASSWORD,
    AUTH_ADMIN_PERMISSIONS.USERS_UPDATE,
    AUTH_ADMIN_PERMISSIONS.ROLES_MANAGE,
  ]);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(saved);
  const passwordPreview = buildSamplePassword(settings.password);

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

  function updatePasswordRule(key: 'requireSpecial' | 'requireNumber', value: boolean) {
    setSettings((current) => ({
      ...current,
      password: { ...current.password, [key]: value },
    }));
  }

  function saveSettings() {
    setSaved(settings);
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
        <Card withBorder className="settings-panel">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Title order={4}>Phạm vi thao tác hiện tại</Title>
              <Text size="sm" c="dimmed">
                Settings được chia theo quyền: cá nhân được đổi giao diện, quản trị mới được sửa cấu hình hệ thống.
              </Text>
            </Box>
            <Badge color={isSystemAdmin ? 'green' : 'blue'} variant="light">
              {isSystemAdmin ? 'System admin' : 'Theo quyền được cấp'}
            </Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm" mt="md">
            {[
              { label: 'Thông tin công ty', allowed: canManageCompany, visible: true },
              { label: 'Giao diện cá nhân', allowed: true, visible: true },
              { label: 'Thông báo hệ thống', allowed: canManageNotifications, visible: canManageNotifications },
              { label: 'Chính sách mật khẩu', allowed: canManagePasswordPolicy, visible: canManagePasswordPolicy },
            ].filter((item) => item.visible).map((item) => (
              <Paper key={item.label} withBorder p="sm" className="settings-access-card">
                <Text size="sm" fw={800}>{item.label}</Text>
                <Badge mt={6} color={item.allowed ? 'green' : 'gray'} variant="light">
                  {item.allowed ? 'Được thao tác' : 'Chỉ xem'}
                </Badge>
              </Paper>
            ))}
          </SimpleGrid>
        </Card>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <Card withBorder className="settings-panel">
            <SettingsCardHeader
              icon={<IconBuilding size={18} />}
              title="Thông tin công ty"
              subtitle="Thông tin hiển thị trong báo cáo, email và hồ sơ nội bộ."
              badge={canManageCompany ? 'Có quyền sửa' : 'Chỉ quản trị'}
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
                badge="Có quyền sửa"
              />
              <Table className="settings-notification-table">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Sự kiện</Table.Th>
                    <Table.Th><Group gap={6}><IconMail size={15} /> Email</Group></Table.Th>
                    <Table.Th><Group gap={6}><IconBell size={15} /> Push</Group></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {notificationEvents.map((event) => (
                    <Table.Tr key={event.key}>
                      <Table.Td>
                        <Text fw={700}>{event.label}</Text>
                        <Text size="xs" c="dimmed">{event.description}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Switch
                          checked={settings.notifications.matrix[event.key].email}
                          onChange={(change) => updateNotification(event.key, 'email', change.currentTarget.checked)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Switch
                          checked={settings.notifications.matrix[event.key].push}
                          onChange={(change) => updateNotification(event.key, 'push', change.currentTarget.checked)}
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Group mt="md" grow align="flex-start">
                <TimeInput
                  label="Bắt đầu"
                  value={settings.notifications.quietFrom}
                  onChange={(event) => updateQuietHours('quietFrom', event.currentTarget.value)}
                />
                <TimeInput
                  label="Kết thúc"
                  value={settings.notifications.quietTo}
                  onChange={(event) => updateQuietHours('quietTo', event.currentTarget.value)}
                />
              </Group>
            </Card>
          ) : null}

          {canManagePasswordPolicy ? (
            <Card withBorder className="settings-panel">
              <SettingsCardHeader
                icon={<IconShieldLock size={18} />}
                title="Chính sách mật khẩu"
                subtitle="Thiết lập yêu cầu tối thiểu để giảm rủi ro tài khoản yếu."
                badge={`${settings.password.expireDays} ngày`}
              />
              <Stack gap="md">
                <Box>
                  <Group justify="space-between" mb={6}>
                    <Text fw={700}>Độ dài tối thiểu</Text>
                    <Badge variant="light">{settings.password.minLength} ký tự</Badge>
                  </Group>
                  <Slider
                    min={8}
                    max={20}
                    step={1}
                    value={settings.password.minLength}
                    marks={[
                      { value: 8, label: '8' },
                      { value: 12, label: '12' },
                      { value: 16, label: '16' },
                      { value: 20, label: '20' },
                    ]}
                    onChange={(value) =>
                      setSettings((current) => ({
                        ...current,
                        password: { ...current.password, minLength: value },
                      }))
                    }
                  />
                </Box>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <Switch
                    checked={settings.password.requireSpecial}
                    label="Yêu cầu ký tự đặc biệt"
                    onChange={(event) => updatePasswordRule('requireSpecial', event.currentTarget.checked)}
                  />
                  <Switch
                    checked={settings.password.requireNumber}
                    label="Yêu cầu chữ số"
                    onChange={(event) => updatePasswordRule('requireNumber', event.currentTarget.checked)}
                  />
                </SimpleGrid>
                <NumberInput
                  label="Chu kỳ hết hạn mật khẩu"
                  min={30}
                  max={180}
                  suffix=" ngày"
                  value={settings.password.expireDays}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      password: { ...current.password, expireDays: Number(value) || 90 },
                    }))
                  }
                />
                <Paper withBorder p="md" className="settings-password-preview">
                  <Text size="xs" c="dimmed" fw={800}>Preview mật khẩu mẫu</Text>
                  <Group justify="space-between" mt={4}>
                    <Text ff="monospace" fw={800}>{passwordPreview}</Text>
                    <Badge color={passwordPreview.length >= settings.password.minLength ? 'green' : 'red'} variant="light">
                      {passwordPreview.length} ký tự
                    </Badge>
                  </Group>
                </Paper>
              </Stack>
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
