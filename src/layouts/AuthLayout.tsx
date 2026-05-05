import { Card, Col, Layout, Row, Typography } from 'antd';
import { Outlet } from 'react-router-dom';

const { Content } = Layout;

export function AuthLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #eef5ff 0%, #f7f9fc 100%)' }}>
      <Content style={{ padding: 24 }}>
        <Row justify="center" align="middle" style={{ minHeight: 'calc(100vh - 48px)' }}>
          <Col xs={24} sm={20} md={14} lg={10} xl={8}>
            <Card bordered={false} className="page-card">
              <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 8 }}>
                HACOM HRM
              </Typography.Title>
              <Typography.Paragraph type="secondary">
                HR Core Platform uses chat-auth-service for login, logout, token, and session.
              </Typography.Paragraph>
              <Outlet />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
