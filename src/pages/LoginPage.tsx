import { useState } from "react";
import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  Divider,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  PasswordInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconLock, IconUser } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import type { DemoRole } from "../features/auth/types";
import { useAuthStore } from "../features/auth/authStore";
import { useAuth } from "../features/auth/useAuth";
import { ROUTES } from "../shared/constants/routes";

interface LoginFormValues {
  loginIdentifier: string;
  password: string;
  rememberMe: boolean;
}

const demoRoles: Array<{ label: string; value: DemoRole }> = [
  { label: "Super Admin", value: "SUPER_ADMIN" },
  { label: "Admin", value: "ADMIN" },
  { label: "HR", value: "HR" },
  { label: "Ban lãnh đạo", value: "BAN_LANH_DAO" },
  { label: "Ban lãnh đạo đơn vị", value: "BAN_LANH_DAO_DON_VI" },
  { label: "Employee", value: "EMPLOYEE" },
];

function readLoginError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Không đăng nhập được. Vui lòng kiểm tra tài khoản và thử lại.";
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, error, refreshCurrentUser } = useAuth();
  const [role, setRole] = useState<DemoRole>("HR");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const isMockMode = import.meta.env.VITE_USE_MOCKS === "true";

  const form = useForm<LoginFormValues>({
    initialValues: {
      loginIdentifier: "",
      password: "",
      rememberMe: true,
    },
    validate: {
      loginIdentifier: (value) =>
        value.trim() ? null : "Nhập email, số điện thoại hoặc mã nhân viên.",
      password: (value) => (value ? null : "Nhập mật khẩu."),
    },
  });

  async function handleMockLogin() {
    setSubmitting(true);
    setLoginError(null);
    try {
      const result = await login(role);
      if (result.mustChangePassword || result.nextAction === 'CHANGE_PASSWORD_REQUIRED') {
        navigate(ROUTES.changePassword, { replace: true });
        return;
      }
      navigate(ROUTES.root, { replace: true });
    } catch (loginFailure) {
      setLoginError(readLoginError(loginFailure));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRealLogin(values: LoginFormValues) {
    setSubmitting(true);
    setLoginError(null);
    try {
      const result = await login({
        loginIdentifier: values.loginIdentifier,
        password: values.password,
        rememberMe: values.rememberMe,
      });

      if (
        result.mustChangePassword ||
        result.nextAction === 'CHANGE_PASSWORD_REQUIRED'
      ) {
        navigate(ROUTES.changePassword, { replace: true });
        return;
      }

      await refreshCurrentUser();

      const authState = useAuthStore.getState();
      if (authState.user && authState.isAuthenticated) {
        notifications.show({
          color: "green",
          title: "Đăng nhập thành công",
          message: "Đang mở HRM.",
        });
        navigate(ROUTES.root, { replace: true });
        return;
      }

      setLoginError(
        authState.error ??
        "Đăng nhập thành công nhưng chưa tải được hồ sơ HRM.",
      );
    } catch (loginFailure) {
      setLoginError(readLoginError(loginFailure));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Text size="xl" fw={700}>
          Chào mừng đến HACOM HRM
        </Text>
        <Text c="dimmed" size="sm">
          Đăng nhập để tiếp cận dữ liệu nhân sự, phê duyệt và báo cáo nội bộ.
        </Text>
      </Stack>

      <Paper withBorder radius="lg" p="lg" bg="white" style={{ boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)' }}>
        <Stack gap="md">
          {error ? (
            <Alert color="yellow" icon={<IconAlertCircle size={18} />}>
              {error}
            </Alert>
          ) : null}
          {loginError ? (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {loginError}
            </Alert>
          ) : null}

          {isMockMode ? (
            <Stack gap="md">
              <Text c="dimmed" size="sm">
                Chế độ demo mock chỉ dùng trong môi trường phát triển.
              </Text>
              <Paper withBorder radius="md" p="md" bg="#f8fafc">
                <Select
                  data={demoRoles.map((item) => ({ value: item.value, label: item.label }))}
                  value={role}
                  onChange={(value) => setRole(value as DemoRole)}
                  disabled={submitting}
                  searchable={false}
                  clearable={false}
                  radius="md"
                  rightSectionWidth={30}
                />
              </Paper>
              <Button size="md" loading={submitting} fullWidth onClick={handleMockLogin}>
                Đăng nhập mock
              </Button>
              <Text c="dimmed" size="xs">
                Chọn vai trò và nhấn đăng nhập để thử nghiệm màn hình quản trị.
              </Text>
            </Stack>
          ) : (
            <form onSubmit={form.onSubmit(handleRealLogin)}>
              <Stack gap="md">
                <TextInput
                  label="Email / Số điện thoại / Mã nhân viên"
                  placeholder="Nhập email, số điện thoại hoặc mã nhân viên"
                  leftSection={<IconUser size={18} />}
                  autoComplete="username"
                  disabled={submitting}
                  radius="md"
                  styles={{ input: { minHeight: 48 } }}
                  {...form.getInputProps("loginIdentifier")}
                />
                <PasswordInput
                  label="Mật khẩu"
                  placeholder="Nhập mật khẩu"
                  leftSection={<IconLock size={18} />}
                  autoComplete="current-password"
                  disabled={submitting}
                  radius="md"
                  styles={{ input: { minHeight: 48 } }}
                  {...form.getInputProps("password")}
                />
                <Group style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Checkbox
                    label="Ghi nhớ đăng nhập"
                    disabled={submitting}
                    {...form.getInputProps("rememberMe", { type: "checkbox" })}
                  />
                  <Anchor size="sm" color="blue" href="#" onClick={(event) => event.preventDefault()}>
                    Quên mật khẩu?
                  </Anchor>
                </Group>
                <Divider />
                <Button type="submit" size="md" loading={submitting} fullWidth>
                  Đăng nhập
                </Button>
                <Text c="dimmed" size="sm" style={{ textAlign: 'center' }}>
                  Nếu cần hỗ trợ truy cập, liên hệ phòng IT nội bộ.
                </Text>
              </Stack>
            </form>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
