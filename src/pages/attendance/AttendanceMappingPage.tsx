import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Pagination,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
  IconLink,
  IconRefresh,
  IconUserCheck,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '../../shared/components/PageHeader';
import { ROUTES } from '../../shared/constants/routes';
import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { useAuth } from '../../features/auth/useAuth';
import { getAttendanceMappingSuggestions } from '../../features/attendance/attendanceApi';
import {
  useAttendanceMappingStats,
  useMapAttendance,
  useRemapAttendance,
  useUnmappedAttendance,
} from '../../features/attendance/useAttendanceSync';
import type { MappingStats, UnmappedAttendanceItem } from '../../features/attendance/attendanceTypes';
import { sortByCode } from '../../shared/utils/sort';
import { NormalizedSearchInput } from '../../shared/components/NormalizedSearchInput';
import { includesNormalizedSearch } from '../../shared/utils/normalizeSearchText';
import { formatDate } from '../../shared/utils/date';
import { HrmDateInput } from '../../shared/components/HrmDateInput';

const PAGE_SIZE = 20;

// ─── Mapping Stats Cards ───────────────────────────────────────────────────────

function MappingStatsSection({
  stats,
  isLoading,
}: {
  stats?: MappingStats;
  isLoading: boolean;
}) {
  if (isLoading || !stats) {
    return (
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} withBorder padding="sm">
            <Text size="xs" c="dimmed">—</Text>
            <Text size="lg" fw={700}>—</Text>
          </Card>
        ))}
      </SimpleGrid>
    );
  }

  const needsHandling = stats.unmapped + stats.conflict;

  return (
    <>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
        <Card withBorder padding="sm">
          <Group gap="xs">
            <IconUsers size={18} color="blue" />
            <Text size="xs" c="dimmed">Tổng bản ghi</Text>
            <Text size="lg" fw={700}>{stats.total.toLocaleString('vi-VN')}</Text>
          </Group>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs">
            <IconUserCheck size={18} color="teal" />
            <Text size="xs" c="dimmed">Đã map</Text>
            <Text size="lg" fw={700} c="teal">
              {(stats.mapped + stats.autoMapped).toLocaleString('vi-VN')}
            </Text>
          </Group>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs">
            <IconAlertTriangle size={18} color="orange" />
            <Text size="xs" c="dimmed">Chưa map</Text>
            <Text size="lg" fw={700} c={stats.unmapped > 0 ? 'orange' : undefined}>
              {stats.unmapped.toLocaleString('vi-VN')}
            </Text>
          </Group>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs">
            <IconX size={18} color="red" />
            <Text size="xs" c="dimmed">Trùng mã</Text>
            <Text size="lg" fw={700} c={stats.conflict > 0 ? 'red' : undefined}>
              {stats.conflict.toLocaleString('vi-VN')}
            </Text>
          </Group>
        </Card>
      </SimpleGrid>

      {needsHandling > 0 && (
        <Alert
          color="orange"
          title="Cần xử lý mapping"
          icon={<IconAlertTriangle size={18} />}
        >
          Có {needsHandling} bản ghi chấm công chưa được map với nhân sự HRM.
          Điều này có thể do mã chấm công BioTime chưa được gán cho nhân sự tương ứng.
        </Alert>
      )}
    </>
  );
}

// ─── Unmapped Table ────────────────────────────────────────────────────────────

