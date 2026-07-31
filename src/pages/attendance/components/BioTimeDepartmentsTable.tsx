import { useState } from 'react';
import { Alert, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconRefresh, IconUsers } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useBioTimeDepartments, useSyncBioTimeDepartments } from '../../../features/attendance/useAttendanceSync';
import { DataTable } from '../../../shared/components/DataTable';
import { sortByCode } from '../../../shared/utils/sort';
import { NormalizedSearchInput } from '../../../shared/components/NormalizedSearchInput';
import type { BioTimeDepartment } from '../../../features/attendance/attendanceTypes';

export function BioTimeDepartmentsTable() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const PAGE_SIZE = 50;

  const { data, isLoading, refetch } = useBioTimeDepartments({
    page,
    pageSize: PAGE_SIZE,
    isActive: true,
    keyword: keyword || undefined,
  });

  const syncDepts = useSyncBioTimeDepartments();

  const departments = sortByCode(data?.data, (dept) => dept.biotimeDepartmentId);
  const pagination = data?.pagination;
  const totalCount = pagination?.total ?? 0;

  const handleSync = () => {
    syncDepts.mutate(undefined, {
      onSuccess: (result) => {
        notifications.show({
          title: 'Đồng bộ thành công',
          message: `${result.data.upserted} phòng ban đã được đồng bộ`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        void refetch();
      },
      onError: (err) => {
        notifications.show({
          title: 'Đồng bộ thất bại',
          message: err instanceof Error ? err.message : 'Lỗi không xác định',
          color: 'red',
        });
      },
    });
  };

  if (totalCount === 0 && !isLoading) {
    return (
      <Stack gap="sm">
        <Alert
          color="yellow"
          icon={<IconUsers size={16} />}
        >
          <Text size="sm">
            Chưa có phòng ban BioTime. Cần đồng bộ phòng ban trước khi đồng bộ chấm công.
          </Text>
        </Alert>
        <Button
          leftSection={<IconRefresh size={14} />}
          onClick={handleSync}
          loading={syncDepts.isPending}
        >
          Đồng bộ phòng ban
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <NormalizedSearchInput
          placeholder="Tìm kiếm phòng ban..."
          value={keyword}
          onChange={(value) => {
            setKeyword(value);
            setPage(1);
          }}
          style={{ flex: 1, maxWidth: 300 }}
          size="sm"
        />
        <Button
          leftSection={<IconRefresh size={14} />}
          onClick={handleSync}
          loading={syncDepts.isPending}
          variant="light"
          size="sm"
        >
          Đồng bộ
        </Button>
      </Group>

      <DataTable<BioTimeDepartment>
        data={departments}
        columns={[
          {
            key: 'biotimeDepartmentId',
            header: 'ID BioTime',
            width: 100,
            render: (dept) => (
              <Text size="sm" fw={500}>
                {dept.biotimeDepartmentId}
              </Text>
            ),
          },
          {
            key: 'name',
            header: 'Tên phòng ban',
            minWidth: 200,
            render: (dept) => (
              <Stack gap={0}>
                <Text size="sm">{dept.name}</Text>
                {dept.path && (
                  <Text size="xs" c="dimmed">
                    {dept.path}
                  </Text>
                )}
              </Stack>
            ),
          },
          {
            key: 'level',
            header: 'Level',
            width: 70,
            align: 'center',
            render: (dept) => (
              <Badge size="sm" variant="light" color="gray">
                L{dept.level}
              </Badge>
            ),
          },
          {
            key: 'isLeaf',
            header: 'Leaf',
            width: 70,
            align: 'center',
            render: (dept) => (
              <Badge
                size="sm"
                variant="light"
                color={dept.isLeaf ? 'green' : 'gray'}
              >
                {dept.isLeaf ? 'Leaf' : 'Parent'}
              </Badge>
            ),
          },
          {
            key: 'parentId',
            header: 'Parent ID',
            width: 100,
            render: (dept) => (
              <Text size="sm" c="dimmed">
                {dept.parentId ?? '-'}
              </Text>
            ),
          },
          {
            key: 'syncedAt',
            header: 'Sync lúc',
            width: 130,
            render: (dept) => (
              <Text size="xs" c="dimmed">
                {dayjs(dept.syncedAt).format('HH:mm DD/MM/YYYY')}
              </Text>
            ),
          },
        ]}
        rowKey={(dept) => dept.id}
        meta={pagination}
        loading={isLoading}
        onPageChange={(newPage: number) => setPage(newPage)}
      />
    </Stack>
  );
}
