import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  FileButton,
  Group,
  Modal,
  Paper,
  Progress,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCheck,
  IconDownload,
  IconEye,
  IconFileSpreadsheet,
  IconPlayerPlay,
  IconSearch,
  IconUpload,
} from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { useAuth } from '../../features/auth/useAuth';
import {
  commitDomainImport,
  getImportBatch,
  listDomainImportRows,
  previewDomainImport,
} from '../../features/imports/importsApi';
import type { DomainImportPreview, HrmCoreStagingRow, ImportBatch, ImportErrorSummary } from '../../features/imports/importTypes';
import {
  downloadDomainExport,
  downloadImportErrorReport,
  downloadImportTemplate,
  type ExcelDomainKey,
} from '../../features/import-export/excelFilesApi';
import { showDownloadError } from '../../features/import-export/downloadError';
import { useImportBatches } from '../../features/imports/useImportBatches';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDateTime } from '../../shared/utils/date';
import { isExcelFile } from '../../shared/utils/excel';

interface DomainConfig {
  key: ExcelDomainKey;
  title: string;
  importType: string;
  order: number;
}

const domainConfigs: DomainConfig[] = [
  { key: 'organization-units', title: 'Đơn vị', importType: 'ORGANIZATION_UNITS_EXCEL', order: 1 },
  { key: 'departments', title: 'Phòng ban', importType: 'DEPARTMENTS_EXCEL', order: 2 },
  { key: 'employees', title: 'Nhân sự', importType: 'EMPLOYEES_EXCEL', order: 3 },
  { key: 'employee-assignments', title: 'Phân công nhân sự', importType: 'EMPLOYEE_ASSIGNMENTS_EXCEL', order: 4 },
];

const wizardSteps = [
  { key: 'upload', title: 'Tải file', icon: IconUpload },
  { key: 'preview', title: 'Xem trước', icon: IconEye },
  { key: 'validate', title: 'Kiểm tra', icon: IconSearch },
  { key: 'confirm', title: 'Xác nhận', icon: IconPlayerPlay },
  { key: 'result', title: 'Kết quả', icon: IconCheck },
];

function renderMessages(value: unknown): string {
  if (!Array.isArray(value)) return '-';
  return value
    .map((item) => {
      if (typeof item === 'object' && item !== null && 'message' in item) {
        return String((item as { message?: unknown }).message ?? '');
      }
      return String(item);
    })
    .filter(Boolean)
    .join('; ') || '-';
}

function getErrorFields(row: HrmCoreStagingRow) {
  const errors = row.validationErrorsJson ?? [];
  return new Set(errors.map((item) => item.field).filter(Boolean));
}

function readRawValue(row: HrmCoreStagingRow, key: string) {
  const value = row.normalizedDataJson?.[key] ?? row.rawDataJson?.[key];
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function batchStatusColor(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes('COMPLETED') || normalized.includes('SUCCESS') || normalized.includes('COMMITTED')) return 'green';
  if (normalized.includes('PARTIAL') || normalized.includes('WARNING')) return 'orange';
  if (normalized.includes('FAILED') || normalized.includes('ERROR')) return 'red';
  return 'blue';
}

