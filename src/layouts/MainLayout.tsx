import {
  AuditOutlined,
  BankOutlined,
  CalendarOutlined,
  CarryOutOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  DownOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  ImportOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Breadcrumb, Button, Dropdown, Flex, Layout, Menu, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../features/auth/useAuth';
import { ROUTES } from '../shared/constants/routes';

const { Header, Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  { key: ROUTES.dashboard, icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: ROUTES.employees, icon: <TeamOutlined />, label: 'Employees' },
  {
    key: 'organization',
    icon: <BankOutlined />,
    label: 'Organization',
    children: [
      { key: ROUTES.legalEntities, label: 'Legal Entities' },
      { key: ROUTES.orgUnits, label: 'Org Units' },
      { key: ROUTES.positions, label: 'Positions' },
    ],
  },
  { key: ROUTES.movements, icon: <DeploymentUnitOutlined />, label: 'Movements' },
  { key: ROUTES.contracts, icon: <FileSearchOutlined />, label: 'Contracts' },
  { key: ROUTES.leave, icon: <CalendarOutlined />, label: 'Leave' },
  { key: ROUTES.attendance, icon: <CarryOutOutlined />, label: 'Attendance' },
  { key: ROUTES.onboarding, icon: <FolderOpenOutlined />, label: 'Onboarding' },
  { key: ROUTES.offboarding, icon: <ImportOutlined />, label: 'Offboarding' },
  { key: ROUTES.imports, icon: <ImportOutlined />, label: 'Imports' },
  { key: ROUTES.auditLogs, icon: <AuditOutlined />, label: 'Audit Logs' },
  { key: ROUTES.settings, icon: <SettingOutlined />, label: 'Settings' },
];

const routeTitles: Record<string, string> = {
  [ROUTES.dashboard]: 'Dashboard',
  [ROUTES.employees]: 'Employees',
  [ROUTES.legalEntities]: 'Legal Entities',
  [ROUTES.orgUnits]: 'Org Units',
  [ROUTES.positions]: 'Positions',
  [ROUTES.movements]: 'Movements',
  [ROUTES.contracts]: 'Contracts',
  [ROUTES.leave]: 'Leave',
  [ROUTES.attendance]: 'Attendance',
  [ROUTES.onboarding]: 'Onboarding',
  [ROUTES.offboarding]: 'Offboarding',
  [ROUTES.imports]: 'Imports',
  [ROUTES.auditLogs]: 'Audit Logs',
  [ROUTES.settings]: 'Settings',
};

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const selectedKey =
    location.pathname.startsWith('/employees/') ? ROUTES.employees : location.pathname;

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{user?.fullName ?? 'Unknown user'}</Typography.Text>
          <Typography.Text type="secondary">{user?.email ?? '-'}</Typography.Text>
        </Space>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: () => logout(),
    },
  ];

  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={248} breakpoint="lg" collapsedWidth={72}>
        <Flex vertical style={{ height: '100%' }}>
          <Flex align="center" gap={12} style={{ padding: '20px 16px' }}>
            <Avatar shape="square" size={40} style={{ background: '#1677ff' }}>
              HR
            </Avatar>
            <Flex vertical>
              <Typography.Text strong>HACOM HRM</Typography.Text>
              <Typography.Text type="secondary">Phase 1 Demo</Typography.Text>
            </Flex>
          </Flex>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            defaultOpenKeys={['organization']}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ borderInlineEnd: 0, flex: 1 }}
          />
        </Flex>
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Flex vertical gap={4}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {routeTitles[selectedKey] ?? 'HACOM HRM'}
            </Typography.Title>
            <Breadcrumb
              items={pathSegments.map((segment) => ({
                title: segment,
              }))}
            />
          </Flex>

          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <Button type="text">
              <Space>
                <Avatar icon={<UserOutlined />} />
                <span>{user?.fullName ?? 'User'}</span>
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
        </Header>

        <Content className="main-layout-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

