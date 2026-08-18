import { useMemo, useState } from 'react';
import { Button, Grid, Modal, Paper, Select, Stack, Text, TextInput } from '@mantine/core';

import type { AuditLog } from '../../features/audit/auditTypes';
import { useAuditLogs } from '../../features/audit/useAuditLogs';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { NormalizedSearchInput } from '../../shared/components/NormalizedSearchInput';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatDateTime } from '../../shared/utils/date';
import { HrmDateInput } from '../../shared/components/HrmDateInput';

const ENTITY_TYPES = ['EMPLOYEE', 'LEAVE_REQUEST', 'DEPARTMENT', 'UNIT', 'CONTRACT', 'IMPORT_BATCH'];

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

  const columns = useMemo<DataTableColumn<AuditLog>[]>(
    () => [
      { key: 'entityType', header: 'Loại thực thể', render: (record) => record.entityType },
      { key: 'entityId', header: 'ID thực thể', render: (record) => record.entityId },
      { key: 'action', header: 'Hành động', render: (record) => record.action },
      { key: 'actorName', header: 'Người thao tác', render: (record) => record.actorName },
      { key: 'createdAt', header: 'Thời điểm tạo', render: (record) => formatDateTime(record.createdAt) },
      {
        key: 'actions',
        header: 'Thao tác',
        render: (record) => (
          <Button size="xs" variant="light" onClick={() => setSelected(record)}>
            Chi tiết
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="Nhật ký audit" subtitle="Theo dõi ai thay đổi thực thể nào và trước/sau ra sao." />
      <Paper className="page-card" p="lg" radius="md">
        <Stack gap="md">
          <Grid gap="sm">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                clearable
                placeholder="Loại thực thể"
                aria-label="Loại thực thể"
                data={ENTITY_TYPES}
                value={params.entityType ?? null}
                onChange={(value) =>
                  setParams((current) => ({ ...current, page: 1, entityType: value ?? undefined }))
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                placeholder="ID thực thể"
                aria-label="ID thực thể"
                onChange={(event) => {
                  const value = event.currentTarget.value || undefined;
                  setParams((current) => ({ ...current, page: 1, entityId: value }));
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                placeholder="Hành động"
                aria-label="Hành động"
                onChange={(event) => {
                  const value = event.currentTarget.value || undefined;
                  setParams((current) => ({ ...current, page: 1, action: value }));
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                placeholder="ID người thao tác"
                aria-label="ID người thao tác"
                onChange={(event) => {
                  const value = event.currentTarget.value || undefined;
                  setParams((current) => ({ ...current, page: 1, actorUserId: value }));
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <HrmDateInput
                value={params.fromDate ?? null}
                onChange={(value) =>
                  setParams((current) => ({ ...current, page: 1, fromDate: value ?? undefined }))
                }
                placeholder="Từ ngày"
                aria-label="Từ ngày"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <HrmDateInput
                value={params.toDate ?? null}
                onChange={(value) =>
                  setParams((current) => ({ ...current, page: 1, toDate: value ?? undefined }))
                }
                placeholder="Đến ngày"
                aria-label="Đến ngày"
              />
            </Grid.Col>
          </Grid>

          <NormalizedSearchInput
            value={params.search}
            onChange={(search) => setParams((current) => ({ ...current, page: 1, search }))}
            placeholder="Tìm loại thực thể, người thao tác, ID thực thể"
            aria-label="Tìm nhật ký audit"
          />

          <DataTable
            data={data?.items ?? []}
            columns={columns}
            rowKey={(record) => record.id}
            meta={data?.pagination}
            loading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            onPageChange={(page, pageSize) => setParams((current) => ({ ...current, page, pageSize }))}
            emptyTitle="Chưa có nhật ký"
            emptyDescription="Không có bản ghi audit phù hợp với bộ lọc hiện tại."
          />
        </Stack>
      </Paper>

      <Modal
        opened={Boolean(selected)}
        title="Chi tiết nhật ký audit"
        size={900}
        onClose={() => setSelected(null)}
      >
        <Stack gap="md">
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Trước
            </Text>
            <pre className="json-block">{JSON.stringify(selected?.beforeJson ?? {}, null, 2)}</pre>
          </Stack>
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Sau
            </Text>
            <pre className="json-block">{JSON.stringify(selected?.afterJson ?? {}, null, 2)}</pre>
          </Stack>
        </Stack>
      </Modal>
    </>
  );
}
