import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { StagingRowsTable, type StagingRowColumn } from './StagingRowsTable';
import { toast } from '../../shared/utils/toast';

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
      ? 'Tải file mẫu, chọn file Excel, xem kết quả validate và import trực tiếp ngay trên màn hiện tại. Cột linh_vuc phải là mã lĩnh vực đã tồn tại trong danh mục Lĩnh vực.'
      : module === 'employees'
        ? 'Tải file mẫu, chọn file Excel, xem preview mã nhân sự sau chuẩn hóa và import trực tiếp ngay trên màn hiện tại.'
        : 'Tải file mẫu, chọn file Excel, xem kết quả validate và import trực tiếp ngay trên màn hiện tại.';

  const templateMutation = useMutation({
    mutationFn: () => downloadImportTemplate(module),
    onError: (error) =>
      showDownloadError(error, 'Tải mẫu Excel thất bại.'),
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
      toast.success('Đã kiểm tra file import.');
    },
    onError: (error) => {
      toast.error(
        (error as { message?: string })?.message ??
          'Kiểm tra file import thất bại.',
      );
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error('Missing batch preview');
      return commitDomainImport(module, batchId, true);
    },
    onSuccess: async (result) => {
      toast.success('Import Excel thành công.');
      await onSuccess?.();
      onAfterCommit?.(result);
      handleClose();
    },
    onError: (error) => {
      toast.error(
        (error as { message?: string })?.message ?? 'Import Excel thất bại.',
      );
    },
  });

  const errorReportMutation = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error('Missing batch preview');
      return downloadImportErrorReport(batchId);
    },
    onError: (error) =>
      showDownloadError(error, 'Tải file lỗi thất bại.'),
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

  const rowColumns = useMemo<StagingRowColumn[]>(
    () => [
      { key: 'rowNumber', header: 'Dòng', width: 80, render: (row) => row.rowNumber },
      { key: 'validationStatus', header: 'Trạng thái', width: 120, render: (row) => row.validationStatus },
      ...(module === 'employees'
        ? [
            {
              key: 'businessSectorCode',
              header: 'Lĩnh vực',
              render: (row: HrmCoreStagingRow) => readNormalizedString(row, 'businessSectorCode'),
            },
            {
              key: 'employeeCodePreview',
              header: 'Mã nhân sự chuẩn hóa',
              render: (row: HrmCoreStagingRow) => readNormalizedString(row, 'employeeCodePreview'),
            },
          ]
        : []),
      { key: 'rawData', header: 'Dữ liệu', render: (row) => JSON.stringify(row.rawDataJson) },
      { key: 'errors', header: 'Lỗi', render: (row) => renderMessages(row.validationErrorsJson) },
      { key: 'warnings', header: 'Cảnh báo', render: (row) => renderMessages(row.validationWarningsJson) },
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
        <StagingRowsTable rows={rows} columns={rowColumns} />
      }
      errorsContent={
        <StagingRowsTable rows={categorizedRows.errorRows} columns={rowColumns} />
      }
      warningsContent={
        <StagingRowsTable rows={categorizedRows.warningRows} columns={rowColumns} />
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
