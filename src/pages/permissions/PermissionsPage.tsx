import { useState } from 'react';
import {
  Accordion,
  Badge,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconKey, IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import { getPermissionsGrouped } from '../../features/auth-admin/authAdminApi';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';

const DOMAIN_LABELS: Record<string, string> = {
  hr: 'HRM',
  auth: 'Auth / IAM',
  admin: 'Admin',
  chat: 'Chat',
  system: 'System',
  other: 'Khác',
};

export function PermissionsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['auth-admin-permissions-grouped'],
    queryFn: getPermissionsGrouped,
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => void refetch()} />;

  const term = search.toLowerCase().trim();

  const filteredSystems = (data?.systems ?? [])
    .map((system) => ({
      ...system,
      permissions: system.permissions.filter(
        (p) =>
          !term ||
          p.key.toLowerCase().includes(term) ||
          (p.description ?? '').toLowerCase().includes(term),
      ),
    }))
    .filter((s) => s.permissions.length > 0);

  return (
    <Stack gap="md">
      <PageHeader
        title="Danh sách Permission"
        subtitle={`Tổng cộng ${data?.total ?? 0} quyền, phân nhóm theo hệ thống`}
        breadcrumbs={['Hệ thống', 'Permission']}
      />

      <TextInput
        placeholder="Tìm theo key hoặc mô tả..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        w={320}
      />

      {filteredSystems.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl">
          Không tìm thấy permission nào khớp
        </Text>
      ) : (
        <Accordion multiple defaultValue={filteredSystems.map((s) => s.domain)} variant="separated">
          {filteredSystems.map((system) => (
            <Accordion.Item key={system.domain} value={system.domain}>
              <Accordion.Control>
                <Group gap="sm">
                  <IconKey size={16} />
                  <Title order={5}>
                    {DOMAIN_LABELS[system.domain] ?? system.domain.toUpperCase()}
                  </Title>
                  <Badge variant="light" size="sm" color="blue">
                    {system.permissions.length} quyền
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  {system.permissions.map((p) => (
                    <Card key={p.id} p="sm" withBorder radius="sm">
                      <Group justify="space-between" wrap="nowrap">
                        <Text size="sm" ff="monospace" fw={500} c="blue">
                          {p.key}
                        </Text>
                        {p.description && (
                          <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                            {p.description}
                          </Text>
                        )}
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Stack>
  );
}
