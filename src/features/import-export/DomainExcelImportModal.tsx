import { useMemo, useState } from 'react';
import { Table } from 'antd';
import { message } from 'antd';
import { useMutation } from '@tanstack/react-query';

import {
  ExcelImportModal,
  type ImportPreviewStat,
} from './ExcelImportModal';
import { showDownloadError } from './downloadError';
import { downloadImportErrorReport, downloadImportTemplate, type ExcelDomainKey } from './excelFilesApi';
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
  onAfterCommit?: (result: { batchId: string; jobId: string; status: string }) => void;
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

  const templateMutation = useMutation({
    mutationFn: () => downloadImportTemplate(module),
    onError: (error) => showDownloadError(error, 'Tải mẫu Excel thất bại.'),
  });

  const previewMutation = useMutation({
    mutationFn: async (file: File) => previewDomainImport(module, file),
    onSuccess: async (result) => {
      setBatchId(result.batchId);
      setRows(await listDomainImportRows(result.batchId, module));
      setSummary([
        { label: 'Tổng dòng', value: result.totalRows },
        { label: 'Hợp lệ', value: result.validRows },
        { label: 'Lỗi', value: result.invalidRows },
        { label: 'Cảnh báo', value: result.warnings },
      ]);
      message.success('Đã kiểm tra file import.');
    },
    onError: () => {
      message.error('Kiểm tra file import thất bại.');
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error('Missing batch preview');
      return commitDomainImport(module, batchId, true);
    },
    onSuccess: async (result) => {
      message.success('Import Excel thành công.');
      await onSuccess?.();
      onAfterCommit?.(result);
      handleClose();
    },
    onError: () => {
      message.error('Import Excel thất bại.');
    },
  });

  const errorReportMutation = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error('Missing batch preview');
      return downloadImportErrorReport(batchId);
    },
    onError: (error) => showDownloadError(error, 'Tải file lỗi thất bại.'),
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
    const warningRows = rows.filter((row) => row.validationStatus === 'WARNING');
    return { errorRows, warningRows };
  }, [rows]);

  const rowColumns = [
    { title: 'Dòng', dataIndex: 'rowNumber', width: 80 },
    { title: 'Trạng thái', dataIndex: 'validationStatus', width: 120 },
    {
      title: 'Dữ liệu',
      render: (_: unknown, row: HrmCoreStagingRow) => JSON.stringify(row.rawDataJson),
    },
    {
      title: 'Lỗi',
      render: (_: unknown, row: HrmCoreStagingRow) => renderMessages(row.validationErrorsJson),
    },
    {
      title: 'Cảnh báo',
      render: (_: unknown, row: HrmCoreStagingRow) => renderMessages(row.validationWarningsJson),
    },
  ];

  return (
    <ExcelImportModal
      open={open}
      onClose={handleClose}
      title={title}
      description="Tải file mẫu, chọn file Excel, xem kết quả validate và import trực tiếp ngay trên màn hiện tại."
      onDownloadTemplate={() => templateMutation.mutateAsync()}
      onUpload={(file) => previewMutation.mutateAsync(file).then(() => undefined)}
      onCommit={hasPreview && !hasErrors ? () => commitMutation.mutateAsync().then(() => undefined) : undefined}
      onDownloadErrors={hasPreview ? () => errorReportMutation.mutateAsync().then(() => undefined) : undefined}
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
