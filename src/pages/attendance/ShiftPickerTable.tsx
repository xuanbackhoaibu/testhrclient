import { useCallback, useRef, useState } from "react";
import { Badge, Box, Button, ScrollArea, Table, Text } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";

import {
  directCellShiftDisabledReason,
  formatShiftHoursAndWorkday,
} from "../../features/attendance/shiftAssignmentEligibility";
import type { WorkShift } from "../../features/attendance/workScheduleTypes";

interface ShiftPickerTableProps {
  shifts: WorkShift[];
  displayNumbers: Map<string, number>;
  currentShiftId: string | null;
  applyingShiftId: string | null;
  mutationPending: boolean;
  reorderEnabled: boolean;
  onApply: (shift: WorkShift) => void;
  onReorder: (fromCode: string, targetCode: string, edge: "top" | "bottom") => void;
}

/**
 * Bảng chọn ca trong popover của một ô ngày.
 *
 * Tách khỏi MonthlyShiftAssignmentGrid vì lý do hiệu năng, không phải để gọn
 * file: lưới phân ca render hàng trăm ô ngày, mỗi ô một Popover. Khi state của
 * thao tác kéo (vạch chỉ báo vị trí thả) còn nằm ở component lưới, mỗi lần
 * chuột đi qua một mép dòng là cả lưới render lại và thao tác kéo giật rõ rệt.
 * Giữ state đó ở đây thì chỉ riêng bảng này vẽ lại.
 *
 * Không bọc memo: bảng chỉ mount khi popover của một ô đang mở, và component
 * cha truyền vào handler tạo mới mỗi render nên memo sẽ luôn trượt. Thứ chặn
 * lag là hướng ngược lại — state kéo không còn chạm tới lưới.
 */
export function ShiftPickerTable({
  shifts,
  displayNumbers,
  currentShiftId,
  applyingShiftId,
  mutationPending,
  reorderEnabled,
  onApply,
  onReorder,
}: ShiftPickerTableProps) {
  /*
   * Mã ca đang kéo nằm ở ref chứ không ở state: handler dragover chạy liên tục
   * theo chuột, chỉ vạch đích mới cần vẽ lại.
   */
  const draggingCodeRef = useRef<string | null>(null);
  const [draggingCode, setDraggingCode] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    code: string;
    edge: "top" | "bottom";
  } | null>(null);

  const endDrag = useCallback(() => {
    draggingCodeRef.current = null;
    setDraggingCode(null);
    setDropTarget(null);
  }, []);

  return (
    <ScrollArea.Autosize mah={280} type="auto">
      <Table
        withTableBorder
        withColumnBorders
        horizontalSpacing="xs"
        verticalSpacing={4}
        style={{ minWidth: 620 }}
        onDragLeave={(event) => {
          // Chỉ xoá vạch khi chuột rời hẳn bảng, không phải khi đi qua ranh
          // giới giữa hai dòng bên trong.
          if (event.currentTarget.contains(event.relatedTarget as Node | null))
            return;
          setDropTarget(null);
        }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th p={0} w={24} />
            <Table.Th>TT</Table.Th>
            <Table.Th>Ký hiệu</Table.Th>
            <Table.Th>Loại ca</Table.Th>
            <Table.Th>Nhóm</Table.Th>
            <Table.Th>Giờ / Công</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {shifts.map((shift) => {
            const disabledReason = directCellShiftDisabledReason(shift);
            const isCurrentShift = currentShiftId === shift.id;
            const disabled =
              Boolean(disabledReason) || mutationPending || isCurrentShift;
            const isDragging = draggingCode === shift.code;
            const dropEdge =
              dropTarget?.code === shift.code ? dropTarget.edge : null;
            return (
              <Table.Tr
                key={shift.id}
                onDragOver={(event) => {
                  if (!reorderEnabled || !draggingCodeRef.current) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (draggingCodeRef.current === shift.code) {
                    setDropTarget((current) => (current ? null : current));
                    return;
                  }
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const edge =
                    event.clientY - bounds.top > bounds.height / 2
                      ? "bottom"
                      : "top";
                  // Chỉ setState khi thật sự sang mép khác, tránh vẽ lại theo
                  // từng pixel chuột di chuyển trong cùng một nửa dòng.
                  setDropTarget((current) =>
                    current?.code === shift.code && current.edge === edge
                      ? current
                      : { code: shift.code, edge },
                  );
                }}
                onDrop={(event) => {
                  const fromCode = draggingCodeRef.current;
                  if (!reorderEnabled || !fromCode) return;
                  event.preventDefault();
                  onReorder(fromCode, shift.code, dropEdge ?? "top");
                  endDrag();
                }}
                style={{
                  background: isCurrentShift ? "#eff6ff" : undefined,
                  opacity: isDragging ? 0.4 : undefined,
                  boxShadow:
                    dropEdge === "top"
                      ? "inset 0 2px 0 0 var(--mantine-color-blue-6)"
                      : dropEdge === "bottom"
                        ? "inset 0 -2px 0 0 var(--mantine-color-blue-6)"
                        : undefined,
                }}
              >
                <Table.Td
                  p={0}
                  style={{
                    width: 24,
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  {reorderEnabled ? (
                    <Box
                      component="span"
                      draggable
                      onDragStart={(event) => {
                        draggingCodeRef.current = shift.code;
                        setDraggingCode(shift.code);
                        event.dataTransfer.effectAllowed = "move";
                        // Firefox không khởi động kéo nếu dataTransfer rỗng.
                        event.dataTransfer.setData("text/plain", shift.code);
                      }}
                      onDragEnd={endDrag}
                      aria-label={`Kéo để đổi thứ tự ca ${shift.code}`}
                      style={{
                        display: "inline-flex",
                        cursor: isDragging ? "grabbing" : "grab",
                        color: "var(--mantine-color-gray-5)",
                      }}
                    >
                      <IconGripVertical size={14} />
                    </Box>
                  ) : null}
                </Table.Td>
                <Table.Td>{displayNumbers.get(shift.id) ?? "—"}</Table.Td>
                <Table.Td>
                  <Button
                    size="compact-xs"
                    variant={isCurrentShift ? "light" : "subtle"}
                    color={isCurrentShift ? "blue" : undefined}
                    loading={applyingShiftId === shift.id}
                    disabled={disabled}
                    onClick={() => onApply(shift)}
                  >
                    {shift.code}
                  </Button>
                  {isCurrentShift ? (
                    <Badge size="xs" color="blue" variant="light">
                      Đang áp dụng
                    </Badge>
                  ) : null}
                  {disabledReason ? (
                    <Text size="10px" c="dimmed" lineClamp={1}>
                      {disabledReason}
                    </Text>
                  ) : null}
                </Table.Td>
                <Table.Td>
                  <Text size="xs" lineClamp={1}>
                    {shift.name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" lineClamp={1}>
                    {shift.groupName ?? "—"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">
                    {shift.startTime}–{shift.endTime}
                  </Text>
                  <Text size="10px" c="dimmed">
                    {formatShiftHoursAndWorkday(shift)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
}
