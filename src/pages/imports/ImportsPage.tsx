import { useMemo, useState } from 'react';
import { Button, Card, Checkbox, Space, Statistic, Steps, Table, Tabs, Upload, message } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
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

const steps = [
  { title: 'Chọn loại dữ liệu' },
  { title: 'Tải mẫu' },
  { title: 'Upload' },
  { title: 'Preview' },
  { title: 'Commit' },
  { title: 'Kết quả' },
];

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
    onError: (error) => showDownloadError(error, 'Tải mẫu Excel thất bại.'),
  });

  const exportMutation = useMutation({
    mutationFn: (domainKey: ExcelDomainKey) => downloadDomainExport(domainKey),
    onError: (error) => showDownloadError(error, 'Xuất Excel thất bại.'),
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
      message.success('Đã kiểm tra dữ liệu Excel.');
    },
    onError: () => message.error('Kiểm tra dữ liệu Excel thất bại.'),
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
      message.success('Import dữ liệu thành công.');
    },
    onError: () => message.error('Import dữ liệu thất bại.'),
  });

  const errorFileMutation = useMutation({
    mutationFn: async () => {
      if (!preview) {
        throw new Error('Missing preview');
      }
      return downloadImportErrorReport(preview.batchId);
    },
    onError: (error) => showDownloadError(error, 'Tải file lỗi thất bại.'),
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
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Card className="page-card">
          <Steps current={currentStep} items={steps} />
        </Card>

        <Tabs
          activeKey={activeDomain}
          onChange={(key) => {
            setActiveDomain(key as ExcelDomainKey);
            setPreview(null);
            setRows([]);
            setAllowWarnings(false);
          }}
          items={domainConfigs.map((config) => ({
            key: config.key,
            label: `${config.order}. ${config.title}`,
            children: (
              <Card className="page-card" title={`Import ${config.title}`}>
                <Space wrap>
                  {canImport ? <Button
                    icon={<DownloadOutlined />}
                    loading={templateMutation.isPending}
                    disabled={templateMutation.isPending}
                    onClick={() => void templateMutation.mutateAsync(config.key)}
                  >
                    Tải mẫu {config.title}
                  </Button> : null}
                  {canImport ? <Upload
                    accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      if (!isExcelFile(file)) {
                        message.error('Chỉ chấp nhận file Excel .xlsx hoặc .xlsm.');
                        return Upload.LIST_IGNORE;
                      }
                      previewMutation.mutate({ domainKey: config.key, file });
                      return false;
                    }}
                  >
                    <Button icon={<UploadOutlined />} loading={previewMutation.isPending}>
                      Kiểm tra dữ liệu
                    </Button>
                  </Upload> : null}
                  {canImport ? <Checkbox checked={allowWarnings} disabled={!hasWarnings} onChange={(event) => setAllowWarnings(event.target.checked)}>
                    Chấp nhận cảnh báo
                  </Checkbox> : null}
                  {canImport ? <Button type="primary" disabled={commitDisabled} loading={commitMutation.isPending} onClick={() => commitMutation.mutate()}>
                    Import
                  </Button> : null}
                  {canImport ? <Button
                    icon={<DownloadOutlined />}
                    disabled={!preview}
                    loading={errorFileMutation.isPending}
                    onClick={() => void errorFileMutation.mutateAsync()}
                  >
                    Tải file lỗi
                  </Button> : null}
                  {canExport ? <Button
                    icon={<DownloadOutlined />}
                    loading={exportMutation.isPending}
                    disabled={exportMutation.isPending}
                    onClick={() => void exportMutation.mutateAsync(config.key)}
                  >
                    Export {config.title}
                  </Button> : null}
                </Space>
              </Card>
            ),
          }))}
        />

        {canImport && preview ? (
          <Card className="page-card" title={`Preview ${activeConfig.title}`}>
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <Space wrap>
                <Statistic title="Tổng dòng" value={preview.totalRows} />
                <Statistic title="Hợp lệ" value={preview.validRows} />
                <Statistic title="Lỗi" value={preview.invalidRows} />
                <Statistic title="Cảnh báo" value={preview.warnings} />
                <StatusTag status={preview.status} />
              </Space>
              <Table
                rowKey="id"
                size="small"
                dataSource={rows}
                pagination={{ pageSize: 8 }}
                columns={[
                  { title: 'Dòng', dataIndex: 'rowNumber', width: 80 },
                  { title: 'Trạng thái', dataIndex: 'validationStatus', width: 140 },
                  { title: 'Dữ liệu', render: (_, row) => JSON.stringify(row.rawDataJson) },
                  { title: 'Lỗi', render: (_, row) => renderMessages(row.validationErrorsJson) },
                  { title: 'Cảnh báo', render: (_, row) => renderMessages(row.validationWarningsJson) },
                ]}
              />
            </Space>
          </Card>
        ) : null}

        {canImport ? <Card className="page-card" title="Lịch sử batch">
          <Table
            rowKey="id"
            dataSource={data?.items ?? []}
            pagination={false}
            columns={[
              { title: 'Batch code', dataIndex: 'batchCode' },
              { title: 'Import type', dataIndex: 'importType' },
              { title: 'Tên file', dataIndex: 'fileName' },
              { title: 'Tổng', dataIndex: 'totalRows' },
              { title: 'Thành công', dataIndex: 'successRows' },
              { title: 'Thất bại', dataIndex: 'failedRows' },
              { title: 'Trạng thái', render: (_, record) => <StatusTag status={record.status} /> },
              { title: 'Ngày tạo', render: (_, record) => formatDateTime(record.createdAt) },
              {
                title: 'Thao tác',
                render: (_, record) => (
                  <Button
                    onClick={async () => {
                      const detail = await getImportBatch(record.id);
                      setSelected(detail);
                    }}
                  >
                    Chi tiết
                  </Button>
                ),
              },
            ]}
          />
        </Card> : null}

        {canImport && selected ? (
          <Card className="page-card" title="Chi tiết batch">
            <p>Batch code: {selected.batchCode}</p>
            <p>File: {selected.fileName}</p>
            <p>Status: <StatusTag status={selected.status} /></p>
          </Card>
        ) : null}
      </Space>
    </>
  );
}
