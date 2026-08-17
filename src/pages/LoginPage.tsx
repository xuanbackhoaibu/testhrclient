import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  PasswordInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconCheck,
  IconSettings,
  IconShieldCheck,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import type { DemoRole } from "../features/auth/types";
import { useAuthStore } from "../features/auth/authStore";
import { useAuth } from "../features/auth/useAuth";
import { ROUTES } from "../shared/constants/routes";
import { getPostLoginDestination } from "../features/auth/postLoginDestination";
import "./LoginPage.css";

interface LoginFormValues {
  loginIdentifier: string;
  password: string;
  rememberMe: boolean;
}

const demoRoles: Array<{
  label: string;
  value: DemoRole;
  description: string;
  icon: typeof IconUser;
}> = [
  {
    label: "Super Admin",
    value: "SUPER_ADMIN",
    description: "Toàn quyền hệ thống",
    icon: IconShieldCheck,
  },
  {
    label: "Admin",
    value: "ADMIN",
    description: "Quản trị vận hành",
    icon: IconSettings,
  },
  {
    label: "HR",
    value: "HR",
    description: "Quản lý nhân sự",
    icon: IconUsers,
  },
  {
    label: "Ban lãnh đạo",
    value: "BAN_LANH_DAO",
    description: "Phê duyệt và báo cáo",
    icon: IconBriefcase,
  },
  {
    label: "Ban lãnh đạo đơn vị",
    value: "BAN_LANH_DAO_DON_VI",
    description: "Quản lý đơn vị",
    icon: IconBuildingSkyscraper,
  },
  {
    label: "Employee",
    value: "EMPLOYEE",
    description: "Nhân viên",
    icon: IconUser,
  },
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
      rememberMe: false,
    },
    validate: {
      loginIdentifier: (value) =>
        value.trim() ? null : "Nhập email, số điện thoại hoặc mã nhân viên.",
      password: (value) => (value ? null : "Nhập mật khẩu."),
    },
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  async function handleMockLogin() {
    setSubmitting(true);
    setLoginError(null);
    try {
      const result = await login(role);
      if (result.mustChangePassword || result.nextAction === 'CHANGE_PASSWORD_REQUIRED') {
        navigate(ROUTES.changePassword, { replace: true });
        return;
      }
      const authState = useAuthStore.getState();
      navigate(getPostLoginDestination(authState.user) ?? ROUTES.root, {
        replace: true,
      });
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
        navigate(getPostLoginDestination(authState.user) ?? ROUTES.root, {
          replace: true,
        });
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
    <Stack
      gap="lg"
      className={`login-card${mounted ? " login-card--mounted" : ""}`}
    >
      <Stack gap={4} align="center" className="login-header">
        <Image
          src="/logo.png"
          alt="Hacom Holdings"
          className="login-logo"
          fit="contain"
          w="auto"
          h={72}
          style={{ height: 72, width: "auto", maxWidth: 220 }}
        />
        <Text component="h1" ta="center" className="login-title" fw={700}>
          Chào mừng trở lại với <span className="login-title-accent">HACOM HRM</span>
        </Text>
        <Text ta="center" size="sm" c="dimmed" fw={400} className="login-subtitle">
          Đăng nhập vào tài khoản của bạn để tiếp tục
        </Text>
      </Stack>

      {error ? (
        <Alert color="yellow" icon={<IconAlertCircle size={18} />} radius="lg">
          {error}
        </Alert>
      ) : null}
      {loginError ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />} radius="lg">
          {loginError}
        </Alert>
      ) : null}

      {isMockMode ? (
        <Stack gap="md">
          <Stack gap={8}>
            <Text size="sm" fw={600} c="dimmed">
              Chọn vai trò demo
            </Text>
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
              {demoRoles.map((item) => {
                const Icon = item.icon;
                const selected = role === item.value;
                return (
                  <UnstyledButton
                    key={item.value}
                    type="button"
                    disabled={submitting}
                    onClick={() => setRole(item.value)}
                    className={`role-option-card${
                      selected ? " role-option-card--selected" : ""
                    }`}
                  >
                    <Group justify="space-between" wrap="nowrap" gap="sm">
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon
                          size={36}
                          radius="md"
                          variant={selected ? "filled" : "light"}
                          color="red"
                          className={selected ? "role-icon role-icon--selected" : "role-icon"}
                        >
                          <Icon size={18} />
                        </ThemeIcon>
                        <Stack gap={0}>
                          <Text size="sm" fw={600}>
                            {item.label}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {item.description}
                          </Text>
                        </Stack>
                      </Group>
                      {selected ? (
                        <ThemeIcon size={20} radius="xl" color="red" className="role-icon role-icon--selected">
                          <IconCheck size={13} />
                        </ThemeIcon>
                      ) : null}
                    </Group>
                  </UnstyledButton>
                );
              })}
            </SimpleGrid>
          </Stack>
          <Button
            size="md"
            radius="md"
            loading={submitting}
            onClick={handleMockLogin}
            className="login-submit-btn"
            fullWidth
          >
            Đăng nhập mock
          </Button>
        </Stack>
      ) : (
        <form onSubmit={form.onSubmit(handleRealLogin)}>
          <Stack gap="md">
            <TextInput
              label="Email hoặc mã nhân viên"
              placeholder="Nhập email hoặc mã nhân viên"
              autoComplete="username"
              disabled={submitting}
              radius="md"
              size="md"
              classNames={{ input: "login-input", label: "login-input-label" }}
              {...form.getInputProps("loginIdentifier")}
            />
            <PasswordInput
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              disabled={submitting}
              radius="md"
              size="md"
              classNames={{ input: "login-input", label: "login-input-label" }}
              {...form.getInputProps("password")}
            />
            <Group justify="space-between" wrap="nowrap" className="login-remember-row">
              <Checkbox
                label="Ghi nhớ đăng nhập"
                disabled={submitting}
                radius="sm"
                color="red"
                className="login-remember-checkbox"
                {...form.getInputProps("rememberMe", { type: "checkbox" })}
              />
            </Group>
            <Button
              type="submit"
              size="md"
              radius="md"
              loading={submitting}
              className="login-submit-btn"
              fullWidth
            >
              Đăng nhập ngay
            </Button>
          </Stack>
        </form>
      )}
    </Stack>
  );
}
