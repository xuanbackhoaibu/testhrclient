import type { ReactNode } from 'react';
import { Box, Checkbox, Group, Pagination, Paper, ScrollArea, Select, Skeleton, Stack, Table, Text } from '@mantine/core';

import type { PaginationMeta } from '../types/api';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (record: T) => ReactNode;
  width?: number | string;
  minWidth?: number | string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (record: T) => string;
  meta?: PaginationMeta;
  loading?: boolean;
  error?: unknown;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  onPageChange?: (page: number, pageSize: number) => void;
  onRowClick?: (record: T) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  pageSizeOptions?: number[];
  maxHeight?: number | string;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  meta,
  loading,
  error,
  emptyTitle,
  emptyDescription,
  onRetry,
  onPageChange,
  onRowClick,
  selectedIds,
  onSelectionChange,
  pageSizeOptions = [10, 20, 50, 100],
  maxHeight,
}: DataTableProps<T>) {
  const selectable = Boolean(onSelectionChange);

  function toggleRow(id: string) {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }

  function toggleAll() {
    if (!onSelectionChange || !selectedIds) return;
    const allIds = data.map(rowKey);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      const next = new Set(selectedIds);
      allIds.forEach((id) => next.delete(id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      allIds.forEach((id) => next.add(id));
      onSelectionChange(next);
    }
  }
  if (error) {
    return (
      <Paper p="md" radius="md">
        <ErrorState onRetry={onRetry} />
      </Paper>
    );
  }

  if (loading) {
    return (
      <Paper p="md" radius="md">
        <Stack gap="sm">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} height={34} radius="sm" />
          ))}
        </Stack>
      </Paper>
    );
  }

  if (!data.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const allOnPageSelected =
    selectable && data.length > 0 && data.every((r) => selectedIds?.has(rowKey(r)));
  const someOnPageSelected =
    selectable && data.some((r) => selectedIds?.has(rowKey(r)));

  return (
    <Paper radius="md" p={0} className="data-table-shell" withBorder>
      <ScrollArea type="auto" mah={maxHeight}>
        <Table
          miw={860}
          striped
          highlightOnHover
          withColumnBorders={false}
          stickyHeader={Boolean(maxHeight)}
        >
          <Table.Thead>
            <Table.Tr>
              {selectable && (
                <Table.Th w={40}>
                  <Checkbox
                    checked={allOnPageSelected}
                    indeterminate={!allOnPageSelected && someOnPageSelected}
                    onChange={toggleAll}
                    aria-label="Chọn tất cả"
                  />
                </Table.Th>
              )}
              {columns.map((column) => (
                <Table.Th
                  key={column.key}
                  w={column.width}
                  miw={column.minWidth}
                  ta={column.align}
                  className="data-table-heading"
                >
                  {column.header}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((record) => {
              const id = rowKey(record);
              const isSelected = selectedIds?.has(id) ?? false;
              return (
                <Table.Tr
                  key={id}
                  className={onRowClick ? 'data-table-row-clickable' : undefined}
                  onClick={onRowClick ? () => onRowClick(record) : undefined}
                  bg={isSelected ? 'var(--mantine-color-blue-light)' : undefined}
                >
                  {selectable && (
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                        aria-label="Chọn dòng"
                      />
                    </Table.Td>
                  )}
                  {columns.map((column) => (
                    <Table.Td key={column.key} ta={column.align}>
                      {column.render(record)}
                    </Table.Td>
                  ))}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {meta && onPageChange ? (
        <Group justify="space-between" gap="sm" px="md" py="sm" className="data-table-footer">
          <Text size="sm" c="dimmed">
            {meta.total} bản ghi
          </Text>
          <Group gap="xs" wrap="nowrap">
            <Select
              aria-label="Số dòng mỗi trang"
              value={String(meta.pageSize)}
              data={pageSizeOptions.map((size) => ({ value: String(size), label: `${size}/trang` }))}
              w={96}
              size="xs"
              allowDeselect={false}
              onChange={(value) => onPageChange(1, Number(value ?? meta.pageSize))}
            />
            <Box>
              <Pagination
                total={Math.max(1, meta.totalPages)}
                value={meta.page}
                onChange={(page) => onPageChange(page, meta.pageSize)}
                size="sm"
              />
            </Box>
          </Group>
        </Group>
      ) : null}
    </Paper>
  );
}

export { DataTable as HrmDataTable };
