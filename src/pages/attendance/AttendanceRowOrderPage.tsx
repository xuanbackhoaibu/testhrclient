import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Paper,
  Select,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconGripVertical, IconRestore } from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  useAttendanceRowOrder,
  useMoveAttendanceRow,
  useResetAttendanceRowOrder,
} from "../../features/attendance/useTimesheet";
import type { AttendanceRowOrderMember } from "../../features/attendance/timesheetTypes";
import { useDepartmentsSelect } from "../../features/organization/useDepartments";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { PageHeader } from "../../shared/components/PageHeader";
import { InfoBanner } from "../../shared/components/InfoBanner";
import styles from "./AttendanceRowOrderPage.module.css";

/** Chỗ sắp thả so với dòng đang rê qua. */
type DropSide = "above" | "below";

export function AttendanceRowOrderPage() {
  const { can } = useAuth();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);

  const [unitId, setUnitId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    employeeId: string;
    side: DropSide;
  } | null>(null);
  /*
   * dragover bắn liên tục khi rê chuột. Giữ chỗ thả gần nhất trong ref và chỉ
   * setState khi nó thực sự đổi, nếu không mỗi lần rê là một lần render lại
   * toàn danh sách — đây chính là chỗ hay sinh giật.
   */
  const lastDropRef = useRef<string>("");

  const unitsQuery = useUnitsSelect();
  const departmentsQuery = useDepartmentsSelect(unitId ?? undefined);
  const orderQuery = useAttendanceRowOrder(departmentId);
  const moveRow = useMoveAttendanceRow(departmentId);
  const resetOrder = useResetAttendanceRowOrder(departmentId);

  const unitOptions = useMemo(
    () =>
      (unitsQuery.data ?? []).map((unit) => ({
        value: unit.id,
        label: `${unit.code} — ${unit.name}`,
      })),
    [unitsQuery.data],
  );
  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((department) => ({
        value: department.id,
        label: department.code
          ? `${department.code} — ${department.name}`
          : department.name,
      })),
    [departmentsQuery.data],
  );

  // Giữ tham chiếu ổn định: nếu tạo mảng mới mỗi render thì useCallback bên
  // dưới hết tác dụng và mọi dòng bị gắn lại handler sau từng lần rê chuột.
  const members = useMemo(
    () => orderQuery.data?.members ?? [],
    [orderQuery.data?.members],
  );
  const sortedCount = members.filter(
    (member) => member.sortOrder !== null,
  ).length;

  const clearDragState = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
    lastDropRef.current = "";
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>, member: AttendanceRowOrderMember) => {
      if (!draggingId || draggingId === member.employeeId) return;
      event.preventDefault();
      const bounds = event.currentTarget.getBoundingClientRect();
      const side: DropSide =
        event.clientY < bounds.top + bounds.height / 2 ? "above" : "below";
      const next = `${member.employeeId}:${side}`;
      if (lastDropRef.current === next) return;
      lastDropRef.current = next;
      setDropTarget({ employeeId: member.employeeId, side });
    },
    [draggingId],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const moved = draggingId;
      const target = dropTarget;
      clearDragState();
      if (!moved || !target || moved === target.employeeId) return;

      const fromIndex = members.findIndex((m) => m.employeeId === moved);
      const overIndex = members.findIndex(
        (m) => m.employeeId === target.employeeId,
      );
      if (fromIndex === -1 || overIndex === -1) return;

      // Chỉ số đích tính trên danh sách ĐÃ bỏ người được kéo ra, nên khi kéo
      // xuống phải lùi một bậc — không thì dòng luôn rơi lệch một vị trí.
      let toIndex = target.side === "above" ? overIndex : overIndex + 1;
      if (fromIndex < toIndex) toIndex -= 1;
      if (toIndex === fromIndex) return;

      moveRow.mutate(
        { employeeId: moved, toIndex },
        {
          onError: (error) => {
            notifications.show({
              color: "red",
              title: "Không lưu được thứ tự",
              message:
                error instanceof Error && error.message
                  ? error.message
                  : "Thứ tự đã được trả về như cũ.",
            });
          },
        },
      );
    },
    [clearDragState, draggingId, dropTarget, members, moveRow],
  );

  async function handleReset() {
    try {
      await resetOrder.mutateAsync();
      notifications.show({
        color: "green",
        title: "Đã bỏ thứ tự tay",
        message: "Phòng ban quay lại sắp theo mã chấm công.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Không bỏ được thứ tự",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Thử lại sau.",
      });
    }
  }

  return (
    <Stack gap="md">
      <PageHeader
        title="Thứ tự nhân sự"
        subtitle="Sắp thứ tự hiển thị trong từng phòng ban. Bảng công tháng, Phân ca và file Excel đều theo thứ tự này."
      />

      <InfoBanner title="Thứ tự này dùng ở đâu" collapsible>
        <Text size="sm" inherit>
          Mặc định bảng công sắp theo <b>mã chấm công</b>. Kéo thả ở đây để đặt
          thứ tự riêng cho bản in gửi lãnh đạo — ví dụ trưởng phòng đứng trước.
          Thứ tự <b>dùng chung cho mọi tháng</b>, sắp một lần là xong. Nhân sự
          mới vào phòng luôn xếp cuối cho tới khi được kéo lên.
        </Text>
      </InfoBanner>

      <Paper withBorder p="md" radius="md">
        <Group align="flex-end" gap="sm" wrap="wrap">
          <Select
            label="Đơn vị"
            placeholder="Chọn đơn vị"
            data={unitOptions}
            value={unitId}
            searchable
            w={280}
            onChange={(value) => {
              setUnitId(value);
              setDepartmentId(null);
            }}
          />
          <Select
            label="Phòng ban"
            placeholder={unitId ? "Chọn phòng ban" : "Chọn đơn vị trước"}
            data={departmentOptions}
            value={departmentId}
            searchable
            w={320}
            disabled={!unitId}
            onChange={setDepartmentId}
          />
          {departmentId && sortedCount > 0 && canEdit ? (
            <Button
              variant="light"
              color="gray"
              leftSection={<IconRestore size={16} />}
              loading={resetOrder.isPending}
              onClick={() => void handleReset()}
            >
              Bỏ thứ tự tay
            </Button>
          ) : null}
        </Group>
      </Paper>

      {!departmentId ? (
        <Alert color="blue" variant="light">
          Chọn đơn vị và phòng ban để bắt đầu sắp thứ tự.
        </Alert>
      ) : null}

      {departmentId && orderQuery.isLoading ? (
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            {Array.from({ length: 6 }, (_value, index) => (
              <Skeleton key={index} h={40} />
            ))}
          </Stack>
        </Paper>
      ) : null}

      {departmentId && orderQuery.isError ? (
        <Alert color="red" variant="light" title="Không tải được danh sách">
          Kiểm tra lại phòng ban đang chọn rồi thử lại.
        </Alert>
      ) : null}

      {departmentId && orderQuery.data ? (
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <div>
                <Text size="sm" fw={700}>
                  {orderQuery.data.department.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {orderQuery.data.department.code} · {members.length} nhân sự
                  {sortedCount > 0 ? ` · ${sortedCount} đã sắp tay` : ""}
                </Text>
              </div>
              {canEdit && members.length > 1 ? (
                <Text size="xs" c="dimmed" ta="right">
                  Kéo tay cầm bên trái để đổi chỗ.
                  <br />
                  Thứ tự lưu ngay khi thả.
                </Text>
              ) : null}
            </Group>

            {members.length === 0 ? (
              <Text size="sm" c="dimmed" py="lg" ta="center">
                Phòng ban này chưa có nhân sự nào.
              </Text>
            ) : (
              <div className={styles.list}>
                {members.map((member, index) => {
                  const isDropTarget = dropTarget?.employeeId === member.employeeId;
                  return (
                    <div
                      key={member.employeeId}
                      className={styles.row}
                      data-dragging={
                        draggingId === member.employeeId ? "true" : undefined
                      }
                      data-drop={isDropTarget ? dropTarget.side : undefined}
                      data-unsorted={member.sortOrder === null ? "true" : undefined}
                      draggable={canEdit}
                      onDragStart={() => setDraggingId(member.employeeId)}
                      onDragEnd={clearDragState}
                      onDragOver={(event) => handleDragOver(event, member)}
                      onDrop={handleDrop}
                    >
                      <button
                        type="button"
                        className={styles.handle}
                        disabled={!canEdit}
                        aria-label={`Kéo để đổi chỗ ${member.fullName}`}
                        title="Kéo để đổi chỗ"
                      >
                        <IconGripVertical size={16} />
                      </button>
                      <span className={styles.position}>{index + 1}</span>
                      <span className={styles.identity}>
                        <span className={styles.name} title={member.fullName}>
                          {member.fullName}
                        </span>
                        <span className={styles.meta}>
                          <span
                            className={styles.code}
                            title="Mã chấm công (MCB)"
                          >
                            {member.attendanceCode ?? member.employeeCode}
                          </span>
                          {member.jobTitle ? (
                            <>
                              <span className={styles.metaDivider}>·</span>
                              <span
                                className={styles.jobTitle}
                                title={member.jobTitle}
                              >
                                {member.jobTitle}
                              </span>
                            </>
                          ) : null}
                        </span>
                      </span>
                      {member.sortOrder === null ? (
                        <span className={styles.badge}>Chưa sắp</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {sortedCount < members.length ? (
              <Text size="xs" c="dimmed">
                Người gắn nhãn <b>Chưa sắp</b> đang xếp theo mã chấm công như
                mặc định. Kéo họ tới vị trí mong muốn khi cần.
              </Text>
            ) : null}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
