import { useMemo, useState } from 'react';
import { Button, Card, Checkbox, Input, Space, Statistic, Steps, Table, Tabs, Upload, message } from 'antd';
import { DownloadOutlined, RollbackOutlined, UploadOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  commitHrmCoreImport,
  downloadBlob,
  getImportBatch,
  listHrmCoreRows,
  previewHrmCoreImport,
  rollbackHrmCoreImport,
  updateHrmCoreSuggestedCodes,
} from '../../features/imports/importsApi';
import type { HrmCorePreview, HrmCoreStagingRow, ImportBatch, SuggestedCode } from '../../features/imports/importTypes';
import { useImportBatches } from '../../features/imports/useImportBatches';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDateTime } from '../../shared/utils/date';

const steps = [
  { title: 'Tai mau' },
  { title: 'Upload' },
  { title: 'Kiem tra' },
  { title: 'Preview' },
  { title: 'Xac nhan' },
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

  const previewMutation = useMutation({
    mutationFn: previewHrmCoreImport,
    onSuccess: async (result) => {
      setPreview(result);
      setAllowWarnings(false);
      setUnitCodeDrafts(Object.fromEntries(result.suggestedCodes.units.map((item) => [item.key, item.code])));
      setDepartmentCodeDrafts(Object.fromEntries(result.suggestedCodes.departments.map((item) => [item.key, item.code])));
      setRows(await listHrmCoreRows(result.batchId));
      await queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      message.success('Da tao preview HRM Core.');
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
      message.success('Da cap nhat ma de xuat.');
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
      message.success('Da commit batch HRM Core.');
      setPreview((current) => (current ? { ...current, status: 'COMMITTED' } : current));
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: rollbackHrmCoreImport,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      message.success('Da rollback du lieu batch tao moi.');
    },
  });

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

  function renderSuggestedCodes(items: SuggestedCode[], drafts: Record<string, string>, setDrafts: (next: Record<string, string>) => void) {
    return (
      <Table
        rowKey="key"
        size="small"
        dataSource={items}
        pagination={false}
        columns={[
          { title: 'Ten', dataIndex: 'name' },
          {
            title: 'Ma de xuat',
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
      <PageHeader title="Import HRM Core" subtitle="Excel preview, staging, commit va rollback an toan." />
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card className="page-card">
          <Steps current={currentStep} items={steps} />
        </Card>

        <Card className="page-card" title="Thao tac">
          <Space wrap>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => void downloadBlob('/import-templates/hrm-core', 'Mau_import_HRM_Core.xlsx')}
            >
              Tai mau Excel
            </Button>
            <Upload showUploadList={false} beforeUpload={(file) => { previewMutation.mutate(file); return false; }}>
              <Button icon={<UploadOutlined />} loading={previewMutation.isPending}>
                Upload preview
              </Button>
            </Upload>
            <Button
              onClick={() => updateCodesMutation.mutate()}
              disabled={!preview || updateCodesMutation.isPending}
            >
              Luu ma de xuat
            </Button>
            <Checkbox checked={allowWarnings} disabled={!hasWarnings} onChange={(event) => setAllowWarnings(event.target.checked)}>
              Chap nhan warning
            </Checkbox>
            <Button type="primary" disabled={commitDisabled} loading={commitMutation.isPending} onClick={() => commitMutation.mutate()}>
              Commit
            </Button>
            <Button
              icon={<DownloadOutlined />}
              disabled={!preview}
              onClick={() => preview && void downloadBlob(`/imports/hrm-core/${preview.batchId}/errors.xlsx`, `hrm-core-errors-${preview.batchId}.xlsx`)}
            >
              Tai file loi
            </Button>
          </Space>
        </Card>

        {preview ? (
          <Card className="page-card" title={`Batch ${preview.batchId}`}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Space wrap>
                <Statistic title="Don vi" value={preview.summary.units} />
                <Statistic title="Phong ban" value={preview.summary.departments} />
                <Statistic title="Nhan su" value={preview.summary.employees} />
                <Statistic title="Phan cong" value={preview.summary.assignments} />
                <Statistic title="Loi" value={preview.summary.errors} />
                <Statistic title="Canh bao" value={preview.summary.warnings} />
              </Space>
              <Tabs
                items={[
                  {
                    key: 'overview',
                    label: 'Tong quan',
                    children: <StatusTag status={preview.status} />,
                  },
                  {
                    key: 'units',
                    label: 'Don vi',
                    children: renderSuggestedCodes(preview.suggestedCodes.units, unitCodeDrafts, setUnitCodeDrafts),
                  },
                  {
                    key: 'departments',
                    label: 'Phong ban',
                    children: renderSuggestedCodes(preview.suggestedCodes.departments, departmentCodeDrafts, setDepartmentCodeDrafts),
                  },
                  {
                    key: 'employees',
                    label: 'Nhan su',
                    children: <Table rowKey="id" size="small" dataSource={rows} pagination={{ pageSize: 8 }} columns={[
                      { title: 'Dong', dataIndex: 'rowNumber' },
                      { title: 'Trang thai', dataIndex: 'validationStatus' },
                      { title: 'Ho ten', render: (_, row) => String(row.normalizedDataJson.fullName ?? '-') },
                      { title: 'Email', render: (_, row) => String(row.normalizedDataJson.companyEmail ?? '-') },
                    ]} />,
                  },
                  {
                    key: 'assignments',
                    label: 'Phan cong',
                    children: <Table rowKey="id" size="small" dataSource={rows} pagination={{ pageSize: 8 }} columns={[
                      { title: 'Dong', dataIndex: 'rowNumber' },
                      { title: 'Don vi', render: (_, row) => String(row.normalizedDataJson.unitName ?? '-') },
                      { title: 'Phong ban', render: (_, row) => String(row.normalizedDataJson.departmentName ?? '-') },
                      { title: 'Chuc danh', render: (_, row) => String(row.normalizedDataJson.jobTitle ?? '-') },
                    ]} />,
                  },
                  {
                    key: 'errors',
                    label: 'Loi',
                    children: <Table rowKey="id" size="small" dataSource={rows.filter((row) => row.validationStatus === 'ERROR')} pagination={false} columns={[
                      { title: 'Dong', dataIndex: 'rowNumber' },
                      { title: 'Chi tiet', render: (_, row) => JSON.stringify(row.validationErrorsJson) },
                    ]} />,
                  },
                  {
                    key: 'warnings',
                    label: 'Canh bao',
                    children: <Table rowKey="id" size="small" dataSource={rows.filter((row) => row.validationStatus === 'WARNING')} pagination={false} columns={[
                      { title: 'Dong', dataIndex: 'rowNumber' },
                      { title: 'Chi tiet', render: (_, row) => JSON.stringify(row.validationWarningsJson) },
                    ]} />,
                  },
                ]}
              />
            </Space>
          </Card>
        ) : null}

        <Card className="page-card" title="Lich su batch">
          <Table
            rowKey="id"
            dataSource={data.data}
            pagination={false}
            columns={[
              { title: 'Batch code', dataIndex: 'batchCode' },
              { title: 'Import type', dataIndex: 'importType' },
              { title: 'File name', dataIndex: 'fileName' },
              { title: 'Total', dataIndex: 'totalRows' },
              { title: 'Success', dataIndex: 'successRows' },
              { title: 'Failed', dataIndex: 'failedRows' },
              { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
              { title: 'Created at', render: (_, record) => formatDateTime(record.createdAt) },
              {
                title: 'Actions',
                render: (_, record) => (
                  <Space>
                    <Button
                      onClick={async () => {
                        const detail = await getImportBatch(record.id);
                        setSelected(detail);
                      }}
                    >
                      Detail
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
          <Card className="page-card" title="Batch detail">
            <p>Batch code: {selected.batchCode}</p>
            <p>File: {selected.fileName}</p>
            <p>Status: <StatusTag status={selected.status} /></p>
          </Card>
        ) : null}
      </Space>
    </>
  );
}
