import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  Paper,
  ScrollArea,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconUser,
  IconX,
} from "@tabler/icons-react";

import type { Employee } from "../../features/employees/employeeTypes";
import { EmptyState } from "../../shared/components/EmptyState";
import { ErrorState } from "../../shared/components/ErrorState";
import { StatusTag } from "../../shared/components/StatusTag";

export type OrganizationHierarchyRow<T> = {
  id: string;
  code: string;
  name: string;
  status: string;
  description?: string | null;
  level: number;
  parentId?: string | null;
  employeeCount: number;
  employees?: Employee[];
  record: T;
  meta?: ReactNode;
  detailFields?: Array<{ label: string; value: ReactNode }>;
};

type Props<T> = {
  rows: OrganizationHierarchyRow<T>[];
  employees: Employee[];
  loading?: boolean;
  error?: unknown;
  emptyTitle: string;
  emptyDescription: string;
  onRetry?: () => void;
  onEdit?: (row: OrganizationHierarchyRow<T>) => void;
  onDeactivate?: (row: OrganizationHierarchyRow<T>) => void;
  canEdit?: boolean | ((row: OrganizationHierarchyRow<T>) => boolean);
  canDeactivate?: boolean | ((row: OrganizationHierarchyRow<T>) => boolean);
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function employeeStatusColor(status?: string | null) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "ACTIVE" || normalized === "WORKING") return "green";
  if (normalized === "PROBATION") return "yellow";
  if (normalized === "TERMINATED" || normalized === "INACTIVE") return "red";
  return "gray";
}

