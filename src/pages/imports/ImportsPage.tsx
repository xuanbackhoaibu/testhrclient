import { useMemo, useState } from 'react';
import { Button, Card, Checkbox, Input, Space, Statistic, Steps, Table, Tabs, Upload, message } from 'antd';
import { DownloadOutlined, RollbackOutlined, UploadOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  commitHrmCoreImport,
  getImportBatch,
  listHrmCoreRows,
  previewHrmCoreImport,
  rollbackHrmCoreImport,
  updateHrmCoreSuggestedCodes,
} from '../../features/imports/importsApi';
import { downloadHrmCoreErrors, downloadHrmCoreTemplate } from '../../features/import-export/excelFilesApi';
import { showDownloadError } from '../../features/import-export/downloadError';
import type { HrmCorePreview, HrmCoreStagingRow, ImportBatch, SuggestedCode } from '../../features/imports/importTypes';
import { useImportBatches } from '../../features/imports/useImportBatches';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDateTime } from '../../shared/utils/date';
import { exportRowsToExcel, isExcelFile } from '../../shared/utils/excel';

const steps = [
  { title: 'Tải mẫu' },
  { title: 'Upload' },
  { title: 'Kiểm tra' },
  { title: 'Preview' },
  { title: 'Xác nhận' },
];

