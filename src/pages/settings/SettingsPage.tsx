import { Card, Descriptions, Space, Typography } from 'antd';

import { useAuth } from '../../features/auth/useAuth';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatList } from '../../shared/utils/format';

export function SettingsPage() {
  const { user, roles } = useAuth();

  return (
    <>
      <PageHeader title="Settings" subtitle="Hiển thị runtime config và session context hiện tại." />
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card className="page-card">
          <Descriptions column={1} title="Application config">
            <Descriptions.Item label="API base URL">{import.meta.env.VITE_API_BASE_URL}</Descriptions.Item>
            <Descriptions.Item label="Auth mode">{import.meta.env.VITE_AUTH_MODE}</Descriptions.Item>
            <Descriptions.Item label="Mock mode">{import.meta.env.VITE_USE_MOCKS}</Descriptions.Item>
            <Descriptions.Item label="Chat auth base URL">{import.meta.env.VITE_CHAT_AUTH_BASE_URL}</Descriptions.Item>
            <Descriptions.Item label="Chat auth login URL">{import.meta.env.VITE_CHAT_AUTH_LOGIN_URL}</Descriptions.Item>
            <Descriptions.Item label="Chat auth redirect URI">{import.meta.env.VITE_CHAT_AUTH_REDIRECT_URI}</Descriptions.Item>
          </Descriptions>
        </Card>
        <Card className="page-card">
          <Descriptions column={1} title="Current user">
            <Descriptions.Item label="User">{user?.fullName ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Email">{user?.email ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Employee ID">{user?.employeeId ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Roles">{formatList(roles)}</Descriptions.Item>
            <Descriptions.Item label="Data scopes">{formatList(user?.dataScopes)}</Descriptions.Item>
          </Descriptions>
        </Card>
        <Typography.Paragraph type="secondary">
          Frontend không gọi POST /auth/login của HRM backend. Real mode redirect sang chat-auth-service và sau đó gọi GET /auth/me của HR API để lấy HRM profile.
        </Typography.Paragraph>
      </Space>
    </>
  );
}

