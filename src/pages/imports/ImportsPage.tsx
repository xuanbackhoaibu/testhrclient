import { useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  FileButton,
  Group,
  Paper,
  Stack,
  Stepper,
  Table,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { IconDownload, IconUpload } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { useAuth } from '../../features/auth/useAuth';
import {
  commitDomainImport,
  getImportBatch,
  listDomainImportRows,
  previewDomainImport,
} from '../../features/imports/importsApi';
import type { DomainImportPreview, HrmCoreStagingRow, ImportBatch } from '../../features/imports/importTypes';
import {
  downloadDomainExport,
  downloadImportErrorReport,
  downloadImportTemplate,
  type ExcelDomainKey,
} from '../../features/import-export/excelFilesApi';
import { showDownloadError } from '../../features/import-export/downloadError';
import {
  StagingRowsTable,
  type StagingRowColumn,
} from '../../features/import-export/StagingRowsTable';
import { useImportBatches } from '../../features/imports/useImportBatches';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDateTime } from '../../shared/utils/date';
import { isExcelFile } from '../../shared/utils/excel';
import { toast } from '../../shared/utils/toast';
import { renderMessages } from '../../features/import-export/importMessages';

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

const steps = ['Chọn loại dữ liệu', 'Tải mẫu', 'Upload', 'Preview', 'Commit', 'Kết quả'];