function UnmappedTable({
  items,
  total,
  page,
  pageSize,
  search,
  isLoading,
  onPageChange,
  onSearchChange,
  onMap,
}: {
  items: UnmappedAttendanceItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onMap: (item: UnmappedAttendanceItem) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Card withBorder padding={0}>
      <Group p="sm" gap="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        <NormalizedSearchInput
          placeholder="Tìm mã chấm công, họ tên, phòng ban..."
          value={search}
          onChange={onSearchChange}
          style={{ flex: 1 }}
          size="sm"
        />
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Mã chấm công</Table.Th>
            <Table.Th>Họ tên BioTime</Table.Th>
            <Table.Th>Phòng ban BioTime</Table.Th>
            <Table.Th ta="center">Số bản ghi</Table.Th>
            <Table.Th>Ngày đầu</Table.Th>
            <Table.Th>Ngày cuối</Table.Th>
            <Table.Th ta="center">Trạng thái</Table.Th>
            <Table.Th ta="center">Hành động</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            <Table.Tr>
              <Table.Td colSpan={8}>
                <Text size="sm" c="dimmed" ta="center">Đang tải...</Text>
              </Table.Td>
            </Table.Tr>
          ) : items.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={8}>
                <Text size="sm" c="dimmed" ta="center">
                  Không có bản ghi nào cần xử lý.
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            items.map((item) => (
              <Table.Tr key={item.empCode}>
                <Table.Td>
                  <Text size="sm" fw={600}>{item.empCode}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{item.fullName ?? '-'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">{item.deptName ?? '-'}</Text>
                </Table.Td>
                <Table.Td ta="center">
                  <Badge variant="light" size="sm">
                    {item.recordCount}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDate(item.firstWorkDate)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDate(item.lastWorkDate)}</Text>
                </Table.Td>
                <Table.Td ta="center">
                  <Badge color="orange" variant="light" size="sm">
                    Chưa map
                  </Badge>
                </Table.Td>
                <Table.Td ta="center">
                  <Button
                    size="xs"
                    variant="light"
                    color="blue"
                    leftSection={<IconLink size={14} />}
                    onClick={() => onMap(item)}
                  >
                    Map
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {totalPages > 1 && (
        <Group justify="center" p="sm">
          <Pagination
            value={page}
            onChange={onPageChange}
            total={totalPages}
            size="sm"
          />
        </Group>
      )}
    </Card>
  );
}

// ─── Map Employee Modal ────────────────────────────────────────────────────────

function MapEmployeeModal({
  item,
  opened,
  onClose,
  onSuccess,
}: {
  item: UnmappedAttendanceItem | null;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
    queryKey: ['attendance-mapping-suggestions', item?.empCode],
    queryFn: () =>
      getAttendanceMappingSuggestions({
        empCode: item!.empCode,
        fullName: item?.fullName ?? undefined,
        deptName: item?.deptName ?? undefined,
      }),
    enabled: Boolean(item),
    staleTime: 30_000,
  });

  const mapMutation = useMapAttendance({
    onSuccess: (result) => {
      notifications.show({
        color: 'green',
        title: 'Đã map mã chấm công',
        message: `Mã ${item?.empCode} đã được map với nhân sự ${result.employee.fullName} (${result.employee.employeeCode}). ${result.updatedAttendanceCount} bản ghi được cập nhật.`,
      });
      onSuccess();
    },
    onError: (err) => {
      notifications.show({
        color: 'red',
        title: 'Không map được',
        message: err instanceof Error ? err.message : 'Lỗi không xác định.',
      });
    },
  });

  const handleClose = () => {
    setSelectedEmployeeId(null);
    setSearchQuery('');
    onClose();
  };

  const filteredSuggestions = suggestions?.filter(
    (s) =>
      includesNormalizedSearch(`${s.fullName} ${s.employeeCode}`, searchQuery),
  ) ?? [];

  const scoreLabel = (score: number) => {
    if (score >= 1.0) return 'Trùng mã';
    if (score >= 0.95) return 'Khớp normalize';
    if (score >= 0.7) return 'Khớp prefix+số';
    return 'Trùng tên';
  };

  const scoreColor = (score: number) => {
    if (score >= 0.95) return 'green';
    if (score >= 0.7) return 'blue';
    return 'gray';
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconLink size={18} />
          <Text fw={600}>Map nhân sự</Text>
        </Group>
      }
      size="lg"
    >
      {item && (
        <Stack gap="md">
          <Card withBorder padding="sm" bg="gray.0">
            <SimpleGrid cols={2}>
              <Text size="sm">
                <Text span c="dimmed">Mã chấm công: </Text>
                <Text span fw={600}>{item.empCode}</Text>
              </Text>
              <Text size="sm">
                <Text span c="dimmed">Số bản ghi: </Text>
                <Text span fw={600}>{item.recordCount}</Text>
              </Text>
              <Text size="sm">
                <Text span c="dimmed">Tên BioTime: </Text>
                {item.fullName ?? '-'}
              </Text>
              <Text size="sm">
                <Text span c="dimmed">Phòng ban: </Text>
                {item.deptName ?? '-'}
              </Text>
            </SimpleGrid>
          </Card>

          <Text size="sm" fw={500}>Gợi ý nhân sự</Text>

          {loadingSuggestions ? (
            <Text size="sm" c="dimmed">Đang tìm gợi ý...</Text>
          ) : filteredSuggestions.length === 0 ? (
            <Text size="sm" c="dimmed">Không có gợi ý phù hợp.</Text>
          ) : (
            <Stack gap="xs">
              {filteredSuggestions.map((s) => (
                <Card
                  key={s.employeeId}
                  withBorder
                  padding="xs"
                  onClick={() => setSelectedEmployeeId(s.employeeId)}
                  style={{
                    cursor: 'pointer',
                    borderColor:
                      selectedEmployeeId === s.employeeId
                        ? 'var(--mantine-color-blue-5)'
                        : undefined,
                    background:
                      selectedEmployeeId === s.employeeId
                        ? 'var(--mantine-color-blue-0)'
                        : undefined,
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={2}>
                      <Group gap="xs">
                        <Text size="sm" fw={600}>{s.fullName}</Text>
                        <Text size="xs" c="dimmed">{s.employeeCode}</Text>
                      </Group>
                      <Text size="xs" c="dimmed">{s.departmentName ?? '—'}</Text>
                      <Group gap="xs">
                        {s.reasons.map((reason, i) => (
                          <Badge key={i} size="xs" variant="light">
                            {reason}
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                    <Stack gap={2} align="flex-end">
                      <Badge color={scoreColor(s.score)} size="sm">
                        {scoreLabel(s.score)} {Math.round(s.score * 100)}%
                      </Badge>
                      {selectedEmployeeId === s.employeeId && (
                        <IconCheck size={16} color="var(--mantine-color-blue-6)" />
                      )}
                    </Stack>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}

          <NormalizedSearchInput
            label="Tìm nhân sự khác"
            placeholder="Nhập tên hoặc mã nhân sự..."
            value={searchQuery}
            onChange={setSearchQuery}
            size="sm"
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose}>
              Hủy
            </Button>
            <Button
              color="blue"
              leftSection={<IconLink size={16} />}
              disabled={!selectedEmployeeId}
              loading={mapMutation.isPending}
              onClick={() => {
                if (!item || !selectedEmployeeId) return;
                mapMutation.mutate({ empCode: item.empCode, employeeId: selectedEmployeeId });
              }}
            >
              Map nhân sự
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

// ─── Remap Modal ──────────────────────────────────────────────────────────────

function RemapModal({
  opened,
  onClose,
  onSuccess,
}: {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fromDate, setFromDate] = useState<string | ''>('');
  const [toDate, setToDate] = useState<string | ''>('');

  const remapMutation = useRemapAttendance({
    onSuccess: (result) => {
      notifications.show({
        color: 'green',
        title: 'Đã chạy lại mapping',
        message: `Đã xử lý ${result.totalProcessed} bản ghi: ${result.mappedCount} đã map, ${result.autoMappedCount} tự map, ${result.unmappedCount} chưa map, ${result.conflictCount} trùng mã.`,
      });
      onSuccess();
    },
    onError: (err) => {
      notifications.show({
        color: 'red',
        title: 'Lỗi remap',
        message: err instanceof Error ? err.message : 'Lỗi không xác định.',
      });
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconRefresh size={18} />
          <Text fw={600}>Chạy lại mapping</Text>
        </Group>
      }
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Hệ thống sẽ duyệt lại các bản ghi chưa map và cố gắng tự động map
          dựa trên mã chấm công BioTime đã được gán cho nhân sự.
        </Text>

        <Text size="sm" fw={500}>Giới hạn theo ngày (tùy chọn)</Text>
        <Group grow>
          <HrmDateInput
            label="Từ ngày"
            value={fromDate || null}
            onChange={(value) => setFromDate(value ?? '')}
            size="sm"
          />
          <HrmDateInput
            label="Đến ngày"
            value={toDate || null}
            onChange={(value) => setToDate(value ?? '')}
            size="sm"
          />
        </Group>

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Hủy
          </Button>
          <Button
            color="teal"
            leftSection={<IconRefresh size={16} />}
            loading={remapMutation.isPending}
            onClick={() =>
              remapMutation.mutate(fromDate && toDate ? { fromDate, toDate } : undefined)
            }
          >
            Chạy remap
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function AttendanceMappingPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [mapTarget, setMapTarget] = useState<UnmappedAttendanceItem | null>(null);
  const [remapOpened, { open: openRemap, close: closeRemap }] = useDisclosure(false);

  const { data: stats, isLoading: loadingStats } = useAttendanceMappingStats();

  const { data: unmappedRaw, isLoading: loadingUnmapped } = useUnmappedAttendance({
    page,
    search,
  });
  // Hook dùng chung nên sắp xếp theo mã chấm công ở phía màn hình này.
  const unmapped = useMemo(
    () =>
      unmappedRaw && {
        ...unmappedRaw,
        items: sortByCode(unmappedRaw.items, (item) => item.empCode),
      },
    [unmappedRaw],
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleMapSuccess = () => {
    setMapTarget(null);
  };

  const handleRemapSuccess = () => {
    closeRemap();
  };

  return (
    <>
      <PageHeader
        title="Đối soát dữ liệu chấm công"
        subtitle="Map dữ liệu chấm công BioTime với nhân sự HRM"
        breadcrumbs={['Chấm công', 'Máy chấm công', 'Đối soát dữ liệu']}
        actions={
          <>
            <Button
              variant="light"
              color="teal"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate(ROUTES.attendance)}
            >
              Quay lại
            </Button>
            {can(HR_PERMISSIONS.ATTENDANCE_UPDATE) && (
              <Button
                variant="light"
                color="teal"
                leftSection={<IconRefresh size={16} />}
                onClick={openRemap}
              >
                Chạy lại mapping
              </Button>
            )}
          </>
        }
      />

      <Stack gap="md">
        <MappingStatsSection stats={stats} isLoading={loadingStats} />

        <UnmappedTable
          items={unmapped?.items ?? []}
          total={unmapped?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          search={search}
          isLoading={loadingUnmapped}
          onPageChange={setPage}
          onSearchChange={handleSearchChange}
          onMap={setMapTarget}
        />
      </Stack>

      <MapEmployeeModal
        item={mapTarget}
        opened={mapTarget !== null}
        onClose={() => setMapTarget(null)}
        onSuccess={handleMapSuccess}
      />

      <RemapModal
        opened={remapOpened}
        onClose={closeRemap}
        onSuccess={handleRemapSuccess}
      />
    </>
  );
}
