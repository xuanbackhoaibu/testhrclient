import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconRefresh, IconTrash } from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  useAdjustTimesheetDay,
  useRecomputeTimesheet,
  useTimesheetGrid,
} from "../../features/attendance/useTimesheet";
import {
  SYMBOL_OPTIONS,
  symbolColor,
  type TimesheetGridDay,
  type TimesheetGridRow,
} from "../../features/attendance/timesheetTypes";
import { useDepartmentsSelect } from "../../features/organization/useDepartments";
import { PageHeader } from "../../shared/components/PageHeader";

const now = new Date();
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Tháng ${index + 1}`,
}));
const yearOptions = Array.from({ length: 5 }, (_, index) => {
  const year = now.getFullYear() - 2 + index;
  return { value: String(year), label: String(year) };
});

interface EditingCell {
  day: TimesheetGridDay;
  row: TimesheetGridRow;
}

function lastDayOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().split("T")[0];
}

function getTimesheetCellClass(day: TimesheetGridDay): string {
  if (!day.isWorkingDay || day.displaySymbol.toLowerCase().includes("p")) {
    return "timesheet-cell timesheet-cell_leave";
  }
  if (day.needsExplanation || day.displaySymbol.toLowerCase().includes("v")) {
    return "timesheet-cell timesheet-cell_absent";
  }
  if (day.lateMinutes > 0 || day.earlyLeaveMinutes > 0) {
    return "timesheet-cell timesheet-cell_warning";
  }
  if (day.paidDays >= 1 || day.displaySymbol) {
    return "timesheet-cell timesheet-cell_ok";
  }
  return "timesheet-cell";
}

export function TimesheetGridPage() {
  const { can } = useAuth();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editSymbol, setEditSymbol] = useState<string | null>(null);
  const [editPortion, setEditPortion] = useState<number>(1);
  const [editReason, setEditReason] = useState("");

  const departmentsQuery = useDepartmentsSelect();
  const gridQuery = useTimesheetGrid({
    month,
    year,
    departmentId: departmentId ?? undefined,
  });
  const adjustDay = useAdjustTimesheetDay();
  const recompute = useRecomputeTimesheet();

  const dayColumns = useMemo(
    () =>
      Array.from({ length: gridQuery.data?.daysInMonth ?? 31 }, (_, i) => i + 1),
    [gridQuery.data?.daysInMonth],
  );

  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((department) => ({
        value: department.id,
        label: department.name,
      })),
    [departmentsQuery.data],
  );

  function openCell(row: TimesheetGridRow, day: TimesheetGridDay) {
    if (!canEdit || day.isLocked) {
      return;
    }
    setEditing({ row, day });
    const firstSymbol = day.displaySymbol.split(";")[0] || null;
    setEditSymbol(firstSymbol);
    setEditPortion(day.paidDays || 1);
    setEditReason("");
  }

  async function handleSaveCell() {
    if (!editing) {
      return;
    }
    if (editReason.trim().length < 3) {
      notifications.show({
        color: "red",
        title: "Thiếu lý do",
        message: "Sửa tay ô chấm công bắt buộc phải nêu lý do.",
      });
      return;
    }

    try {
      await adjustDay.mutateAsync({
        id: editing.day.id,
        payload: {
          segments: editSymbol
            ? [{ symbol: editSymbol, portion: editPortion }]
            : [],
          reason: editReason.trim(),
        },
      });
      notifications.show({
        color: "green",
        title: "Đã sửa ô chấm công",
        message:
          "Ô này được đánh dấu đã sửa tay — job tính lại sẽ không ghi đè nữa.",
      });
      setEditing(null);
    } catch {
      notifications.show({
        color: "red",
        title: "Không sửa được ô chấm công",
        message:
          "Kiểm tra lại ký hiệu và số công. Ký hiệu Tr (Trực VP) hiện chưa dùng được.",
      });
    }
  }

  async function handleRecompute() {
    try {
      const result = await recompute.mutateAsync({
        fromDate: `${year}-${String(month).padStart(2, "0")}-01`,
        toDate: lastDayOfMonth(year, month),
      });
      notifications.show({
        color: "green",
        title: `Đã tính lại ${result.processed} ngày công`,
        message:
          result.skippedLocked + result.skippedAdjusted > 0
            ? `Giữ nguyên ${result.skippedLocked} ngày đã chốt và ${result.skippedAdjusted} ngày đã sửa tay.`
            : "Không có ngày nào bị bỏ qua.",
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Không tính lại được",
        message: "Vui lòng thử lại sau.",
      });
    }
  }

  const rows = gridQuery.data?.rows ?? [];

  return (
    <>
      <PageHeader
        title="Bảng chấm công tháng"
        subtitle="Lưới BCC theo đúng bố cục file Excel: hàng = nhân viên, cột = ngày. Bấm vào ô để sửa tay (bắt buộc nêu lý do)."
        actions={
          canEdit ? (
            <Button
              variant="default"
              leftSection={<IconRefresh size={18} />}
              loading={recompute.isPending}
              onClick={() => void handleRecompute()}
            >
              Tính lại tháng này
            </Button>
          ) : null
        }
      />

      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
          Tính lại <b>không ghi đè</b> ngày đã chốt kỳ hoặc ngày HR đã sửa tay.
          Dữ liệu gốc từ máy chấm công không bao giờ bị thay đổi — bảng này là
          bảng dẫn xuất, tính sai thì chạy lại là sạch.
        </Alert>

        <Group>
          <Select
            label="Tháng"
            w={140}
            data={monthOptions}
            value={String(month)}
            onChange={(value) => setMonth(Number(value ?? 1))}
          />
          <Select
            label="Năm"
            w={120}
            data={yearOptions}
            value={String(year)}
            onChange={(value) => setYear(Number(value ?? now.getFullYear()))}
          />
          <Select
            label="Phòng ban"
            w={260}
            placeholder="Tất cả phòng ban"
            clearable
            searchable
            data={departmentOptions}
            value={departmentId}
            onChange={setDepartmentId}
          />
        </Group>

        {gridQuery.isLoading ? (
          <Text c="dimmed">Đang tải bảng công…</Text>
        ) : rows.length === 0 ? (
          <Alert color="gray" variant="light" title="Chưa có dữ liệu bảng công">
            Tháng này chưa có ngày công nào được tính. Bấm{" "}
            <b>Tính lại tháng này</b> sau khi đã đồng bộ dữ liệu chấm công.
          </Alert>
        ) : (
          <ScrollArea type="auto">
            <Table striped highlightOnHover withTableBorder stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ minWidth: 200 }}>Nhân viên</Table.Th>
                  {dayColumns.map((day) => (
                    <Table.Th key={day} style={{ minWidth: 44, textAlign: "center" }}>
                      {day}
                    </Table.Th>
                  ))}
                  <Table.Th style={{ minWidth: 90, textAlign: "center" }}>
                    Tổng công
                  </Table.Th>
                  <Table.Th style={{ minWidth: 80, textAlign: "center" }}>
                    Nghỉ phép
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => {
                  const byDay = new Map(row.days.map((day) => [day.day, day]));
                  return (
                    <Table.Tr key={row.employeeId}>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {row.fullName}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {row.employeeCode}
                          {row.departmentName ? ` · ${row.departmentName}` : ""}
                        </Text>
                      </Table.Td>
                      {dayColumns.map((dayNumber) => {
                        const day = byDay.get(dayNumber);
                        if (!day) {
                          return (
                            <Table.Td key={dayNumber} style={{ textAlign: "center" }}>
                              <Text c="dimmed" size="xs">
                                ·
                              </Text>
                            </Table.Td>
                          );
                        }
                        const label = day.displaySymbol || "";
                        const tooltip = [
                          day.holidayName,
                          day.firstPunch || day.lastPunch
                            ? `Check-in: ${day.firstPunch ?? "—"}, Check-out: ${day.lastPunch ?? "—"}`
                            : null,
                          label ? `Ký hiệu: ${label}` : null,
                          day.lateMinutes > 0 ? `Muộn ${day.lateMinutes}'` : null,
                          day.earlyLeaveMinutes > 0
                            ? `Về sớm ${day.earlyLeaveMinutes}'`
                            : null,
                          day.needsExplanation ? "Chờ giải trình" : null,
                          day.hasAdjustment ? "HR đã sửa tay" : null,
                          day.isLocked ? "Đã chốt kỳ" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ");

                        return (
                          <Table.Td
                            key={dayNumber}
                            className={getTimesheetCellClass(day)}
                            style={{
                              textAlign: "center",
                              cursor: canEdit && !day.isLocked ? "pointer" : "default",
                            }}
                            onClick={() => openCell(row, day)}
                          >
                            <Tooltip label={tooltip || "Không có dữ liệu"} disabled={!tooltip}>
                              <div>
                                {label ? (
                                  <Badge
                                    size="sm"
                                    variant={day.hasAdjustment ? "filled" : "light"}
                                    color={symbolColor(label)}
                                  >
                                    {label}
                                  </Badge>
                                ) : day.needsExplanation ? (
                                  <Badge size="sm" variant="outline" color="red">
                                    ?
                                  </Badge>
                                ) : (
                                  <Text c="dimmed" size="xs">
                                    ·
                                  </Text>
                                )}
                              </div>
                            </Tooltip>
                          </Table.Td>
                        );
                      })}
                      <Table.Td style={{ textAlign: "center" }}>
                        <Text fw={600}>{row.summary.totalPaidDays}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "center" }}>
                        {row.summary.totalLeaveDays || "-"}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Stack>

      <Modal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing
            ? `Sửa ô: ${editing.row.fullName} — ngày ${editing.day.date}`
            : "Sửa ô chấm công"
        }
        centered
      >
        <Stack gap="sm">
          {editing?.day.firstPunch || editing?.day.lastPunch ? (
            <Text size="sm" c="dimmed">
              Máy chấm công ghi nhận: {editing.day.firstPunch ?? "—"} →{" "}
              {editing.day.lastPunch ?? "—"}
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              Máy chấm công không có dữ liệu cho ngày này.
            </Text>
          )}

          <Select
            label="Ký hiệu"
            placeholder="Để trống = xóa ký hiệu khỏi ô"
            clearable
            searchable
            data={SYMBOL_OPTIONS.map((option) => ({
              value: option.code,
              label: `${option.code} — ${option.name}`,
            }))}
            value={editSymbol}
            onChange={(value) => {
              setEditSymbol(value);
              const option = SYMBOL_OPTIONS.find((item) => item.code === value);
              if (option) {
                setEditPortion(option.defaultPortion);
              }
            }}
          />

          <NumberInput
            label="Số công"
            description="Thứ 7 làm nửa buổi vẫn để 1 — tính cả ngày công"
            min={0}
            max={2}
            step={0.5}
            decimalScale={1}
            value={editPortion}
            onChange={(value) => setEditPortion(Number(value))}
            disabled={!editSymbol}
          />

          <Textarea
            label="Lý do sửa"
            description="Bắt buộc — sẽ được lưu để đối chiếu khi có khiếu nại"
            withAsterisk
            minRows={2}
            value={editReason}
            onChange={(event) => setEditReason(event.currentTarget.value)}
          />

          <Alert color="orange" variant="light" icon={<IconTrash size={16} />}>
            Sau khi sửa tay, ô này sẽ <b>không bị job tính lại ghi đè</b> nữa.
          </Alert>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button loading={adjustDay.isPending} onClick={() => void handleSaveCell()}>
              Lưu
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
