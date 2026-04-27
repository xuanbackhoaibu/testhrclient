import { useState } from 'react';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Flex, Form, Input, Radio, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import type { DemoRole } from '../features/auth/types';
import { useAuth } from '../features/auth/useAuth';
import { useAuthStore } from '../features/auth/authStore';
import { ROUTES } from '../shared/constants/routes';

interface LoginFormValues {
  loginIdentifier: string;
  password: string;
  rememberMe?: boolean;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, error, refreshCurrentUser } = useAuth();
  const [role, setRole] = useState<DemoRole>('HR_ADMIN');
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

  async function handleMockLogin() {
    setSubmitting(true);
    setLoginError(null);
    try {
      await login(role);
      navigate(ROUTES.dashboard, { replace: true });
    } catch (loginFailure) {
      setLoginError(loginFailure instanceof Error ? loginFailure.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRealLogin(values: LoginFormValues) {
    setSubmitting(true);
    setLoginError(null);
    try {
      await login({
        loginIdentifier: values.loginIdentifier,
        password: values.password,
        rememberMe: values.rememberMe,
      });
      await refreshCurrentUser();

      const authState = useAuthStore.getState();
      if (authState.user && authState.isAuthenticated) {
        navigate(ROUTES.dashboard, { replace: true });
        return;
      }

      setLoginError(authState.error ?? 'Login succeeded, but HRM profile could not be loaded.');
    } catch (loginFailure) {
      setLoginError(loginFailure instanceof Error ? loginFailure.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      {error ? <Alert type="warning" showIcon message={error} /> : null}
      {loginError ? <Alert type="error" showIcon message={loginError} /> : null}

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
              <Button type="primary" size="large" loading={submitting} onClick={handleMockLogin}>
                Login mock
              </Button>
            </Flex>
          ) : (
            <Form<LoginFormValues>
              layout="vertical"
              initialValues={{ rememberMe: true }}
              onFinish={handleRealLogin}
              requiredMark={false}
            >
              <Form.Item
                label="Login identifier"
                name="loginIdentifier"
                rules={[{ required: true, message: 'Enter employee code or email.' }]}
              >
                <Input
                  size="large"
                  prefix={<UserOutlined />}
                  autoComplete="username"
                  placeholder="Employee code or email"
                />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Enter password.' }]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  autoComplete="current-password"
                  placeholder="Password"
                />
              </Form.Item>

              <Form.Item name="rememberMe" valuePropName="checked">
                <Checkbox>Remember me</Checkbox>
              </Form.Item>

              <Button type="primary" size="large" htmlType="submit" loading={submitting} block>
                Login with Chat Auth
              </Button>
            </Form>
          )}
        </Space>
      </Card>
    </Space>
  );
}
