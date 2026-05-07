import { useMemo, useState } from 'react';
import { Table, message } from 'antd';
import { useMutation } from '@tanstack/react-query';

import { showDownloadError } from './downloadError';
import {
  downloadImportErrorReport,
  downloadImportTemplate,
  type ExcelDomainKey,
} from './excelFilesApi';
import {
  ExcelImportModal,
  type ImportPreviewStat,
} from './ExcelImportModal';
import {
  commitDomainImport,
  listDomainImportRows,
  previewDomainImport,
} from '../imports/importsApi';
import type { HrmCoreStagingRow } from '../imports/importTypes';

interface DomainExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  module: ExcelDomainKey;
  onSuccess?: () => void | Promise<void>;
  onAfterCommit?: (result: {
    batchId: string;
    jobId: string;
    status: string;
  }) => void;
}

function renderMessages(value: unknown): string {
  if (!Array.isArray(value)) {
    return '-';
  }

  return (
    value
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'message' in item) {
          return String((item as { message?: unknown }).message ?? '');
        }
        return String(item);
      })
      .filter(Boolean)
      .join('; ') || '-'
  );
}

function readNormalizedString(row: HrmCoreStagingRow, key: string): string {
  const value = row.normalizedDataJson?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : '-';
}

export function DomainExcelImportModal({
  open,
  onOpenChange,
  title,
  module,
  onSuccess,
  onAfterCommit,
}: DomainExcelImportModalProps) {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [rows, setRows] = useState<HrmCoreStagingRow[]>([]);
  const [summary, setSummary] = useState<ImportPreviewStat[]>([]);

  const description =
    module === 'organization-units'
      ? 'Táº£i file máº«u, chá»n file Excel, xem káº¿t quáº£ validate vĂ  import trá»±c tiáº¿p ngay trĂªn mĂ n hiá»‡n táº¡i. Cá»™t linh_vuc pháº£i lĂ  mĂ£ lÄ©nh vá»±c Ä‘Ă£ tá»“n táº¡i trong danh má»¥c LÄ©nh vá»±c.'
      : module === 'employees'
        ? 'Táº£i file máº«u, chá»n file Excel, xem preview mÃ£ nhÃ¢n sá»± sau chuáº©n hÃ³a vÃ  import trá»±c tiáº¿p ngay trĂªn mÃ n hiá»‡n táº¡i.'
        : 'Táº£i file máº«u, chá»n file Excel, xem káº¿t quáº£ validate vĂ  import trá»±c tiáº¿p ngay trĂªn mĂ n hiá»‡n táº¡i.';

  const templateMutation = useMutation({
    mutationFn: () => downloadImportTemplate(module),
    onError: (error) =>
      showDownloadError(error, 'Táº£i máº«u Excel tháº¥t báº¡i.'),
  });

  const previewMutation = useMutation({
    mutationFn: async (file: File) => previewDomainImport(module, file),
    onSuccess: async (result) => {
      setBatchId(result.batchId);
      setRows(await listDomainImportRows(result.batchId, module));
      setSummary([
        { label: 'Tá»•ng dĂ²ng', value: result.totalRows },
        { label: 'Há»£p lá»‡', value: result.validRows },
        { label: 'Lá»—i', value: result.invalidRows },
        { label: 'Cáº£nh bĂ¡o', value: result.warnings },
      ]);
      message.success('ÄĂ£ kiá»ƒm tra file import.');
    },
    onError: () => {
      message.error('Kiá»ƒm tra file import tháº¥t báº¡i.');
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error('Missing batch preview');
      return commitDomainImport(module, batchId, true);
    },
    onSuccess: async (result) => {
      message.success('Import Excel thĂ nh cĂ´ng.');
      await onSuccess?.();
      onAfterCommit?.(result);
      handleClose();
    },
    onError: () => {
      message.error('Import Excel tháº¥t báº¡i.');
    },
  });

  const errorReportMutation = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error('Missing batch preview');
      return downloadImportErrorReport(batchId);
    },
    onError: (error) =>
      showDownloadError(error, 'Táº£i file lá»—i tháº¥t báº¡i.'),
  });

  function handleClose() {
    setBatchId(null);
    setRows([]);
    setSummary([]);
    previewMutation.reset();
    commitMutation.reset();
    errorReportMutation.reset();
    onOpenChange(false);
  }

  const preview = previewMutation.data;
  const hasPreview = Boolean(preview && batchId);
  const hasErrors = (preview?.invalidRows ?? 0) > 0;
  const hasWarnings = (preview?.warnings ?? 0) > 0;

  const categorizedRows = useMemo(() => {
    const errorRows = rows.filter((row) => row.validationStatus === 'ERROR');
    const warningRows = rows.filter(
      (row) => row.validationStatus === 'WARNING',
    );
    return { errorRows, warningRows };
  }, [rows]);

  const rowColumns = useMemo(
    () => [
      { title: 'DĂ²ng', dataIndex: 'rowNumber', width: 80 },
      { title: 'Tráº¡ng thĂ¡i', dataIndex: 'validationStatus', width: 120 },
      ...(module === 'employees'
        ? [
            {
              title: 'LÄ©nh vá»±c',
              render: (_: unknown, row: HrmCoreStagingRow) =>
                readNormalizedString(row, 'businessSectorCode'),
            },
            {
              title: 'MÃ£ nhĂ¢n sá»± chuáº©n hÃ³a',
              render: (_: unknown, row: HrmCoreStagingRow) =>
                readNormalizedString(row, 'employeeCodePreview'),
            },
          ]
        : []),
      {
        title: 'Dá»¯ liá»‡u',
        render: (_: unknown, row: HrmCoreStagingRow) =>
          JSON.stringify(row.rawDataJson),
      },
      {
        title: 'Lá»—i',
        render: (_: unknown, row: HrmCoreStagingRow) =>
          renderMessages(row.validationErrorsJson),
      },
      {
        title: 'Cáº£nh bĂ¡o',
        render: (_: unknown, row: HrmCoreStagingRow) =>
          renderMessages(row.validationWarningsJson),
      },
    ],
    [module],
  );

  return (
    <ExcelImportModal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      onDownloadTemplate={() => templateMutation.mutateAsync()}
      onUpload={(file) =>
        previewMutation.mutateAsync(file).then(() => undefined)
      }
      onCommit={
        hasPreview && !hasErrors
          ? () => commitMutation.mutateAsync().then(() => undefined)
          : undefined
      }
      onDownloadErrors={
        hasPreview
          ? () => errorReportMutation.mutateAsync().then(() => undefined)
          : undefined
      }
      summary={summary}
      previewContent={
        <Table
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8 }}
          dataSource={rows}
          columns={rowColumns}
        />
      }
      errorsContent={
        <Table
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8 }}
          dataSource={categorizedRows.errorRows}
          columns={rowColumns}
        />
      }
      warningsContent={
        <Table
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8 }}
          dataSource={categorizedRows.warningRows}
          columns={rowColumns}
        />
      }
      hasPreview={hasPreview}
      hasErrors={hasErrors}
      hasWarnings={hasWarnings}
      canCommit={Boolean(preview?.canCommit && !hasErrors)}
      isDownloadingTemplate={templateMutation.isPending}
      isUploading={previewMutation.isPending}
      isCommitting={commitMutation.isPending}
      isDownloadingErrors={errorReportMutation.isPending}
    />
  );
}
