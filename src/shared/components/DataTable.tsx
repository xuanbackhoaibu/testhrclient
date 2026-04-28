import type { ReactNode } from 'react';
import { Box, Group, Pagination, Paper, ScrollArea, Skeleton, Stack, Table, Text } from '@mantine/core';

import type { PaginationMeta } from '../types/api';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (record: T) => ReactNode;
  width?: number | string;
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
}: DataTableProps<T>) {
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

  return (
    <Paper radius="md" p={0} className="data-table-shell">
      <ScrollArea type="auto">
        <Table miw={860} striped highlightOnHover withColumnBorders={false}>
          <Table.Thead>
            <Table.Tr>
              {columns.map((column) => (
                <Table.Th
                  key={column.key}
                  w={column.width}
                  ta={column.align}
                  className="data-table-heading"
                >
                  {column.header}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((record) => (
              <Table.Tr
                key={rowKey(record)}
                className={onRowClick ? 'data-table-row-clickable' : undefined}
                onClick={onRowClick ? () => onRowClick(record) : undefined}
              >
                {columns.map((column) => (
                  <Table.Td key={column.key} ta={column.align}>
                    {column.render(record)}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {meta && onPageChange ? (
        <Group justify="space-between" gap="sm" px="md" py="sm" className="data-table-footer">
          <Text size="sm" c="dimmed">
            {meta.total} bản ghi
          </Text>
          <Box>
            <Pagination
              total={Math.max(1, meta.totalPages)}
              value={meta.page}
              onChange={(page) => onPageChange(page, meta.pageSize)}
              size="sm"
            />
          </Box>
        </Group>
      ) : null}
    </Paper>
  );
}
