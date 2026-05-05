import { useState } from 'react';
import { Alert, Button, Card, Flex, Radio, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import type { DemoRole } from '../features/auth/types';
import { useAuth } from '../features/auth/useAuth';
import { ROUTES } from '../shared/constants/routes';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, error } = useAuth();
  const [role, setRole] = useState<DemoRole>('HR_ADMIN');
  const [submitting, setSubmitting] = useState(false);

  const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

  async function handleLogin() {
    setSubmitting(true);
    try {
      await login(role);
      if (isMockMode) {
        navigate(ROUTES.dashboard, { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      {error ? <Alert type="warning" showIcon message={error} /> : null}

      <Card className="page-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {isMockMode ? 'Local demo login' : 'Login with Chat Auth'}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            HR web client không login trực tiếp vào HRM backend bằng username/password.
          </Typography.Paragraph>

          {isMockMode ? (
            <Flex vertical gap={16}>
              <Radio.Group
                value={role}
                onChange={(event) => setRole(event.target.value as DemoRole)}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="HR_ADMIN">HR Admin</Radio.Button>
                <Radio.Button value="MANAGER">Manager</Radio.Button>
                <Radio.Button value="EMPLOYEE">Employee</Radio.Button>
              </Radio.Group>
              <Button type="primary" size="large" loading={submitting} onClick={handleLogin}>
                Login mock
              </Button>
            </Flex>
          ) : (
            <Button type="primary" size="large" loading={submitting} onClick={handleLogin}>
              Login with Chat Auth
            </Button>
          )}
        </Space>
      </Card>
    </Space>
  );
}

