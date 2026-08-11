import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Badge,
  Group,
  Kbd,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarPlus,
  IconFileExport,
  IconSearch,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { mockEmployees } from "../../shared/mocks/mockEmployees";
import { ROUTES } from "../../shared/constants/routes";

interface CommandRoute {
  label: string;
  path: string;
  icon: ComponentType<{ size?: number }>;
}

interface GlobalCommandCenterProps {
  routes: CommandRoute[];
}

interface CommandAction {
  id: string;
  label: string;
  description: string;
  group: string;
  keywords: string;
  icon: ComponentType<{ size?: number }>;
  run: () => void;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || target.isContentEditable;
}

function matchesCommand(command: CommandAction, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = `${command.label} ${command.description} ${command.group} ${command.keywords}`.toLowerCase();
  return haystack.includes(normalized);
}

export function GlobalCommandCenter({ routes }: GlobalCommandCenterProps) {
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const [helpOpened, setHelpOpened] = useState(false);
  const [query, setQuery] = useState("");

  const commands = useMemo<CommandAction[]>(() => {
    const routeCommands = routes.map((route) => ({
      id: `route:${route.path}`,
      label: route.label,
      description: route.path,
      group: "Điều hướng",
      keywords: route.path,
      icon: route.icon,
      run: () => navigate(route.path),
    }));

    const employeeCommands = mockEmployees.slice(0, 20).map((employee) => ({
      id: `employee:${employee.id}`,
      label: employee.fullName,
      description: `${employee.employeeCode} · ${employee.companyEmail ?? "Chưa có email"}`,
      group: "Hồ sơ nhân sự",
      keywords: `${employee.employeeCode} ${employee.companyEmail ?? ""} ${employee.phone ?? ""}`,
      icon: IconUser,
      run: () => navigate(`/employees/${employee.id}`),
    }));

    return [
      {
        id: "action:create-leave",
        label: "Tạo đơn nghỉ",
        description: "Mở form tạo đơn nghỉ phép",
        group: "Thao tác nhanh",
        keywords: "nghi phep leave create c",
        icon: IconCalendarPlus,
        run: () => navigate(`${ROUTES.leave}?action=create`),
      },
      {
        id: "action:export-timesheet",
        label: "Xuất Excel Bảng công",
        description: "Mở bảng công tháng và xuất dữ liệu hiện tại",
        group: "Thao tác nhanh",
        keywords: "export excel bang cong timesheet e",
        icon: IconFileExport,
        run: () => navigate(`${ROUTES.timesheetGrid}?action=export`),
      },
      {
        id: "action:employees",
        label: "Mở danh sách nhân sự",
        description: "Đi tới EmployeesPage",
        group: "Thao tác nhanh",
        keywords: "nhan su employees hr",
        icon: IconUsers,
        run: () => navigate(ROUTES.employees),
      },
      ...routeCommands,
      ...employeeCommands,
    ];
  }, [navigate, routes]);

  const filteredCommands = useMemo(
    () => commands.filter((command) => matchesCommand(command, query)).slice(0, 12),
    [commands, query],
  );

  function runCommand(command: CommandAction) {
    command.run();
    setOpened(false);
    setQuery("");
  }

  useEffect(() => {
    function openCommandCenter() {
      setOpened(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpened(true);
        return;
      }

      if (event.key === "?" && !isTypingTarget(event.target)) {
        event.preventDefault();
        setHelpOpened(true);
        return;
      }

      if (event.key.toLowerCase() === "c" && !isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey && !event.altKey) {
        navigate(`${ROUTES.leave}?action=create`);
        return;
      }

      if (event.key.toLowerCase() === "e" && !isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey && !event.altKey) {
        window.dispatchEvent(new CustomEvent("hrm:export-current-page"));
        notifications.show({
          color: "blue",
          title: "Xuất dữ liệu trang hiện tại",
          message: "Nếu trang hiện tại hỗ trợ export nhanh, file sẽ được tải xuống ngay.",
        });
        return;
      }

      if (event.key === "Escape") {
        setOpened(false);
        setHelpOpened(false);
      }
    }

    window.addEventListener("hrm:open-command-center", openCommandCenter);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("hrm:open-command-center", openCommandCenter);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate]);

  return (
    <>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Command Center" size="lg" centered>
        <Stack gap="sm">
          <TextInput
            autoFocus
            leftSection={<IconSearch size={17} />}
            placeholder="Tìm nhân sự, mở màn hình, chạy thao tác nhanh..."
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <ScrollArea.Autosize mah={420} type="hover">
            <Stack gap={6}>
              {filteredCommands.map((command) => {
                const CommandIcon = command.icon;
                return (
                  <UnstyledButton
                    key={command.id}
                    className="global-command-item"
                    onClick={() => runCommand(command)}
                  >
                    <Group wrap="nowrap" justify="space-between">
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon variant="light" radius="md" size={34}>
                          <CommandIcon size={18} />
                        </ThemeIcon>
                        <Stack gap={0} style={{ minWidth: 0 }}>
                          <Text fw={700} size="sm" truncate>{command.label}</Text>
                          <Text size="xs" c="dimmed" truncate>{command.description}</Text>
                        </Stack>
                      </Group>
                      <Badge variant="light" color="gray">{command.group}</Badge>
                    </Group>
                  </UnstyledButton>
                );
              })}
              {filteredCommands.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  Không tìm thấy lệnh phù hợp.
                </Text>
              ) : null}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Modal>

      <Modal opened={helpOpened} onClose={() => setHelpOpened(false)} title="Danh sách phím tắt" size="md" centered>
        <Stack gap="sm">
          {[
            ["Ctrl/Cmd", "K", "Mở Command Center"],
            ["?", "", "Mở danh sách phím tắt"],
            ["C", "", "Tạo đơn nghỉ phép"],
            ["E", "", "Xuất dữ liệu trang hiện tại"],
            ["Esc", "", "Đóng Command Center / trợ giúp"],
          ].map(([key, secondKey, label]) => (
            <Group key={label} justify="space-between">
              <Text size="sm">{label}</Text>
              <Group gap={4}>
                <Kbd>{key}</Kbd>
                {secondKey ? <Kbd>{secondKey}</Kbd> : null}
              </Group>
            </Group>
          ))}
        </Stack>
      </Modal>
    </>
  );
}
