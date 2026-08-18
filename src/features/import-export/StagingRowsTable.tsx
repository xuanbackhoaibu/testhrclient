import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Group, Pagination, ScrollArea, Stack, Table, Text } from '@mantine/core';

import type { HrmCoreStagingRow } from '../imports/importTypes';

export interface StagingRowColumn {
  key: string;
  header: string;
  width?: number;
  render: (row: HrmCoreStagingRow) => ReactNode;
}

const PAGE_SIZE = 8;

/** Bảng preview dòng staging của import Excel, phân trang phía client. */
export function StagingRowsTable({
  rows,
  columns,
}: {
  rows: HrmCoreStagingRow[];
  columns: StagingRowColumn[];
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // Rows đổi (upload file khác) có thể làm trang hiện tại vượt quá số trang mới,
  // nên kẹp lại ngay lúc render thay vì set state trong effect.
  const currentPage = Math.min(page, totalPages);

  const visibleRows = useMemo(
    () => rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [rows, currentPage],
  );

  if (!rows.length) {
    return (
      <Text c="dimmed" size="sm">
        Không có dòng nào.
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      <ScrollArea type="auto">
        <Table striped highlightOnHover fz="sm" miw={720}>
          <Table.Thead>
            <Table.Tr>
              {columns.map((column) => (
                <Table.Th key={column.key} w={column.width}>
                  {column.header}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleRows.map((row) => (
              <Table.Tr key={row.id}>
                {columns.map((column) => (
                  <Table.Td key={column.key}>{column.render(row)}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      {totalPages > 1 ? (
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {rows.length} dòng
          </Text>
          <Pagination total={totalPages} value={currentPage} onChange={setPage} size="sm" />
        </Group>
      ) : null}
    </Stack>
  );
}
