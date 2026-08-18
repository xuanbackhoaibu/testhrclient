import type { ReactNode } from 'react';
import { Paper, Stack, Table, Text, Title } from '@mantine/core';

import type { AuthUser } from '../../features/auth/types';
import { useAuth } from '../../features/auth/useAuth';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatList } from '../../shared/utils/format';

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

  return (
    <>
      <PageHeader title="Settings" subtitle="Hiển thị runtime config và session context hiện tại." />
      <Stack gap="md">
        <DescriptionCard
          title="Application config"
          rows={[
            ['API base URL', import.meta.env.VITE_API_BASE_URL],
            ['Auth mode', import.meta.env.VITE_AUTH_MODE],
            ['Mock mode', import.meta.env.VITE_USE_MOCKS],
            [
              'Auth service base URL',
              import.meta.env.VITE_AUTH_SERVICE_BASE_URL ?? import.meta.env.VITE_CHAT_AUTH_BASE_URL,
            ],
            [
              'Auth service login URL',
              import.meta.env.VITE_AUTH_SERVICE_LOGIN_URL ?? import.meta.env.VITE_CHAT_AUTH_LOGIN_URL,
            ],
            [
              'Auth service redirect URI',
              import.meta.env.VITE_AUTH_SERVICE_REDIRECT_URI ?? import.meta.env.VITE_CHAT_AUTH_REDIRECT_URI,
            ],
          ]}
        />
        <DescriptionCard
          title="Current user"
          rows={[
            ['User', user?.fullName ?? '-'],
            ['Email', user?.email ?? '-'],
            ['Auth user ID', user?.authUserId ?? user?.externalAuthUserId ?? '-'],
            ['Account status', user?.accountStatus ?? user?.account_status ?? '-'],
            ['Employee ID', user?.employeeId ?? '-'],
            ['Roles', formatList(roles)],
            ['Data scopes', formatDataScopes(user?.dataScopes)],
          ]}
        />
        <Text c="dimmed" size="sm">
          Frontend không gọi POST /auth/login của HRM backend. Real mode dùng dịch vụ xác thực bên ngoài và sau đó gọi GET /auth/me của HR API để lấy HRM profile.
        </Text>
      </Stack>
    </>
  );
}
