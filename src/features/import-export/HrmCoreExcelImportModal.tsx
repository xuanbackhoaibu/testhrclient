import { useState } from 'react';
import { Button, Checkbox, Input, Space, Table, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  commitHrmCoreImport,
  listHrmCoreRows,
  previewHrmCoreImport,
  updateHrmCoreSuggestedCodes,
} from '../imports/importsApi';
import type { HrmCorePreview, HrmCoreStagingRow, SuggestedCode } from '../imports/importTypes';
import { showDownloadError } from './downloadError';
import { downloadHrmCoreErrors, downloadHrmCoreTemplate } from './excelFilesApi';
import { ExcelImportModal } from './ExcelImportModal';

interface HrmCoreExcelImportModalProps {
  open: boolean;
  onClose: () => void;
  onCommitted?: () => void | Promise<void>;
}

function renderMessages(value: unknown): string {
  if (!Array.isArray(value)) {
    return '-';
  }
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

function renderSuggestedCodes(
  items: SuggestedCode[],
  drafts: Record<string, string>,
  setDrafts: (next: Record<string, string>) => void,
  showUnit = false,
) {
  return (
    <Table
      rowKey="key"
      size="small"
      dataSource={items}
      pagination={false}
      columns={[
        ...(showUnit
          ? [
              {
                title: 'Đơn vị',
                render: (_: unknown, record: SuggestedCode) =>
                  record.unitName ?? record.unitKey ?? '-',
              },
            ]
          : []),
        { title: 'Tên', dataIndex: 'name' },
        {
          title: 'Mã đề xuất',
          render: (_, record) => (
            <Input
              value={drafts[record.key] ?? record.code}
              onChange={(event) => setDrafts({ ...drafts, [record.key]: event.target.value })}
            />
          ),
        },
      ]}
    />
  );
}

export function HrmCoreExcelImportModal({
  open,
  onClose,
  onCommitted,
}: HrmCoreExcelImportModalProps) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<HrmCorePreview | null>(null);
  const [rows, setRows] = useState<HrmCoreStagingRow[]>([]);
  const [allowWarnings, setAllowWarnings] = useState(false);
  const [unitCodeDrafts, setUnitCodeDrafts] = useState<Record<string, string>>({});
  const [departmentCodeDrafts, setDepartmentCodeDrafts] = useState<Record<string, string>>({});

  const templateMutation = useMutation({
    mutationFn: downloadHrmCoreTemplate,
    onError: (error) => showDownloadError(error, 'Tải mẫu Excel thất bại.'),
  });

  const previewMutation = useMutation({
    mutationFn: previewHrmCoreImport,
    onSuccess: async (result) => {
      setPreview(result);
      setAllowWarnings(false);
      setUnitCodeDrafts(Object.fromEntries(result.suggestedCodes.units.map((item) => [item.key, item.code])));
      setDepartmentCodeDrafts(Object.fromEntries(result.suggestedCodes.departments.map((item) => [item.key, item.code])));
      setRows(await listHrmCoreRows(result.batchId));
      await queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      message.success('Kiểm tra dữ liệu import thành công.');
    },
    onError: () => message.error('Kiểm tra dữ liệu import thất bại.'),
  });

  const updateCodesMutation = useMutation({
    mutationFn: async () => {
      if (!preview) {
        throw new Error('Missing preview');
      }
      return updateHrmCoreSuggestedCodes(preview.batchId, {
        units: Object.entries(unitCodeDrafts).map(([key, code]) => ({ key, code })),
        departments: Object.entries(departmentCodeDrafts).map(([key, code]) => ({ key, code })),
      });
    },
    onSuccess: async (result) => {
      setPreview(result);
      setRows(await listHrmCoreRows(result.batchId));
      message.success('Đã cập nhật mã đề xuất.');
    },
    onError: () => message.error('Không cập nhật được mã đề xuất.'),
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!preview) {
        throw new Error('Missing preview');
      }
      return commitHrmCoreImport(preview.batchId, allowWarnings);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      await onCommitted?.();
      message.success('Import dữ liệu thành công.');
      setPreview((current) => (current ? { ...current, status: 'COMMITTED' } : current));
      onClose();
    },
    onError: () => message.error('Import dữ liệu thất bại.'),
  });

  const errorFileMutation = useMutation({
    mutationFn: async () => {
      if (!preview) {
        throw new Error('Missing preview');
      }
      return downloadHrmCoreErrors(preview.batchId);
    },
    onError: (error) => showDownloadError(error, 'Tải file lỗi thất bại.'),
  });

  const hasErrors = Boolean(preview && preview.summary.errors > 0);
  const hasWarnings = Boolean(preview && preview.summary.warnings > 0);
  const canCommit = Boolean(
    preview?.canCommit &&
      !hasErrors &&
      preview.status !== 'COMMITTED' &&
      (!hasWarnings || allowWarnings),
  );

  const rowsTable = (
    <Table
      rowKey="id"
      size="small"
      dataSource={rows}
      pagination={{ pageSize: 8 }}
      columns={[
        { title: 'Dòng', dataIndex: 'rowNumber', width: 80 },
        { title: 'Trạng thái', dataIndex: 'validationStatus', width: 140 },
        { title: 'Họ tên', render: (_, row) => String(row.normalizedDataJson.fullName ?? '-') },
        { title: 'Email', render: (_, row) => String(row.normalizedDataJson.companyEmail ?? '-') },
        { title: 'Đơn vị', render: (_, row) => String(row.normalizedDataJson.unitName ?? '-') },
        { title: 'Phòng ban', render: (_, row) => String(row.normalizedDataJson.departmentName ?? '-') },
      ]}
    />
  );

  return (
    <ExcelImportModal
      open={open}
      onClose={onClose}
      description="Mẫu này hỗ trợ đơn vị, phòng ban, nhân sự và phân công. Vui lòng tải mẫu Excel, điền dữ liệu và upload lại file đã hoàn thiện."
      onDownloadTemplate={() => templateMutation.mutateAsync()}
      onUpload={async (file) => {
        await previewMutation.mutateAsync(file);
      }}
      onCommit={async () => {
        await commitMutation.mutateAsync();
      }}
      onDownloadErrors={() => errorFileMutation.mutateAsync()}
      hasPreview={Boolean(preview)}
      hasErrors={hasErrors}
      hasWarnings={hasWarnings}
      canCommit={canCommit}
      isDownloadingTemplate={templateMutation.isPending}
      isUploading={previewMutation.isPending}
      isCommitting={commitMutation.isPending}
      isDownloadingErrors={errorFileMutation.isPending}
      summary={
        preview
          ? [
              { label: 'Đơn vị', value: preview.summary.units },
              { label: 'Phòng ban', value: preview.summary.departments },
              { label: 'Nhân sự', value: preview.summary.employees },
              { label: 'Phân công', value: preview.summary.assignments },
              { label: 'Lỗi', value: preview.summary.errors },
              { label: 'Cảnh báo', value: preview.summary.warnings },
            ]
          : []
      }
      previewContent={
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Checkbox
            checked={allowWarnings}
            disabled={!hasWarnings}
            onChange={(event) => setAllowWarnings(event.target.checked)}
          >
            Chấp nhận cảnh báo
          </Checkbox>
          {preview ? (
            <>
              {renderSuggestedCodes(preview.suggestedCodes.units, unitCodeDrafts, setUnitCodeDrafts)}
              {renderSuggestedCodes(preview.suggestedCodes.departments, departmentCodeDrafts, setDepartmentCodeDrafts, true)}
              <Space>
                <Button
                  loading={updateCodesMutation.isPending}
                  onClick={() => updateCodesMutation.mutate()}
                >
                  Lưu mã đề xuất
                </Button>
              </Space>
            </>
          ) : null}
          {rowsTable}
        </Space>
      }
      errorsContent={
        <Table
          rowKey="id"
          size="small"
          dataSource={rows.filter((row) => row.validationStatus === 'ERROR')}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Dòng', dataIndex: 'rowNumber', width: 80 },
            { title: 'Chi tiết', render: (_, row) => renderMessages(row.validationErrorsJson) },
          ]}
        />
      }
      warningsContent={
        <Table
          rowKey="id"
          size="small"
          dataSource={rows.filter((row) => row.validationStatus === 'WARNING')}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Dòng', dataIndex: 'rowNumber', width: 80 },
            { title: 'Chi tiết', render: (_, row) => renderMessages(row.validationWarningsJson) },
          ]}
        />
      }
    />
  );
}