export function ImportsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ImportBatch | null>(null);
  const [preview, setPreview] = useState<HrmCorePreview | null>(null);
  const [rows, setRows] = useState<HrmCoreStagingRow[]>([]);
  const [allowWarnings, setAllowWarnings] = useState(false);
  const [unitCodeDrafts, setUnitCodeDrafts] = useState<Record<string, string>>({});
  const [departmentCodeDrafts, setDepartmentCodeDrafts] = useState<Record<string, string>>({});
  const { data, isLoading, error, refetch } = useImportBatches({ page: 1, pageSize: 20 });

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
      message.success('Đã tạo preview HRM Core.');
    },
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
      message.success('Đã commit batch HRM Core.');
      setPreview((current) => (current ? { ...current, status: 'COMMITTED' } : current));
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: rollbackHrmCoreImport,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      message.success('Đã rollback dữ liệu batch tạo mới.');
    },
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

  async function exportBatchHistory() {
    await exportRowsToExcel({
      fileName: `hrm-import-batches-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'Lịch sử import',
      rows: data?.items ?? [],
      columns: [
        { header: 'Batch code', key: 'batchCode', width: 28, value: (record) => record.batchCode },
        { header: 'Import type', key: 'importType', width: 22, value: (record) => record.importType },
        { header: 'Tên file', key: 'fileName', width: 34, value: (record) => record.fileName },
        { header: 'Tổng số dòng', key: 'totalRows', width: 14, value: (record) => record.totalRows },
        { header: 'Thành công', key: 'successRows', width: 14, value: (record) => record.successRows },
        { header: 'Thất bại', key: 'failedRows', width: 14, value: (record) => record.failedRows },
        { header: 'Trạng thái', key: 'status', width: 18, value: (record) => record.status },
        { header: 'Ngày tạo', key: 'createdAt', width: 24, value: (record) => formatDateTime(record.createdAt) },
      ],
    });
  }

  async function exportPreviewRows() {
    if (!preview) {
      return;
    }
    await exportRowsToExcel({
      fileName: `hrm-core-preview-${preview.batchId}.xlsx`,
      sheetName: 'Dòng preview',
      rows,
      columns: [
        { header: 'Dòng', key: 'rowNumber', width: 10, value: (record) => record.rowNumber },
        { header: 'Loại dòng', key: 'rowKind', width: 18, value: (record) => record.rowKind },
        { header: 'Trạng thái', key: 'validationStatus', width: 18, value: (record) => record.validationStatus },
        { header: 'Họ tên', key: 'fullName', width: 28, value: (record) => String(record.normalizedDataJson.fullName ?? '') },
        { header: 'Email', key: 'companyEmail', width: 32, value: (record) => String(record.normalizedDataJson.companyEmail ?? '') },
        { header: 'Đơn vị', key: 'unitName', width: 28, value: (record) => String(record.normalizedDataJson.unitName ?? '') },
        { header: 'Phòng ban', key: 'departmentName', width: 28, value: (record) => String(record.normalizedDataJson.departmentName ?? '') },
        { header: 'Chức danh', key: 'jobTitle', width: 24, value: (record) => String(record.normalizedDataJson.jobTitle ?? '') },
        { header: 'Lỗi', key: 'errors', width: 50, value: (record) => JSON.stringify(record.validationErrorsJson) },
        { header: 'Cảnh báo', key: 'warnings', width: 50, value: (record) => JSON.stringify(record.validationWarningsJson) },
      ],
    });
  }

  async function exportSuggestedCodes() {
    if (!preview) {
      return;
    }
    const suggestedRows = [
      ...preview.suggestedCodes.units.map((item) => ({
        type: 'UNIT',
        key: item.key,
        name: item.name,
        code: unitCodeDrafts[item.key] ?? item.code,
        unitKey: '',
      })),
      ...preview.suggestedCodes.departments.map((item) => ({
        type: 'DEPARTMENT',
        key: item.key,
        name: item.name,
        code: departmentCodeDrafts[item.key] ?? item.code,
        unitKey: item.unitKey ?? '',
      })),
    ];

    await exportRowsToExcel({
      fileName: `hrm-core-suggested-codes-${preview.batchId}.xlsx`,
      sheetName: 'Mã đề xuất',
      rows: suggestedRows,
      columns: [
        { header: 'Loại', key: 'type', width: 16, value: (record) => record.type },
        { header: 'Key', key: 'key', width: 36, value: (record) => record.key },
        { header: 'Tên', key: 'name', width: 32, value: (record) => record.name },
        { header: 'Mã đề xuất', key: 'code', width: 18, value: (record) => record.code },
        { header: 'Unit key', key: 'unitKey', width: 26, value: (record) => record.unitKey },
      ],
    });
  }

  const currentStep = useMemo(() => {
    if (!preview) {
      return 1;
    }
    if (preview.status === 'COMMITTED') {
      return 4;
    }
    if (preview.summary.errors > 0) {
      return 2;
    }
    return 3;
  }, [preview]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
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

  const hasWarnings = Boolean(preview && preview.summary.warnings > 0);
  const commitDisabled =
    !preview ||
    !preview.canCommit ||
    preview.status === 'COMMITTED' ||
    commitMutation.isPending ||
    (hasWarnings && !allowWarnings);

  return (
    <>
      <PageHeader title="Import HRM Core" subtitle="Preview Excel, staging, commit và rollback an toàn." />
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card className="page-card">
          <Steps current={currentStep} items={steps} />
        </Card>

        <Card className="page-card" title="Thao tác">
          <Space wrap>
            <Button
              icon={<DownloadOutlined />}
              loading={templateMutation.isPending}
              disabled={templateMutation.isPending}
              onClick={() => void templateMutation.mutateAsync()}
            >
              Tải mẫu Excel
            </Button>
            <Upload
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              showUploadList={false}
              beforeUpload={(file) => {
                if (!isExcelFile(file)) {
                  message.error('Chỉ chấp nhận file Excel .xlsx hoặc .xls.');
                  return Upload.LIST_IGNORE;
                }
                previewMutation.mutate(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} loading={previewMutation.isPending}>
                Import Excel
              </Button>
            </Upload>
            <Button
              onClick={() => updateCodesMutation.mutate()}
              disabled={!preview || updateCodesMutation.isPending}
            >
              Lưu mã đề xuất
            </Button>
            <Checkbox checked={allowWarnings} disabled={!hasWarnings} onChange={(event) => setAllowWarnings(event.target.checked)}>
              Chấp nhận cảnh báo
            </Checkbox>
            <Button type="primary" disabled={commitDisabled} loading={commitMutation.isPending} onClick={() => commitMutation.mutate()}>
              Commit
            </Button>
            <Button
              icon={<DownloadOutlined />}
              disabled={!preview}
              loading={errorFileMutation.isPending}
              onClick={() => void errorFileMutation.mutateAsync()}
            >
              Tải file lỗi
            </Button>
            <Button icon={<DownloadOutlined />} disabled={!preview || !rows.length} onClick={() => void exportPreviewRows()}>
              Xuất preview
            </Button>
            <Button icon={<DownloadOutlined />} disabled={!preview} onClick={() => void exportSuggestedCodes()}>
              Xuất mã đề xuất
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => void exportBatchHistory()}>
              Xuất lịch sử
            </Button>
          </Space>
        </Card>

        {preview ? (
          <Card className="page-card" title={`Batch ${preview.batchId}`}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Space wrap>
                <Statistic title="Đơn vị" value={preview.summary.units} />
                <Statistic title="Phòng ban" value={preview.summary.departments} />
                <Statistic title="Nhân sự" value={preview.summary.employees} />
                <Statistic title="Phân công" value={preview.summary.assignments} />
                <Statistic title="Lỗi" value={preview.summary.errors} />
                <Statistic title="Cảnh báo" value={preview.summary.warnings} />
              </Space>
              <Tabs
                items={[
                  {
                    key: 'overview',
                    label: 'Tổng quan',
                    children: <StatusTag status={preview.status} />,
                  },
                  {
                    key: 'units',
                    label: 'Đơn vị',
                    children: renderSuggestedCodes(preview.suggestedCodes.units, unitCodeDrafts, setUnitCodeDrafts),
                  },
                  {
                    key: 'departments',
                    label: 'Phòng ban',
                    children: renderSuggestedCodes(preview.suggestedCodes.departments, departmentCodeDrafts, setDepartmentCodeDrafts, true),
                  },
                  {
                    key: 'employees',
                    label: 'Nhân sự',
                    children: <Table rowKey="id" size="small" dataSource={rows} pagination={{ pageSize: 8 }} columns={[
                      { title: 'Dòng', dataIndex: 'rowNumber' },
                      { title: 'Trạng thái', dataIndex: 'validationStatus' },
                      { title: 'Họ tên', render: (_, row) => String(row.normalizedDataJson.fullName ?? '-') },
                      { title: 'Email', render: (_, row) => String(row.normalizedDataJson.companyEmail ?? '-') },
                    ]} />,
                  },
                  {
                    key: 'assignments',
                    label: 'Phân công',
                    children: <Table rowKey="id" size="small" dataSource={rows} pagination={{ pageSize: 8 }} columns={[
                      { title: 'Dòng', dataIndex: 'rowNumber' },
                      { title: 'Đơn vị', render: (_, row) => String(row.normalizedDataJson.unitName ?? '-') },
                      { title: 'Phòng ban', render: (_, row) => String(row.normalizedDataJson.departmentName ?? '-') },
                      { title: 'Chức danh', render: (_, row) => String(row.normalizedDataJson.jobTitle ?? '-') },
                    ]} />,
                  },
                  {
                    key: 'errors',
                    label: 'Lỗi',
                    children: <Table rowKey="id" size="small" dataSource={rows.filter((row) => row.validationStatus === 'ERROR')} pagination={false} columns={[
                      { title: 'Dòng', dataIndex: 'rowNumber' },
                      { title: 'Chi tiết', render: (_, row) => JSON.stringify(row.validationErrorsJson) },
                    ]} />,
                  },
                  {
                    key: 'warnings',
                    label: 'Cảnh báo',
                    children: <Table rowKey="id" size="small" dataSource={rows.filter((row) => row.validationStatus === 'WARNING')} pagination={false} columns={[
                      { title: 'Dòng', dataIndex: 'rowNumber' },
                      { title: 'Chi tiết', render: (_, row) => JSON.stringify(row.validationWarningsJson) },
                    ]} />,
                  },
                ]}
              />
            </Space>
          </Card>
        ) : null}

        <Card className="page-card" title="Lịch sử batch">
          <Table
            rowKey="id"
            dataSource={data.items}
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
                  <Space>
                    <Button
                      onClick={async () => {
                        const detail = await getImportBatch(record.id);
                        setSelected(detail);
                      }}
                    >
                      Chi tiết
                    </Button>
                    {record.importType === 'HRM_CORE_EXCEL' && record.status === 'COMMITTED' ? (
                      <Button icon={<RollbackOutlined />} danger loading={rollbackMutation.isPending} onClick={() => rollbackMutation.mutate(record.id)}>
                        Rollback
                      </Button>
                    ) : null}
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        {selected ? (
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
