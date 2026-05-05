import { Card, Col, List, Row, Statistic } from 'antd';

import { useDashboardSummary } from '../features/dashboard/useDashboardSummary';
import { EmptyState } from '../shared/components/EmptyState';
import { ErrorState } from '../shared/components/ErrorState';
import { LoadingState } from '../shared/components/LoadingState';
import { PageHeader } from '../shared/components/PageHeader';

export function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboardSummary();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  const metrics = [
    { title: 'Total employees', value: data.totalEmployees },
    { title: 'Active employees', value: data.activeEmployees },
    { title: 'New hires this month', value: data.newHiresThisMonth },
    { title: 'Terminated this month', value: data.terminatedThisMonth },
    { title: 'Pending leave requests', value: data.pendingLeaveRequests },
    { title: 'Pending movements', value: data.pendingMovements },
    { title: 'Onboarding in progress', value: data.onboardingInProgress },
    { title: 'Offboarding in progress', value: data.offboardingInProgress },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Snapshot cho HR Core Platform demo với mock data và auth flow tách khỏi HR backend."
      />

      <Row gutter={[16, 16]}>
        {metrics.map((metric) => (
          <Col key={metric.title} xs={24} sm={12} xl={6}>
            <Card className="page-card metric-card">
              <Statistic title={metric.title} value={metric.value} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} lg={12}>
          <Card title="Employees by legal entity" className="page-card">
            <List
              dataSource={data.employeesByLegalEntity}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta title={item.label} />
                  <strong>{item.value}</strong>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Employees by employment status" className="page-card">
            <List
              dataSource={data.employeesByEmploymentStatus}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta title={item.label} />
                  <strong>{item.value}</strong>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}