const EXCEL_ACCEPT =
  '.xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';


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
  const { data, isLoading, error, refetch } = useImportBatches(
    { page: 1, pageSize: 20 },
    canImport,
  );

  const activeConfig = domainConfigs.find((item) => item.key === activeDomain) ?? domainConfigs[0];

  const templateMutation = useMutation({
    mutationFn: downloadImportTemplate,
    onError: (mutationError) => showDownloadError(mutationError, 'Tải mẫu Excel thất bại.'),
  });

  const exportMutation = useMutation({
    mutationFn: (domainKey: ExcelDomainKey) => downloadDomainExport(domainKey),
    onError: (mutationError) => showDownloadError(mutationError, 'Xuất Excel thất bại.'),
  });

  const previewMutation = useMutation({
    mutationFn: async ({ domainKey, file }: { domainKey: ExcelDomainKey; file: File }) =>
      previewDomainImport(domainKey, file),
    onSuccess: async (result, variables) => {
      setActiveDomain(variables.domainKey);
      setPreview(result);
      setAllowWarnings(false);
      setRows(await listDomainImportRows(result.batchId, variables.domainKey));
      await queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      toast.success('Đã kiểm tra dữ liệu Excel.');
    },
    onError: () => toast.error('Kiểm tra dữ liệu Excel thất bại.'),
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!preview) {
        throw new Error('Missing preview');
      }
      return commitDomainImport(activeDomain, preview.batchId, allowWarnings);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      setPreview((current) => (current ? { ...current, status: 'COMMITTED', canCommit: false } : current));
      toast.success('Import dữ liệu thành công.');
    },
    onError: () => toast.error('Import dữ liệu thất bại.'),
  });

  const errorFileMutation = useMutation({
    mutationFn: async () => {
      if (!preview) {
        throw new Error('Missing preview');
      }
      return downloadImportErrorReport(preview.batchId);
    },
    onError: (mutationError) => showDownloadError(mutationError, 'Tải file lỗi thất bại.'),
  });

  const currentStep = useMemo(() => {
    if (!preview) {
      return 1;
    }
    if (preview.status === 'COMMITTED') {
      return 5;
    }
    if (preview.invalidRows > 0) {
      return 3;
    }
    return 4;
  }, [preview]);

  const previewColumns = useMemo<StagingRowColumn[]>(
    () => [
      { key: 'rowNumber', header: 'Dòng', width: 80, render: (row) => row.rowNumber },
      { key: 'validationStatus', header: 'Trạng thái', width: 140, render: (row) => row.validationStatus },
      { key: 'rawData', header: 'Dữ liệu', render: (row) => JSON.stringify(row.rawDataJson) },
      { key: 'errors', header: 'Lỗi', render: (row) => renderMessages(row.validationErrorsJson) },
      { key: 'warnings', header: 'Cảnh báo', render: (row) => renderMessages(row.validationWarningsJson) },
    ],
    [],
  );

  function handleUpload(domainKey: ExcelDomainKey, file: File | null) {
    if (!file) {
      return;
    }
    if (!isExcelFile(file)) {
      toast.error('Chỉ chấp nhận file Excel .xlsx hoặc .xlsm.');
      return;
    }
    previewMutation.mutate({ domainKey, file });
  }

  if (canImport && isLoading) {
    return <LoadingState />;
  }

  if (canImport && (error || !data)) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const hasWarnings = Boolean(preview && preview.warnings > 0);
  const commitDisabled =
    !preview ||
    !preview.canCommit ||
    preview.status === 'COMMITTED' ||
    commitMutation.isPending ||
    (hasWarnings && !allowWarnings);

  return (
    <>
      <PageHeader title="Import / Export Excel HRM" subtitle="Tách Đơn vị, Phòng ban, Nhân sự và Phân công nhân sự." />
      <Stack gap="md">
        <Paper className="page-card" p="lg" radius="md">
          <Stepper active={currentStep} size="sm" allowNextStepsSelect={false}>
            {steps.map((step) => (
              <Stepper.Step key={step} label={step} />
            ))}
          </Stepper>
        </Paper>

        <Tabs
          value={activeDomain}
          onChange={(key) => {
            if (!key) return;
            setActiveDomain(key as ExcelDomainKey);
            setPreview(null);
            setRows([]);
            setAllowWarnings(false);
          }}
        >
          <Tabs.List>
            {domainConfigs.map((config) => (
              <Tabs.Tab key={config.key} value={config.key}>
                {`${config.order}. ${config.title}`}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {domainConfigs.map((config) => (
            <Tabs.Panel key={config.key} value={config.key} pt="md">
              <Paper className="page-card" p="lg" radius="md">
                <Stack gap="md">
                  <Title order={4}>{`Import ${config.title}`}</Title>
                  <Group gap="xs" wrap="wrap">
                    {canImport ? (
                      <Button
                        variant="default"
                        leftSection={<IconDownload size={16} />}
                        loading={templateMutation.isPending}
                        onClick={() => void templateMutation.mutateAsync(config.key)}
                      >
                        {`Tải mẫu ${config.title}`}
                      </Button>
                    ) : null}
                    {canImport ? (
                      <FileButton
                        onChange={(file) => handleUpload(config.key, file)}
                        accept={EXCEL_ACCEPT}
                      >
                        {(props) => (
                          <Button
                            {...props}
                            variant="default"
                            leftSection={<IconUpload size={16} />}
                            loading={previewMutation.isPending}
                          >
                            Kiểm tra dữ liệu
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
                      <Button
                        disabled={commitDisabled}
                        loading={commitMutation.isPending}
                        onClick={() => commitMutation.mutate()}
                      >
                        Import
                      </Button>
                    ) : null}
                    {canImport ? (
                      <Button
                        variant="default"
                        leftSection={<IconDownload size={16} />}
                        disabled={!preview}
                        loading={errorFileMutation.isPending}
                        onClick={() => void errorFileMutation.mutateAsync()}
                      >
                        Tải file lỗi
                      </Button>
                    ) : null}
                    {canExport ? (
                      <Button
                        variant="default"
                        leftSection={<IconDownload size={16} />}
                        loading={exportMutation.isPending}
                        onClick={() => void exportMutation.mutateAsync(config.key)}
                      >
                        {`Export ${config.title}`}
                      </Button>
                    ) : null}
                  </Group>
                </Stack>
              </Paper>
            </Tabs.Panel>
          ))}
        </Tabs>

        {canImport && preview ? (
          <Paper className="page-card" p="lg" radius="md">
            <Stack gap="md">
              <Title order={4}>{`Preview ${activeConfig.title}`}</Title>
              <Group gap="xl" wrap="wrap">
                {[
                  { label: 'Tổng dòng', value: preview.totalRows },
                  { label: 'Hợp lệ', value: preview.validRows },
                  { label: 'Lỗi', value: preview.invalidRows },
                  { label: 'Cảnh báo', value: preview.warnings },
                ].map((stat) => (
                  <Stack key={stat.label} gap={2}>
                    <Text size="xs" c="dimmed">
                      {stat.label}
                    </Text>
                    <Text fw={600} size="lg">
                      {stat.value}
                    </Text>
                  </Stack>
                ))}
                <StatusTag status={preview.status} />
              </Group>
              <StagingRowsTable rows={rows} columns={previewColumns} />
            </Stack>
          </Paper>
        ) : null}

        {canImport ? (
          <Paper className="page-card" p="lg" radius="md">
            <Stack gap="md">
              <Title order={4}>Lịch sử batch</Title>
              <Table.ScrollContainer minWidth={900}>
                <Table striped highlightOnHover fz="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Batch code</Table.Th>
                      <Table.Th>Import type</Table.Th>
                      <Table.Th>Tên file</Table.Th>
                      <Table.Th>Tổng</Table.Th>
                      <Table.Th>Thành công</Table.Th>
                      <Table.Th>Thất bại</Table.Th>
                      <Table.Th>Trạng thái</Table.Th>
                      <Table.Th>Ngày tạo</Table.Th>
                      <Table.Th>Thao tác</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(data?.items ?? []).map((record) => (
                      <Table.Tr key={record.id}>
                        <Table.Td>{record.batchCode}</Table.Td>
                        <Table.Td>{record.importType}</Table.Td>
                        <Table.Td>{record.fileName}</Table.Td>
                        <Table.Td>{record.totalRows}</Table.Td>
                        <Table.Td>{record.successRows}</Table.Td>
                        <Table.Td>{record.failedRows}</Table.Td>
                        <Table.Td>
                          <StatusTag status={record.status} />
                        </Table.Td>
                        <Table.Td>{formatDateTime(record.createdAt)}</Table.Td>
                        <Table.Td>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={async () => {
                              const detail = await getImportBatch(record.id);
                              setSelected(detail);
                            }}
                          >
                            Chi tiết
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Stack>
          </Paper>
        ) : null}

        {canImport && selected ? (
          <Paper className="page-card" p="lg" radius="md">
            <Stack gap="xs">
              <Title order={4}>Chi tiết batch</Title>
              <Text size="sm">Batch code: {selected.batchCode}</Text>
              <Text size="sm">File: {selected.fileName}</Text>
              <Group gap="xs">
                <Text size="sm">Status:</Text>
                <StatusTag status={selected.status} />
              </Group>
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </>
  );
}
