import { Paper, Skeleton, Stack } from '@mantine/core';
import { Table as AntdTable } from 'antd';
import type { TableProps } from 'antd';

export type BaseTableProps<T extends object> = TableProps<T> & {
  skeletonRows?: number;
};

function isLoading<T extends object>(loading: TableProps<T>['loading']) {
  if (typeof loading === 'boolean') {
    return loading;
  }

  return Boolean(loading?.spinning);
}

export function BaseTable<T extends object>({
  dataSource,
  loading,
  skeletonRows = 6,
  columns,
  ...tableProps
}: BaseTableProps<T>) {
  const hasRows = Array.isArray(dataSource) && dataSource.length > 0;
  const columnCount = Math.max(columns?.length ?? 4, 1);

  if (isLoading(loading) && !hasRows) {
    return (
      <Paper p="md" radius="md" className="base-table-skeleton">
        <Stack gap="xs">
          <Skeleton height={20} width={180} radius="sm" />
          {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
            <Stack key={rowIndex} gap={8} className="base-table-skeleton-row">
              {Array.from({ length: columnCount }).map((__, columnIndex) => (
                <Skeleton key={columnIndex} height={34} radius="sm" />
              ))}
            </Stack>
          ))}
        </Stack>
      </Paper>
    );
  }

  return (
    <AntdTable<T>
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      {...tableProps}
    />
  );
}
