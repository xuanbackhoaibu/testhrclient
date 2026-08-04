import { useState } from "react";
import { Badge, Group, Modal, Paper, SimpleGrid, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";

import type { AuditLog } from "../../features/audit/auditTypes";
import { useAuditLogs } from "../../features/audit/useAuditLogs";
import { DataTable, type DataTableColumn } from "../../shared/components/DataTable";
import { NormalizedSearchInput } from "../../shared/components/NormalizedSearchInput";
import { PageHeader } from "../../shared/components/PageHeader";
import { TableActionsMenu } from "../../shared/components/TableActionsMenu";
import { formatDateTime } from "../../shared/utils/date";

const ENTITY_TYPE_OPTIONS = ["EMPLOYEE", "LEAVE_REQUEST", "DEPARTMENT", "UNIT", "CONTRACT", "IMPORT_BATCH"];

function diffKeys(before?: Record<string, unknown> | null, after?: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return Array.from(keys);
}

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function AuditLogsPage() {
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [search, setSearch] = useState("");
  const [params, setParams] = useState({
    page: 1,
    pageSize: 20,
    entityType: undefined as string | undefined,
    entityId: undefined as string | undefined,
    action: undefined as string | undefined,
    actorUserId: undefined as string | undefined,
    fromDate: undefined as string | undefined,
    toDate: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = useAuditLogs({ ...params, search });

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: "entityType",
      header: "Đối tượng",
      render: (record) => (
        <Stack gap={2}>
          <Badge variant="light" color="blue" w="fit-content">
            {record.entityType}
          </Badge>
          <Text size="xs" c="dimmed">
            {record.entityId}
          </Text>
        </Stack>
      ),
    },
    { key: "action", header: "Hành động", render: (record) => <Badge variant="outline">{record.action}</Badge> },
    { key: "actorName", header: "Người thực hiện", render: (record) => record.actorName },
    { key: "createdAt", header: "Thời gian", render: (record) => formatDateTime(record.createdAt) },
    {
      key: "actions",
      header: "",
      align: "right",
      width: 60,
      render: (record) => (
        <TableActionsMenu
          actions={[{ label: "Xem chi tiết", icon: <IconEye size={16} />, onClick: () => setSelected(record) }]}
        />
      ),
    },
  ];

  const diffFields = selected ? diffKeys(selected.beforeJson, selected.afterJson) : [];

  return (
    <>
      <PageHeader title="Audit logs" subtitle="Theo dõi ai đã thay đổi đối tượng nào, khi nào và thay đổi những gì." />

      <Paper p="md" radius="lg" withBorder mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          <NormalizedSearchInput
            label="Tìm kiếm"
            placeholder="Loại đối tượng, người thực hiện, ID..."
            value={search}
            onChange={setSearch}
          />
          <Select
            label="Loại đối tượng"
            placeholder="Tất cả"
            clearable
            data={ENTITY_TYPE_OPTIONS.map((item) => ({ value: item, label: item }))}
            onChange={(value) => setParams((current) => ({ ...current, page: 1, entityType: value ?? undefined }))}
          />
          <TextInput
            label="Mã đối tượng (Entity ID)"
            placeholder="VD: emp-01"
            onChange={(event) => {
              const value = event.currentTarget.value || undefined;
              setParams((current) => ({ ...current, page: 1, entityId: value }));
            }}
          />
          <TextInput
            label="Hành động"
            placeholder="VD: CREATE, UPDATE..."
            onChange={(event) => {
              const value = event.currentTarget.value || undefined;
              setParams((current) => ({ ...current, page: 1, action: value }));
            }}
          />
          <TextInput
            label="Người thực hiện (User ID)"
            placeholder="VD: user-01"
            onChange={(event) => {
              const value = event.currentTarget.value || undefined;
              setParams((current) => ({ ...current, page: 1, actorUserId: value }));
            }}
          />
          <Group grow>
            <TextInput
              label="Từ ngày"
              type="date"
              onChange={(event) => {
                const value = event.currentTarget.value || undefined;
                setParams((current) => ({ ...current, page: 1, fromDate: value }));
              }}
            />
            <TextInput
              label="Đến ngày"
              type="date"
              onChange={(event) => {
                const value = event.currentTarget.value || undefined;
                setParams((current) => ({ ...current, page: 1, toDate: value }));
              }}
            />
          </Group>
        </SimpleGrid>
      </Paper>

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        rowKey={(record) => record.id}
        loading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        onRowClick={(record) => setSelected(record)}
        meta={data?.pagination}
        onPageChange={(page, pageSize) => setParams((current) => ({ ...current, page, pageSize }))}
        emptyTitle="Chưa có audit log"
        emptyDescription="Không có bản ghi nào khớp với bộ lọc hiện tại."
      />

      <Modal opened={Boolean(selected)} onClose={() => setSelected(null)} title="Chi tiết audit log" size="xl">
        {selected ? (
          <Stack gap="md">
            <Group gap="xl" wrap="wrap">
              <div>
                <Text size="xs" c="dimmed">
                  Đối tượng
                </Text>
                <Text size="sm" fw={600}>
                  {selected.entityType} • {selected.entityId}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Hành động
                </Text>
                <Text size="sm" fw={600}>
                  {selected.action}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Người thực hiện
                </Text>
                <Text size="sm" fw={600}>
                  {selected.actorName}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Thời gian
                </Text>
                <Text size="sm" fw={600}>
                  {formatDateTime(selected.createdAt)}
                </Text>
              </div>
            </Group>

            {diffFields.length ? (
              <Paper withBorder radius="md">
                <Group px="sm" py={6} bg="gray.0" justify="space-between">
                  <Text size="xs" fw={700} c="dimmed" w="30%">
                    Trường
                  </Text>
                  <Text size="xs" fw={700} c="dimmed" w="33%">
                    Trước
                  </Text>
                  <Text size="xs" fw={700} c="dimmed" w="33%">
                    Sau
                  </Text>
                </Group>
                <Stack gap={0}>
                  {diffFields.map((field) => {
                    const beforeValue = selected.beforeJson?.[field];
                    const afterValue = selected.afterJson?.[field];
                    const changed = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
                    return (
                      <Group
                        key={field}
                        px="sm"
                        py={6}
                        justify="space-between"
                        wrap="nowrap"
                        style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
                        bg={changed ? "yellow.0" : undefined}
                      >
                        <Text size="xs" fw={600} w="30%" style={{ wordBreak: "break-word" }}>
                          {field}
                        </Text>
                        <Text size="xs" c="red.7" w="33%" style={{ wordBreak: "break-word" }}>
                          {formatValue(beforeValue)}
                        </Text>
                        <Text size="xs" c="green.7" w="33%" style={{ wordBreak: "break-word" }}>
                          {formatValue(afterValue)}
                        </Text>
                      </Group>
                    );
                  })}
                </Stack>
              </Paper>
            ) : (
              <Text size="sm" c="dimmed">
                Không có dữ liệu thay đổi (before/after) cho log này.
              </Text>
            )}
          </Stack>
        ) : null}
      </Modal>
    </>
  );
}
