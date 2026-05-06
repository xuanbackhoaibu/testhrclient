import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  SegmentedControl,
  Stack,
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
      await login(role);
      navigate(ROUTES.dashboard, { replace: true });
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
      await login({
        loginIdentifier: values.loginIdentifier,
        password: values.password,
        rememberMe: values.rememberMe,
      });
      await refreshCurrentUser();

      const authState = useAuthStore.getState();
      if (authState.user && authState.isAuthenticated) {
        notifications.show({
          color: "green",
          title: "Đăng nhập thành công",
          message: "Đang mở HRM.",
        });
        navigate(ROUTES.dashboard, { replace: true });
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
          <SegmentedControl
            fullWidth
            value={role}
            data={demoRoles}
            onChange={(value) => setRole(value as DemoRole)}
            disabled={submitting}
          />
          <Button size="md" loading={submitting} onClick={handleMockLogin}>
            Đăng nhập mock
          </Button>
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
              {...form.getInputProps("loginIdentifier")}
            />
            <PasswordInput
              label="Mật khẩu"
              placeholder="Mật khẩu"
              leftSection={<IconLock size={18} />}
              autoComplete="current-password"
              disabled={submitting}
              {...form.getInputProps("password")}
            />
            <Checkbox
              label="Ghi nhớ đăng nhập"
              disabled={submitting}
              {...form.getInputProps("rememberMe", { type: "checkbox" })}
            />
            <Button type="submit" size="md" loading={submitting}>
              Đăng nhập
            </Button>
          </Stack>
        </form>
      )}
    </Stack>
  );
}