function ImportWizard({ currentStep }: { currentStep: number }) {
  return (
    <Card withBorder className="imports-wizard-card">
      <div className="imports-wizard">
        {wizardSteps.map((step, index) => {
          const Icon = step.icon;
          const state = index < currentStep ? 'done' : index === currentStep ? 'current' : 'pending';
          return (
            <div key={step.key} className={`imports-wizard-step is-${state}`}>
              <span className="imports-wizard-icon"><Icon size={18} /></span>
              <Text size="sm" fw={700}>{step.title}</Text>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SummaryCards({ preview }: { preview: DomainImportPreview }) {
  const duplicateCount = preview.errors.filter((error) =>
    `${error.message} ${error.errorCode ?? ''}`.toLowerCase().includes('duplic'),
  ).length;

  const cards = [
    { label: 'Hợp lệ', value: preview.validRows, color: 'green' },
    { label: 'Trùng', value: duplicateCount, color: 'orange' },
    { label: 'Lỗi', value: preview.invalidRows, color: 'red' },
    { label: 'Cảnh báo', value: preview.warningRows || preview.warnings, color: 'yellow' },
  ];

  return (
    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
      {cards.map((card) => (
        <Card key={card.label} withBorder className="imports-summary-card">
          <Text size="xs" c="dimmed" fw={800}>{card.label}</Text>
          <Title order={3} c={card.color}>{card.value}</Title>
        </Card>
      ))}
    </SimpleGrid>
  );
}

function PreviewTable({ rows }: { rows: HrmCoreStagingRow[] }) {
  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.slice(0, 20).forEach((row) => {
      Object.keys(row.normalizedDataJson ?? row.rawDataJson ?? {}).slice(0, 6).forEach((key) => keys.add(key));
    });
    return Array.from(keys).slice(0, 6);
  }, [rows]);

  return (
    <ScrollArea type="auto">
      <Table miw={860} className="imports-preview-table">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Dòng</Table.Th>
            <Table.Th>Trạng thái</Table.Th>
            {columns.map((column) => <Table.Th key={column}>{column}</Table.Th>)}
            <Table.Th>Lý do lỗi / cảnh báo</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => {
            const hasError = (row.validationErrorsJson ?? []).length > 0 || row.validationStatus === 'INVALID';
            const hasWarning = (row.validationWarningsJson ?? []).length > 0;
            const errorFields = getErrorFields(row);
            return (
              <Table.Tr key={row.id} className={hasError ? 'imports-row-error' : hasWarning ? 'imports-row-warning' : undefined}>
                <Table.Td>{row.rowNumber}</Table.Td>
                <Table.Td>
                  <Badge color={hasError ? 'red' : hasWarning ? 'yellow' : 'green'} variant="light">
                    {row.validationStatus}
                  </Badge>
                </Table.Td>
                {columns.map((column) => (
                  <Table.Td key={column} className={errorFields.has(column) ? 'imports-cell-error' : undefined}>
                    {readRawValue(row, column)}
                  </Table.Td>
                ))}
                <Table.Td>
                  <Text size="sm" c={hasError ? 'red' : hasWarning ? 'orange' : 'dimmed'}>
                    {renderMessages(row.validationErrorsJson) !== '-'
                      ? renderMessages(row.validationErrorsJson)
                      : renderMessages(row.validationWarningsJson)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            );
          })}
          {rows.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={columns.length + 3}>
                <Text c="dimmed" ta="center" py="lg">API chưa trả staging rows cho batch này.</Text>
              </Table.Td>
            </Table.Tr>
          ) : null}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

export function ImportsPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canImport = can(HR_PERMISSIONS.EMPLOYEE_IMPORT);
  const canExport = can(HR_PERMISSIONS.EMPLOYEE_READ);
  const [activeDomain, setActiveDomain] = useState<ExcelDomainKey>('organization-units');
  const [preview, setPreview] = useState<DomainImportPreview | null>(null);
  const [rows, setRows] = useState<HrmCoreStagingRow[]>([]);
  const [allowWarnings, setAllowWarnings] = useState(false);
  const [selected, setSelected] = useState<ImportBatch | null>(null);
  const [parseProgress, setParseProgress] = useState(0);
  const { data, isLoading, error, refetch } = useImportBatches(
    { page: 1, pageSize: 20 },
    canImport,
  );

  const activeConfig = domainConfigs.find((item) => item.key === activeDomain) ?? domainConfigs[0];

  const templateMutation = useMutation({
    mutationFn: downloadImportTemplate,
    onError: (error) => showDownloadError(error, 'Tải mẫu Excel thất bại.'),
  });

  const exportMutation = useMutation({
    mutationFn: (domainKey: ExcelDomainKey) => downloadDomainExport(domainKey),
    onError: (error) => showDownloadError(error, 'Xuất Excel thất bại.'),
  });

  const previewMutation = useMutation({
    mutationFn: async ({ domainKey, file }: { domainKey: ExcelDomainKey; file: File }) =>
      previewDomainImport(domainKey, file),
    onMutate: () => {
      setParseProgress(8);
    },
    onSuccess: async (result, variables) => {
      setActiveDomain(variables.domainKey);
      setPreview(result);
      setAllowWarnings(false);
      setRows(await listDomainImportRows(result.batchId, variables.domainKey));
      setParseProgress(100);
      await queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      notifications.show({ color: 'green', message: 'Đã kiểm tra dữ liệu Excel.' });
    },
    onError: () => {
      setParseProgress(0);
      notifications.show({ color: 'red', message: 'Kiểm tra dữ liệu Excel thất bại.' });
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error('Missing preview');
      return commitDomainImport(activeDomain, preview.batchId, allowWarnings);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      setPreview((current) => (current ? { ...current, status: 'COMMITTED', canCommit: false } : current));
      notifications.show({ color: 'green', message: 'Import dữ liệu thành công.' });
    },
    onError: () => notifications.show({ color: 'red', message: 'Import dữ liệu thất bại.' }),
  });

  const errorFileMutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error('Missing preview');
      return downloadImportErrorReport(preview.batchId);
    },
    onError: (error) => showDownloadError(error, 'Tải file lỗi thất bại.'),
  });

  useEffect(() => {
    if (!previewMutation.isPending) return;
    const timer = window.setInterval(() => {
      setParseProgress((current) => Math.min(current + 12, 92));
    }, 280);
    return () => window.clearInterval(timer);
  }, [previewMutation.isPending]);

  const currentStep = useMemo(() => {
    if (!preview && previewMutation.isPending) return 0;
    if (!preview) return 0;
    if (preview.status === 'COMMITTED') return 4;
    if (preview.invalidRows > 0 || preview.warnings > 0) return 2;
    return 3;
  }, [preview, previewMutation.isPending]);

  if (canImport && isLoading) return <LoadingState />;
  if (canImport && (error || !data)) return <ErrorState onRetry={() => void refetch()} />;

  const hasWarnings = Boolean(preview && preview.warnings > 0);
  const commitDisabled =
    !preview ||
    !preview.canCommit ||
    preview.status === 'COMMITTED' ||
    commitMutation.isPending ||
    preview.invalidRows > 0 ||
    (hasWarnings && !allowWarnings);

  return (
    <>
      <PageHeader title="Import / Export Excel HRM" subtitle="Wizard nhập liệu trực quan cho Đơn vị, Phòng ban, Nhân sự và Phân công nhân sự." />
      <Stack gap="md">
        <ImportWizard currentStep={currentStep} />

        <Card withBorder className="imports-control-card">
          <Stack gap="md">
            <SegmentedControl
              value={activeDomain}
              onChange={(key) => {
                setActiveDomain(key as ExcelDomainKey);
                setPreview(null);
                setRows([]);
                setAllowWarnings(false);
                setParseProgress(0);
              }}
              data={domainConfigs.map((config) => ({ value: config.key, label: `${config.order}. ${config.title}` }))}
            />

            <Group gap="xs">
              {canImport ? (
                <Button
                  variant="default"
                  leftSection={<IconDownload size={16} />}
                  loading={templateMutation.isPending}
                  onClick={() => void templateMutation.mutateAsync(activeDomain)}
                >
                  Tải mẫu {activeConfig.title}
                </Button>
              ) : null}
              {canImport ? (
                <FileButton
                  accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(file) => {
                    if (!file) return;
                    if (!isExcelFile(file)) {
                      notifications.show({ color: 'red', message: 'Chỉ chấp nhận file Excel .xlsx hoặc .xlsm.' });
                      return;
                    }
                    previewMutation.mutate({ domainKey: activeDomain, file });
                  }}
                >
                  {(props) => (
                    <Button {...props} leftSection={<IconUpload size={16} />} loading={previewMutation.isPending}>
                      Tải file & kiểm tra
                    </Button>
                  )}
                </FileButton>
              ) : null}
              {canImport ? (
                <Checkbox
                  checked={allowWarnings}
                  disabled={!hasWarnings}
                  label="Chấp nhận cảnh báo"
                  onChange={(event) => setAllowWarnings(event.currentTarget.checked)}
                />
              ) : null}
              {canImport ? (
                <Button disabled={commitDisabled} loading={commitMutation.isPending} onClick={() => commitMutation.mutate()}>
                  Xác nhận import
                </Button>
              ) : null}
              {canImport ? (
                <Button
                  variant="light"
                  leftSection={<IconAlertTriangle size={16} />}
                  disabled={!preview}
                  loading={errorFileMutation.isPending}
                  onClick={() => void errorFileMutation.mutateAsync()}
                >
                  Tải file lỗi
                </Button>
              ) : null}
              {canExport ? (
                <Button
                  variant="light"
                  leftSection={<IconFileSpreadsheet size={16} />}
                  loading={exportMutation.isPending}
                  onClick={() => void exportMutation.mutateAsync(activeDomain)}
                >
                  Export {activeConfig.title}
                </Button>
              ) : null}
            </Group>

            {previewMutation.isPending || parseProgress > 0 ? (
              <Box>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed" fw={700}>Tiến trình xử lý file</Text>
                  <Text size="xs" fw={700}>{parseProgress}%</Text>
                </Group>
                <Progress value={parseProgress} animated={previewMutation.isPending} radius="xl" />
              </Box>
            ) : null}
          </Stack>
        </Card>

        {canImport && preview ? (
          <Card withBorder className="imports-preview-card">
            <Stack gap="md">
              <Group justify="space-between">
                <Box>
                  <Title order={4}>Xem trước & kiểm tra {activeConfig.title}</Title>
                  <Text size="sm" c="dimmed">Batch: {preview.batchId}</Text>
                </Box>
                <StatusTag status={preview.status} />
              </Group>
              <SummaryCards preview={preview} />
              <PreviewTable rows={rows} />
            </Stack>
          </Card>
        ) : null}

        {canImport ? (
          <Card withBorder className="imports-history-card">
            <Group justify="space-between" mb="md">
              <Title order={4}>Lịch sử import</Title>
              <Badge variant="light">{data?.pagination.total ?? data?.items.length ?? 0} batch</Badge>
            </Group>
            <Stack gap="xs">
              {(data?.items ?? []).map((batch) => (
                <Paper key={batch.id} withBorder p="md" className="imports-history-row" onClick={async () => setSelected(await getImportBatch(batch.id))}>
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Group gap="xs">
                        <Text fw={800}>{batch.fileName}</Text>
                        <Badge color={batchStatusColor(batch.status)} variant="light">{batch.status}</Badge>
                      </Group>
                      <Text size="xs" c="dimmed" ff="monospace">{batch.batchCode}</Text>
                      <Text size="sm" c="dimmed">Người thực hiện: Chưa có dữ liệu từ API</Text>
                    </Box>
                    <Box ta="right">
                      <Text size="sm" fw={700}>{formatDateTime(batch.createdAt)}</Text>
                      <Text size="xs" c="dimmed">{batch.importType}</Text>
                    </Box>
                  </Group>
                  <Group gap="xs" mt="sm">
                    <Badge variant="light">Tổng {batch.totalRows}</Badge>
                    <Badge color="green" variant="light">Thành công {batch.successRows}</Badge>
                    <Badge color={batch.failedRows ? 'red' : 'gray'} variant="light">Thất bại {batch.failedRows}</Badge>
                  </Group>
                </Paper>
              ))}
              {!(data?.items ?? []).length ? (
                <Text c="dimmed" ta="center" py="lg">Chưa có lịch sử import.</Text>
              ) : null}
            </Stack>
          </Card>
        ) : null}
      </Stack>

      <Modal opened={Boolean(selected)} onClose={() => setSelected(null)} title="Chi tiết kết quả import" size="lg">
        {selected ? (
          <Stack gap="md">
            <Group justify="space-between">
              <Box>
                <Text fw={800}>{selected.fileName}</Text>
                <Text size="xs" c="dimmed" ff="monospace">{selected.batchCode}</Text>
              </Box>
              <StatusTag status={selected.status} />
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <Card withBorder><Text size="xs" c="dimmed">Tổng dòng</Text><Title order={3}>{selected.totalRows}</Title></Card>
              <Card withBorder><Text size="xs" c="dimmed">Thành công</Text><Title order={3} c="green">{selected.successRows}</Title></Card>
              <Card withBorder><Text size="xs" c="dimmed">Thất bại</Text><Title order={3} c="red">{selected.failedRows}</Title></Card>
            </SimpleGrid>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Dòng</Table.Th>
                  <Table.Th>Trường</Table.Th>
                  <Table.Th>Lỗi</Table.Th>
                  <Table.Th>Gợi ý</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(selected.errorSummary ?? []).map((error: ImportErrorSummary, index) => (
                  <Table.Tr key={`${error.field}-${index}`}>
                    <Table.Td>{error.rowNumber ?? error.rowNo ?? '-'}</Table.Td>
                    <Table.Td>{error.field}</Table.Td>
                    <Table.Td>{error.message}</Table.Td>
                    <Table.Td>{error.suggestion ?? '-'}</Table.Td>
                  </Table.Tr>
                ))}
                {selected.errorSummary.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text c="dimmed" ta="center">Batch này không có lỗi.</Text>
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