export function OrganizationHierarchyList<T>({
  rows,
  employees,
  loading,
  error,
  emptyTitle,
  emptyDescription,
  onRetry,
  onEdit,
  onDeactivate,
  canEdit,
  canDeactivate,
}: Props<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(rows.filter((row) => rows.some((child) => child.parentId === row.id)).map((row) => row.id)),
  );
  const [selected, setSelected] = useState<OrganizationHierarchyRow<T> | null>(null);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, OrganizationHierarchyRow<T>[]>();
    rows.forEach((row) => {
      if (!row.parentId) return;
      const children = map.get(row.parentId) ?? [];
      children.push(row);
      map.set(row.parentId, children);
    });
    return map;
  }, [rows]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (!row.parentId) return true;
      return expanded.has(row.parentId);
    });
  }, [expanded, rows]);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (error) {
    return (
      <Paper p="md" radius="md" withBorder>
        <ErrorState onRetry={onRetry} />
      </Paper>
    );
  }

  if (loading && !rows.length) {
    return (
      <Paper p="md" radius="md" withBorder className="organization-tree-shell">
        <Stack gap="xs">
          <Skeleton height={18} width={220} />
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} height={42} radius="sm" />
          ))}
        </Stack>
      </Paper>
    );
  }

  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const canEditRow = (row: OrganizationHierarchyRow<T>) =>
    typeof canEdit === "function" ? canEdit(row) : Boolean(canEdit);
  const canDeactivateRow = (row: OrganizationHierarchyRow<T>) =>
    typeof canDeactivate === "function" ? canDeactivate(row) : Boolean(canDeactivate);
  const selectedEmployees = selected?.employees ?? employees;

  return (
    <>
      <Paper withBorder radius="md" className="organization-tree-shell" data-loading={loading ? "true" : undefined}>
        {loading ? (
          <Group px="md" py={6} className="data-table-refreshing">
            <Text size="xs" c="blue" fw={650}>
              Đang cập nhật dữ liệu...
            </Text>
          </Group>
        ) : null}
        <ScrollArea type="auto">
          <Table miw={820} className="organization-tree-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mã / Tên</Table.Th>
                <Table.Th>Thông tin</Table.Th>
                <Table.Th w={150}>Nhân sự</Table.Th>
                <Table.Th w={150}>Trạng thái</Table.Th>
                <Table.Th w={108} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibleRows.map((row) => {
                const children = childrenByParent.get(row.id) ?? [];
                const hasChildren = children.length > 0;
                return (
                  <Table.Tr
                    key={row.id}
                    className="organization-tree-row"
                    onClick={() => setSelected(row)}
                  >
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap" style={{ paddingLeft: row.level * 28 }}>
                        {hasChildren ? (
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label={expanded.has(row.id) ? "Thu gọn" : "Mở rộng"}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggle(row.id);
                            }}
                          >
                            {expanded.has(row.id) ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                          </ActionIcon>
                        ) : (
                          <Box w={28} />
                        )}
                        <Box>
                          <Text fw={750}>{row.name}</Text>
                          <Text size="xs" c="dimmed" ff="monospace">
                            {row.code}
                          </Text>
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={row.meta ? undefined : "dimmed"} lineClamp={2}>
                        {row.meta ?? row.description ?? "-"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" leftSection={<IconUser size={12} />}>
                        {row.employeeCount} nhân sự
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <StatusTag status={row.status} />
                    </Table.Td>
                    <Table.Td onClick={(event) => event.stopPropagation()}>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        {onEdit ? (
                          <Tooltip label="Sửa">
                            <ActionIcon
                              variant="subtle"
                              aria-label="Sửa"
                              disabled={!canEditRow(row)}
                              onClick={() => onEdit(row)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                        ) : null}
                        {onDeactivate ? (
                          <Tooltip label="Tạm ngưng">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              aria-label="Tạm ngưng"
                              disabled={!canDeactivateRow(row) || row.status === "INACTIVE"}
                              onClick={() => onDeactivate(row)}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Tooltip>
                        ) : null}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      <Drawer
        opened={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.name : "Chi tiết"}
        position="right"
        size="lg"
        className="organization-detail-drawer"
      >
        {selected ? (
          <Stack gap="md">
            <Paper withBorder p="md" className="organization-detail-card">
              <Group justify="space-between" mb="sm">
                <Box>
                  <Text size="xs" c="dimmed" fw={700}>Mã</Text>
                  <Text fw={800} ff="monospace">{selected.code}</Text>
                </Box>
                <StatusTag status={selected.status} />
              </Group>
              <Text size="sm" c="dimmed">
                {selected.description || "Chưa có mô tả."}
              </Text>
              {selected.detailFields?.length ? (
                <Stack gap={8} mt="md">
                  {selected.detailFields.map((field) => (
                    <Group key={field.label} justify="space-between" align="flex-start" gap="md">
                      <Text size="sm" c="dimmed">{field.label}</Text>
                      <Text size="sm" fw={650} ta="right">{field.value}</Text>
                    </Group>
                  ))}
                </Stack>
              ) : null}
            </Paper>

            <Paper withBorder p="md" className="organization-detail-card">
              <Group justify="space-between" mb="sm">
                <Text fw={750}>Nhân sự trực thuộc</Text>
                <Badge variant="light">{selectedEmployees.length}</Badge>
              </Group>
              {selectedEmployees.length ? (
                <Stack gap="xs">
                  {selectedEmployees.slice(0, 12).map((employee) => (
                    <Group key={employee.id} gap="sm" className="organization-employee-row">
                      <Avatar size={34} radius="xl" color="blue">{getInitials(employee.fullName)}</Avatar>
                      <Box style={{ flex: 1 }}>
                        <Text size="sm" fw={700}>{employee.fullName}</Text>
                        <Text size="xs" c="dimmed">{employee.employeeCode}</Text>
                      </Box>
                      <Badge size="xs" color={employeeStatusColor(employee.employmentStatus)} variant="light">
                        {employee.employmentStatus}
                      </Badge>
                    </Group>
                  ))}
                  {selectedEmployees.length > 12 ? (
                    <Text size="xs" c="dimmed">Còn {selectedEmployees.length - 12} nhân sự khác.</Text>
                  ) : null}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">Chưa có nhân sự trực thuộc bản ghi này.</Text>
              )}
            </Paper>

            <Group justify="flex-end">
              {onEdit ? (
                <Button variant="light" leftSection={<IconEdit size={16} />} disabled={!canEditRow(selected)} onClick={() => onEdit(selected)}>
                  Sửa
                </Button>
              ) : null}
              {onDeactivate ? (
                <Button color="red" variant="light" leftSection={<IconX size={16} />} disabled={!canDeactivateRow(selected) || selected.status === "INACTIVE"} onClick={() => onDeactivate(selected)}>
                  Vô hiệu hóa
                </Button>
              ) : null}
            </Group>
          </Stack>
        ) : null}
      </Drawer>
    </>
  );
}
