import { useState } from 'react';
import { Button, Card, Col, Input, Modal, Row, Select, Space, Table } from 'antd';

import type { AuditLog } from '../../features/audit/auditTypes';
import { useAuditLogs } from '../../features/audit/useAuditLogs';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatDateTime } from '../../shared/utils/date';

export function AuditLogsPage() {
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 20,
    entityType: undefined as string | undefined,
    entityId: undefined as string | undefined,
    action: undefined as string | undefined,
    actorUserId: undefined as string | undefined,
    fromDate: undefined as string | undefined,
    toDate: undefined as string | undefined,
    search: '',
  });
  const { data, isLoading, error, refetch } = useAuditLogs(params);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Theo dõi ai thay đổi entity nào và trước/sau ra sao." />
      <Card className="page-card">
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={12}>
            <Col xs={24} md={6}>
              <Select allowClear placeholder="Entity type" style={{ width: '100%' }} options={['EMPLOYEE', 'LEAVE_REQUEST', 'DEPARTMENT', 'UNIT', 'CONTRACT', 'IMPORT_BATCH'].map((item) => ({ value: item, label: item }))} onChange={(value) => setParams((current) => ({ ...current, entityType: value }))} />
            </Col>
            <Col xs={24} md={4}>
              <Input placeholder="Entity ID" onChange={(event) => { const value = event.target.value || undefined; setParams((current) => ({ ...current, entityId: value })); }} />
            </Col>
            <Col xs={24} md={4}>
              <Input placeholder="Action" onChange={(event) => { const value = event.target.value || undefined; setParams((current) => ({ ...current, action: value })); }} />
            </Col>
            <Col xs={24} md={4}>
              <Input placeholder="Actor user ID" onChange={(event) => { const value = event.target.value || undefined; setParams((current) => ({ ...current, actorUserId: value })); }} />
            </Col>
            <Col xs={24} md={3}>
              <Input type="date" onChange={(event) => { const value = event.target.value || undefined; setParams((current) => ({ ...current, fromDate: value })); }} />
            </Col>
            <Col xs={24} md={3}>
              <Input type="date" onChange={(event) => { const value = event.target.value || undefined; setParams((current) => ({ ...current, toDate: value })); }} />
            </Col>
          </Row>

          <Input.Search placeholder="Search entity type, actor, entity ID" allowClear onSearch={(search) => setParams((current) => ({ ...current, search }))} />

          <Table
            rowKey="id"
            dataSource={data.items}
            pagination={{
              current: data.pagination.page,
              pageSize: data.pagination.pageSize,
              total: data.pagination.total,
              onChange: (page, pageSize) => setParams((current) => ({ ...current, page, pageSize })),
            }}
            columns={[
              { title: 'Entity type', dataIndex: 'entityType' },
              { title: 'Entity ID', dataIndex: 'entityId' },
              { title: 'Action', dataIndex: 'action' },
              { title: 'Actor', dataIndex: 'actorName' },
              { title: 'Created at', render: (_, record) => formatDateTime(record.createdAt) },
              { title: 'Actions', render: (_, record) => <Button onClick={() => setSelected(record)}>Detail</Button> },
            ]}
          />
        </Space>
      </Card>

      <Modal open={Boolean(selected)} title="Audit log detail" footer={null} width={900} onCancel={() => setSelected(null)}>
        <Space orientation="vertical" style={{ width: '100%' }}>
          <div>
            <strong>Before</strong>
            <pre className="json-block">{JSON.stringify(selected?.beforeJson ?? {}, null, 2)}</pre>
          </div>
          <div>
            <strong>After</strong>
            <pre className="json-block">{JSON.stringify(selected?.afterJson ?? {}, null, 2)}</pre>
          </div>
        </Space>
      </Modal>
    </>
  );
}
