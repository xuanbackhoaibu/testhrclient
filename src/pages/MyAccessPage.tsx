import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconRefresh, IconShieldCheck } from '@tabler/icons-react';
import { useState } from 'react';

import {
  describeAccessScopes,
  roleBusinessLabel,
  summarizeEffectiveAccess,
} from '../features/auth/accessPresentation';
import { isSuperAdmin } from '../features/auth/routePolicies';
import { useAuth } from '../features/auth/useAuth';
import { PageHeader } from '../shared/components/PageHeader';

export function MyAccessPage() {
  const { user, refreshCurrentUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  if (!user) return <Loader size="sm" />;

  const modules = summarizeEffectiveAccess(user.permissions);
  const scopeInputs = user.scopes?.length
    ? user.scopes
    : user.dataScopes.map((scope) => ({
        scopeType: scope.scopeType,
        unitId: scope.unitId,
        departmentId: scope.departmentId,
      }));
  const scopeLabels = describeAccessScopes(scopeInputs);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshCurrentUser();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Quyền truy cập của tôi"
        subtitle="Quyền hiệu lực hiện tại quyết định các màn hình, thao tác và dữ liệu bạn được sử dụng sau khi đăng nhập."
        actions={
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            loading={refreshing}
            onClick={() => void refresh()}
          >
            Làm mới quyền
          </Button>
        }
      />

      {isSuperAdmin(user) ? (
        <Alert color="red" icon={<IconShieldCheck size={18} />} title="Quyền Super Admin">
          Tài khoản có toàn quyền hệ thống, bao gồm quản trị vai trò và phân quyền tài khoản.
        </Alert>
      ) : null}

      <Paper withBorder radius="md" p={{ base: 'md', md: 'lg' }}>
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={4}>
              <Title order={2} size="h4">
                {user.fullName || user.email}
              </Title>
              <Text size="sm" c="dimmed">
                {user.email}
              </Text>
            </Stack>
            <Badge color={user.accountStatus === 'ACTIVE' ? 'green' : 'gray'} variant="light">
              {user.accountStatus === 'ACTIVE' ? 'Đang hoạt động' : user.accountStatus}
            </Badge>
          </Group>

          <Stack gap="xs">
            <Text fw={600}>Vai trò được gán</Text>
            <Group gap="xs">
              {user.roles.length ? (
                user.roles.map((role) => (
                  <Badge key={role} color="blue" variant="light">
                    {roleBusinessLabel(role)}
                  </Badge>
                ))
              ) : (
                <Text size="sm" c="dimmed">Chưa được gán vai trò.</Text>
              )}
            </Group>
          </Stack>

          <Stack gap="xs">
            <Text fw={600}>Phạm vi dữ liệu</Text>
            <Group gap="xs">
              {scopeLabels.map((scope) => (
                <Badge key={scope} color="teal" variant="light">
                  {scope}
                </Badge>
              ))}
            </Group>
          </Stack>

          <Stack gap="xs">
            <Title order={2} size="h4">Các phân hệ có thể sử dụng</Title>
            <Text size="sm" c="dimmed">
              Nút tạo, sửa, xóa hoặc duyệt trong từng màn hình tiếp tục được kiểm tra bằng quyền hiệu lực tương ứng.
            </Text>

            {modules.length ? (
              <Table.ScrollContainer minWidth={680}>
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Phân hệ</Table.Th>
                      <Table.Th>Hiệu lực</Table.Th>
                      <Table.Th>Thao tác được phép</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {modules.map((module) => (
                      <Table.Tr key={module.key}>
                        <Table.Td>
                          <Text fw={600} size="sm">{module.label}</Text>
                          <Text size="xs" c="dimmed" maw={420}>{module.description}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="green" variant="light">Có hiệu lực</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={6}>
                            {module.actions.map((action) => (
                              <Badge key={action} color="gray" variant="light">
                                {action}
                              </Badge>
                            ))}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            ) : (
              <Alert color="yellow" title="Chưa có quyền nghiệp vụ">
                Tài khoản chưa có quyền hiệu lực cho bất kỳ phân hệ HRM nào.
              </Alert>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
