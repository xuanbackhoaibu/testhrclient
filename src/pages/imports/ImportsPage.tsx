import { useState } from 'react';
import { Button, Card, Modal, Space, Table, Upload, message } from 'antd';
import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { getImportBatch, importAttendanceCsv, importEmployeesCsv } from '../../features/imports/importsApi';
import type { ImportBatch } from '../../features/imports/importTypes';
import { useImportBatches } from '../../features/imports/useImportBatches';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDateTime } from '../../shared/utils/date';

export function ImportsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ImportBatch | null>(null);
  const { data, isLoading, error, refetch } = useImportBatches({ page: 1, pageSize: 20 });

  const employeeImportMutation = useMutation({
    mutationFn: importEmployeesCsv,
    onSuccess: async () => {
      message.success('Đã upload employee CSV.');
      await queryClient.invalidateQueries({ queryKey: ['import-batches'] });
    },
  });

  const attendanceImportMutation = useMutation({
    mutationFn: importAttendanceCsv,
    onSuccess: async () => {
      message.success('Đã upload attendance CSV.');
      await queryClient.invalidateQueries({ queryKey: ['import-batches'] });
    },
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageHeader title="Imports" subtitle="CSV upload UI cho employee và attendance batches." />
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card className="page-card" title="Upload CSV">
          <Space wrap>
            <Upload showUploadList={false} beforeUpload={(file) => { employeeImportMutation.mutate(file); return false; }}>
              <Button icon={<UploadOutlined />} loading={employeeImportMutation.isPending}>
                Upload employee CSV
              </Button>
            </Upload>
            <Upload showUploadList={false} beforeUpload={(file) => { attendanceImportMutation.mutate(file); return false; }}>
              <Button icon={<InboxOutlined />} loading={attendanceImportMutation.isPending}>
                Upload attendance CSV
              </Button>
            </Upload>
          </Space>
        </Card>

        <Card className="page-card">
          <Table
            rowKey="id"
            dataSource={data.data}
            pagination={false}
            columns={[
              { title: 'Batch code', dataIndex: 'batchCode' },
              { title: 'Import type', dataIndex: 'importType' },
              { title: 'File name', dataIndex: 'fileName' },
              { title: 'Total rows', dataIndex: 'totalRows' },
              { title: 'Success rows', dataIndex: 'successRows' },
              { title: 'Failed rows', dataIndex: 'failedRows' },
              { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
              { title: 'Created at', render: (_, record) => formatDateTime(record.createdAt) },
              {
                title: 'Actions',
                render: (_, record) => (
                  <Button
                    onClick={async () => {
                      const detail = await getImportBatch(record.id);
                      setSelected(detail);
                    }}
                  >
                    View batch detail
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      </Space>

      <Modal open={Boolean(selected)} title="Import batch detail" footer={null} width={800} onCancel={() => setSelected(null)}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card size="small">
            <p>Batch code: {selected?.batchCode}</p>
            <p>File: {selected?.fileName}</p>
            <p>Status: <StatusTag status={selected?.status} /></p>
          </Card>
          <Table
            rowKey="rowNo"
            dataSource={selected?.errorSummary ?? []}
            pagination={false}
            columns={[
              { title: 'Row no', dataIndex: 'rowNo' },
              { title: 'Field', dataIndex: 'field' },
              { title: 'Message', dataIndex: 'message' },
            ]}
          />
        </Space>
      </Modal>
    </>
  );
}

