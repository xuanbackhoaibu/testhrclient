import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Pagination,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconEdit,
  IconLogin,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import type { AuditLog } from '../../features/audit/auditTypes';
import { useAuditLogs } from '../../features/audit/useAuditLogs';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { ROUTES } from '../../shared/constants/routes';
import { formatDateTime } from '../../shared/utils/date';

const ENTITY_OPTIONS = ['EMPLOYEE', 'LEAVE_REQUEST', 'DEPARTMENT', 'UNIT', 'CONTRACT', 'IMPORT_BATCH', 'ATTENDANCE', 'MOVEMENT'];
const ACTION_OPTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'SUBMIT', 'APPROVE', 'REJECT', 'UPLOAD'];

function actionMeta(action: string) {
  const normalized = action.toUpperCase();
  if (normalized.includes('CREATE') || normalized.includes('PROVISION')) return { color: 'green', label: 'Tạo', icon: IconPlus };
  if (normalized.includes('DELETE') || normalized.includes('REMOVE') || normalized.includes('DEACTIVATE')) return { color: 'red', label: 'Xóa', icon: IconTrash };
  if (normalized.includes('LOGIN') || normalized.includes('AUTH')) return { color: 'grape', label: 'Đăng nhập', icon: IconLogin };
  return { color: 'hacomRed', label: 'Sửa', icon: IconEdit };
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'HT';
}

function entityRoute(log: AuditLog) {
  switch (log.entityType) {
    case 'EMPLOYEE':
      return `${ROUTES.employees}/${log.entityId}`;
    case 'CONTRACT':
      return `${ROUTES.contracts}?id=${encodeURIComponent(log.entityId)}`;
    case 'LEAVE_REQUEST':
      return `${ROUTES.leave}?id=${encodeURIComponent(log.entityId)}`;
    case 'DEPARTMENT':
      return ROUTES.departments;
    case 'UNIT':
      return ROUTES.units;
    case 'MOVEMENT':
      return `${ROUTES.movements}?id=${encodeURIComponent(log.entityId)}`;
    case 'ATTENDANCE':
      return `${ROUTES.attendance}?id=${encodeURIComponent(log.entityId)}`;
    default:
      return null;
  }
}

function changedFields(log: AuditLog) {
  const before = log.beforeJson ?? {};
  const after = log.afterJson ?? {};
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).map((field) => {
    const beforeValue = before[field];
    const afterValue = after[field];
    return {
      field,
      beforeValue,
      afterValue,
      changed: JSON.stringify(beforeValue) !== JSON.stringify(afterValue),
    };
  });
}

function renderValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function AuditLogsPage() {
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 20,
    entityType: undefined as string | undefined,
    entityId: undefined as string | undefined,
    action: undefined as string | undefined,
    actorUserId: undefined as string | undefined,
    fromDate: undefined as string | undefined,
    toDate: undefined as string | undefined,
    search: '',
  });
  const { data, isLoading, error, refetch } = useAuditLogs(params);

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const stats = useMemo(() => {
    return items.reduce(
      (acc, log) => {
        const action = log.action.toUpperCase();
        if (action.includes('CREATE') || action.includes('PROVISION')) acc.create += 1;
        else if (action.includes('DELETE') || action.includes('REMOVE') || action.includes('DEACTIVATE')) acc.delete += 1;
        else if (action.includes('LOGIN') || action.includes('AUTH')) acc.login += 1;
        else acc.update += 1;
        return acc;
      },
      { create: 0, update: 0, delete: 0, login: 0 },
    );
  }, [items]);

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageHeader title="Nhật ký audit" subtitle="Theo dõi ai thay đổi thực thể nào và trước/sau ra sao." />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          {[
            { label: 'Tạo', value: stats.create, color: 'green', icon: IconPlus },
            { label: 'Sửa', value: stats.update, color: 'hacomRed', icon: IconEdit },
            { label: 'Xóa', value: stats.delete, color: 'red', icon: IconTrash },
            { label: 'Đăng nhập', value: stats.login, color: 'grape', icon: IconLogin },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Paper key={card.label} withBorder p="md" className="audit-stat-card">
                <Group justify="space-between">
                  <Box>
                    <Text size="xs" c="dimmed" fw={800}>{card.label}</Text>
                    <Title order={3}>{card.value}</Title>
                  </Box>
                  <Avatar color={card.color} variant="light" radius="xl">
                    <Icon size={20} />
                  </Avatar>
                </Group>
              </Paper>
            );
          })}
        </SimpleGrid>

        <Paper withBorder p="md" className="audit-filter-panel">
          <SimpleGrid cols={{ base: 1, md: 3, xl: 6 }} spacing="sm">
            <Select
              label="Loại thực thể"
              placeholder="Tất cả"
              clearable
              data={ENTITY_OPTIONS.map((item) => ({ value: item, label: item }))}
              value={params.entityType ?? null}
              onChange={(value) => setParams((current) => ({ ...current, entityType: value ?? undefined, page: 1 }))}
            />
            <TextInput
              label="ID thực thể"
              placeholder="employee id..."
              value={params.entityId ?? ''}
              onChange={(event) => setParams((current) => ({ ...current, entityId: event.currentTarget.value || undefined, page: 1 }))}
            />
            <Select
              label="Hành động"
              placeholder="Tất cả"
              clearable
              data={ACTION_OPTIONS.map((item) => ({ value: item, label: item }))}
              value={params.action ?? null}
              onChange={(value) => setParams((current) => ({ ...current, action: value ?? undefined, page: 1 }))}
            />
            <TextInput
              label="Người thực hiện"
              placeholder="ID hoặc tên"
              value={params.actorUserId ?? ''}
              onChange={(event) => setParams((current) => ({ ...current, actorUserId: event.currentTarget.value || undefined, page: 1 }))}
            />
            <TextInput
              label="Từ ngày"
              type="date"
              value={params.fromDate ?? ''}
              onChange={(event) => setParams((current) => ({ ...current, fromDate: event.currentTarget.value || undefined, page: 1 }))}
            />
            <TextInput
              label="Đến ngày"
              type="date"
              value={params.toDate ?? ''}
              onChange={(event) => setParams((current) => ({ ...current, toDate: event.currentTarget.value || undefined, page: 1 }))}
            />
          </SimpleGrid>
          <TextInput
            mt="sm"
            leftSection={<IconSearch size={16} />}
            placeholder="Tìm loại thực thể, người thao tác, ID thực thể"
            value={params.search}
            onChange={(event) => setParams((current) => ({ ...current, search: event.currentTarget.value, page: 1 }))}
          />
        </Paper>

        <Paper withBorder className="audit-feed-shell">
          <Stack gap={0}>
            {items.map((log) => {
              const meta = actionMeta(log.action);
              const Icon = meta.icon;
              const route = entityRoute(log);
              return (
                <Group key={log.id} align="flex-start" gap="md" p="md" className="audit-feed-item" wrap="nowrap">
                  <Avatar radius="xl" color={meta.color}>{initials(log.actorName)}</Avatar>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" mb={4}>
                      <Text fw={800}>{log.actorName || 'Hệ thống'}</Text>
                      <Badge color={meta.color} variant="light" leftSection={<Icon size={12} />}>{log.action}</Badge>
                      <Text size="xs" c="dimmed">{relativeTime(log.createdAt)}</Text>
                    </Group>
                    <Text size="sm">
                      Tác động tới{' '}
                      {route ? (
                        <Text component={Link} to={route} span fw={750} className="audit-entity-link">
                          {log.entityType} · {log.entityId}
                        </Text>
                      ) : (
                        <Text span fw={750}>{log.entityType} · {log.entityId}</Text>
                      )}
                    </Text>
                    <Text size="xs" c="dimmed">{formatDateTime(log.createdAt)}</Text>
                  </Box>
                  <Button size="xs" variant="light" onClick={() => setSelected(log)}>
                    So sánh
                  </Button>
                </Group>
              );
            })}
            {items.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">Không có nhật ký phù hợp với bộ lọc.</Text>
            ) : null}
          </Stack>
        </Paper>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">{data.pagination.total} bản ghi</Text>
          <Pagination
            total={Math.max(1, data.pagination.totalPages)}
            value={data.pagination.page}
            onChange={(page) => setParams((current) => ({ ...current, page }))}
          />
        </Group>
      </Stack>

      <Modal
        opened={Boolean(selected)}
        title="So sánh thay đổi"
        size="xl"
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <Stack gap="md">
            <Group>
              <Badge variant="light">{selected.entityType}</Badge>
              <Badge variant="light" color={actionMeta(selected.action).color}>{selected.action}</Badge>
              <Text size="sm" c="dimmed">{selected.actorName} · {formatDateTime(selected.createdAt)}</Text>
            </Group>
            <Table withTableBorder className="audit-diff-table">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Trường</Table.Th>
                  <Table.Th>Trước</Table.Th>
                  <Table.Th>Sau</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {changedFields(selected).map((field) => (
                  <Table.Tr key={field.field} className={field.changed ? 'audit-diff-changed' : undefined}>
                    <Table.Td><Text fw={700}>{field.field}</Text></Table.Td>
                    <Table.Td><pre className="audit-diff-value">{renderValue(field.beforeValue)}</pre></Table.Td>
                    <Table.Td><pre className="audit-diff-value">{renderValue(field.afterValue)}</pre></Table.Td>
                  </Table.Tr>
                ))}
                {changedFields(selected).length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Text c="dimmed" ta="center">Không có dữ liệu before/after.</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : null}
              </Table.Tbody>
            </Table>
          </Stack>
        ) : null}
      </Modal>
    </>
  );
}
