import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarPlus,
  IconDownload,
  IconLock,
  IconLockOpen,
  IconRefresh,
} from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import { downloadTimesheetPeriodExport } from "../../features/attendance/timesheetApi";
import {
  useCloseTimesheetPeriod,
  useOpenTimesheetPeriod,
  useReopenTimesheetPeriod,
  useTimesheetConfirmations,
  useTimesheetPeriods,
} from "../../features/attendance/useTimesheet";
import type {
  TimesheetConfirmationStatus,
  TimesheetPeriod,
  TimesheetPeriodStatus,
} from "../../features/attendance/timesheetTypes";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { PageHeader } from "../../shared/components/PageHeader";
import { formatDate } from "../../shared/utils/date";
import { HrmDateInput } from "../../shared/components/HrmDateInput";

const now = new Date();
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Tháng ${index + 1}`,
}));
const yearOptions = Array.from({ length: 6 }, (_, index) => {
  const year = now.getFullYear() - 2 + index;
  return { value: String(year), label: String(year) };
});

const periodStatusLabel: Record<TimesheetPeriodStatus, string> = {
  DRAFT: "Nháp",
  PENDING_EMPLOYEE: "Chờ nhân viên",
  PENDING_HR: "Chờ HR",
  CLOSED: "Đã chốt",
};

const periodStatusColor: Record<TimesheetPeriodStatus, string> = {
  DRAFT: "gray",
  PENDING_EMPLOYEE: "hacomRed",
  PENDING_HR: "orange",
  CLOSED: "green",
};

const confirmationStatusLabel: Record<TimesheetConfirmationStatus, string> = {
  PENDING: "Chưa xác nhận",
  CONFIRMED: "Đã xác nhận",
  DISPUTED: "Khiếu nại",
};

const confirmationStatusColor: Record<TimesheetConfirmationStatus, string> = {
  PENDING: "gray",
  CONFIRMED: "green",
  DISPUTED: "orange",
};

function toDateOnly(value: string | null | undefined) {
  return formatDate(value);
}

function confirmationCounts(
  confirmations: { status: TimesheetConfirmationStatus }[],
) {
  return confirmations.reduce(
    (acc, confirmation) => {
      acc[confirmation.status] += 1;
      return acc;
    },
    { PENDING: 0, CONFIRMED: 0, DISPUTED: 0 },
  );
}

export function TimesheetPeriodsPage() {
  const { can } = useAuth();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);
  const canExport = can(HR_PERMISSIONS.ATTENDANCE_EXPORT);

  const [year, setYear] = useState(now.getFullYear());
  const [openModal, setOpenModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimesheetPeriod | null>(null);
  const [closeTarget, setCloseTarget] = useState<TimesheetPeriod | null>(null);
  const [reopenTarget, setReopenTarget] = useState<TimesheetPeriod | null>(null);
  const [newMonth, setNewMonth] = useState(now.getMonth() + 1);
  const [newYear, setNewYear] = useState(now.getFullYear());
  const [newUnitId, setNewUnitId] = useState<string | null>(null);
  const [confirmDeadline, setConfirmDeadline] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [exportingPeriodId, setExportingPeriodId] = useState<string | null>(null);

  const periodsQuery = useTimesheetPeriods(year);
  const confirmationsQuery = useTimesheetConfirmations(selectedPeriod?.id ?? closeTarget?.id ?? null);
  const unitsQuery = useUnitsSelect();
  const openPeriod = useOpenTimesheetPeriod();
  const closePeriod = useCloseTimesheetPeriod();
  const reopenPeriod = useReopenTimesheetPeriod();

  const unitOptions = useMemo(
    () =>
      (unitsQuery.data ?? []).map((unit) => ({
        value: unit.id,
        label: unit.name,
      })),
    [unitsQuery.data],
  );

  async function handleOpenPeriod() {
    try {
      await openPeriod.mutateAsync({
        month: newMonth,
        year: newYear,
        unitId: newUnitId ?? undefined,
        confirmDeadline: confirmDeadline || undefined,
      });
      notifications.show({
        color: "green",
        title: "Đã mở kỳ công",
        message: "Nhân viên trong phạm vi kỳ này đã có dòng xác nhận.",
      });
      setOpenModal(false);
      setYear(newYear);
    } catch {
      notifications.show({
        color: "red",
        title: "Không mở được kỳ công",
        message: "Kỳ có thể đã được mở hoặc phạm vi không có nhân viên.",
      });
    }
  }

  async function handleClosePeriod(period: TimesheetPeriod) {
    try {
      await closePeriod.mutateAsync(period.id);
      notifications.show({
        color: "green",
        title: "Đã chốt kỳ công",
        message: "Toàn bộ ngày công trong kỳ đã bị khóa.",
      });
      return true;
    } catch {
      notifications.show({
        color: "red",
        title: "Không chốt được kỳ công",
        message: "Kiểm tra lại trạng thái kỳ trước khi chốt.",
      });
      return false;
    }
  }

  async function handleReopenPeriod() {
    if (!reopenTarget) {
      return;
    }
    if (reopenReason.trim().length < 5) {
      notifications.show({
        color: "red",
        title: "Thiếu lý do mở khóa",
        message: "Mở khóa kỳ công bắt buộc ghi lý do tối thiểu 5 ký tự.",
      });
      return;
    }
    try {
      await reopenPeriod.mutateAsync({
        id: reopenTarget.id,
        payload: { reason: reopenReason.trim() },
      });
      notifications.show({
        color: "green",
        title: "Đã mở khóa kỳ công",
        message: "Các ô bảng công trong kỳ đã có thể sửa lại.",
      });
      setReopenTarget(null);
      setReopenReason("");
    } catch {
      notifications.show({
        color: "red",
        title: "Không mở khóa được kỳ công",
        message: "Chỉ kỳ đã chốt mới được mở khóa.",
      });
    }
  }

  async function handleExportPeriod(period: TimesheetPeriod) {
    setExportingPeriodId(period.id);
    try {
      await downloadTimesheetPeriodExport(period);
    } catch {
      notifications.show({
        color: "red",
        title: "Không xuất được Excel",
        message: "Kiểm tra quyền xuất dữ liệu chấm công hoặc thử tải lại trang.",
      });
    } finally {
      setExportingPeriodId(null);
    }
  }

  const periods = periodsQuery.data ?? [];
  const confirmations = confirmationsQuery.data ?? [];
  const counts = confirmationCounts(confirmations);

  return (
    <>
      <PageHeader
        title="Quản lý kỳ công"
        subtitle="Mở kỳ để nhân viên xác nhận, theo dõi ai chưa xác nhận, chốt kỳ và mở khóa khi HR cần sửa lại."
        actions={
          canEdit ? (
            <Button
              leftSection={<IconCalendarPlus size={18} />}
              onClick={() => setOpenModal(true)}
            >
              Mở kỳ công
            </Button>
          ) : null
        }
      />

      <Stack gap="md">
        <Alert color="hacomRed" variant="light">
          Nhánh quá hạn chưa xác nhận vẫn đang chờ HR trả lời. Màn này chỉ liệt
          kê trạng thái hiện tại để HR tự xử lý, không tự chuyển trạng thái hay
          tự xác nhận thay nhân viên.
        </Alert>

        <Group>
          <Select
            label="Năm"
            w={140}
            data={yearOptions}
            value={String(year)}
            onChange={(value) => setYear(Number(value ?? now.getFullYear()))}
          />
          <Button
            variant="default"
            leftSection={<IconRefresh size={18} />}
            loading={periodsQuery.isFetching}
            onClick={() => void periodsQuery.refetch()}
          >
            Tải lại
          </Button>
        </Group>

        <ScrollArea type="auto">
          <Table striped highlightOnHover withTableBorder miw={760}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Kỳ</Table.Th>
                <Table.Th>Phạm vi</Table.Th>
                <Table.Th>Trạng thái</Table.Th>
                <Table.Th>Hạn xác nhận</Table.Th>
                <Table.Th>Số nhân viên</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Thao tác</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {periods.map((period) => (
                <Table.Tr key={period.id}>
                  <Table.Td>
                    <Text fw={600}>
                      Tháng {period.month}/{period.year}
                    </Text>
                    {period.openedAt ? (
                      <Text size="xs" c="dimmed">
                        Mở: {toDateOnly(period.openedAt)}
                      </Text>
                    ) : null}
                  </Table.Td>
                  <Table.Td>{period.unit?.name ?? "Toàn công ty"}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {period.status === "CLOSED" ? <IconLock size={15} /> : <IconLockOpen size={15} />}
                      <Badge color={periodStatusColor[period.status]} variant="light">
                        {period.status === "CLOSED" ? "Đã chốt" : periodStatusLabel[period.status]}
                      </Badge>
                    </Group>
                    {period.closedAt ? (
                      <Text size="xs" c="dimmed">
                        {period.closedBy ?? "Hệ thống"} · {toDateOnly(period.closedAt)}
                      </Text>
                    ) : null}
                  </Table.Td>
                  <Table.Td>{toDateOnly(period.confirmDeadline)}</Table.Td>
                  <Table.Td>{period._count?.confirmations ?? 0}</Table.Td>
                  <Table.Td>
                    <Group justify="flex-end" gap="xs" wrap="nowrap">
                      <Button
                        size="xs"
                        variant="default"
                        onClick={() => setSelectedPeriod(period)}
                      >
                        Xác nhận
                      </Button>
                      {canExport ? (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconDownload size={14} />}
                          loading={exportingPeriodId === period.id}
                          onClick={() => void handleExportPeriod(period)}
                        >
                          Excel
                        </Button>
                      ) : null}
                      {canEdit && period.status !== "CLOSED" ? (
                        <Button
                          size="xs"
                          color="green"
                          leftSection={<IconLock size={14} />}
                          onClick={() => setCloseTarget(period)}
                        >
                          Chốt
                        </Button>
                      ) : null}
                      {canEdit && period.status === "CLOSED" ? (
                        <Button
                          size="xs"
                          color="orange"
                          variant="light"
                          leftSection={<IconLockOpen size={14} />}
                          onClick={() => setReopenTarget(period)}
                        >
                          Mở khóa
                        </Button>
                      ) : null}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {!periodsQuery.isLoading && periods.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" py="xl">
                      Chưa có kỳ công nào trong năm này.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>

      <Modal
        opened={openModal}
        onClose={() => setOpenModal(false)}
        title="Mở kỳ công"
        centered
      >
        <Stack gap="sm">
          <Group grow>
            <Select
              label="Tháng"
              data={monthOptions}
              value={String(newMonth)}
              onChange={(value) => setNewMonth(Number(value ?? 1))}
            />
            <Select
              label="Năm"
              data={yearOptions}
              value={String(newYear)}
              onChange={(value) => setNewYear(Number(value ?? now.getFullYear()))}
            />
          </Group>
          <Select
            label="Phạm vi"
            description="Bỏ trống để mở toàn công ty; chọn đơn vị để chạy thí điểm."
            placeholder="Toàn công ty"
            clearable
            searchable
            data={unitOptions}
            value={newUnitId}
            onChange={setNewUnitId}
          />
          <HrmDateInput
            label="Hạn xác nhận"
            description="HR nhập theo lịch vận hành thực tế. Không tự suy ngày mở kỳ trong phần mềm."
            value={confirmDeadline || null}
            onChange={(value) => setConfirmDeadline(value ?? "")}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setOpenModal(false)}>
              Hủy
            </Button>
            <Button loading={openPeriod.isPending} onClick={() => void handleOpenPeriod()}>
              Mở kỳ
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={selectedPeriod !== null}
        onClose={() => setSelectedPeriod(null)}
        title={
          selectedPeriod
            ? `Xác nhận kỳ ${selectedPeriod.month}/${selectedPeriod.year}`
            : "Xác nhận kỳ công"
        }
        size="lg"
        centered
      >
        <Stack gap="md">
          <Group>
            <Badge color="gray">Chưa xác nhận: {counts.PENDING}</Badge>
            <Badge color="green">Đã xác nhận: {counts.CONFIRMED}</Badge>
            <Badge color="orange">Khiếu nại: {counts.DISPUTED}</Badge>
          </Group>
          <ScrollArea type="auto">
            <Table striped withTableBorder miw={560}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nhân viên</Table.Th>
                  <Table.Th>Trạng thái</Table.Th>
                  <Table.Th>Ghi chú</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {confirmations.map((confirmation) => (
                  <Table.Tr key={confirmation.id}>
                    <Table.Td>
                      <Text fw={600}>{confirmation.employee?.fullName ?? confirmation.employeeId}</Text>
                      <Text size="xs" c="dimmed">
                        {confirmation.employee?.employeeCode ?? "-"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={confirmationStatusColor[confirmation.status]} variant="light">
                        {confirmationStatusLabel[confirmation.status]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {confirmation.disputeNote ??
                          (confirmation.confirmedAt
                            ? `Xác nhận ${toDateOnly(confirmation.confirmedAt)}`
                            : "-")}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {!confirmationsQuery.isLoading && confirmations.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Text c="dimmed" ta="center" py="md">
                        Chưa có dòng xác nhận nào.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : null}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Stack>
      </Modal>

      <Modal
        opened={closeTarget !== null}
        onClose={() => setCloseTarget(null)}
        title={closeTarget ? `Chốt kỳ công ${closeTarget.month}/${closeTarget.year}` : "Chốt kỳ công"}
        centered
        size="lg"
      >
        <Stack gap="md">
          <Alert color="orange" variant="light" icon={<IconLock size={18} />}>
            Sau khi chốt, các ô bảng công trong kỳ sẽ bị khóa. HR chỉ nên chốt khi đã xử lý xong các dòng chờ xác nhận/khiếu nại.
          </Alert>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Card withBorder padding="sm">
              <Text size="xs" c="dimmed" fw={700}>Tổng nhân sự</Text>
              <Text size="xl" fw={800}>{closeTarget?._count?.confirmations ?? confirmations.length}</Text>
            </Card>
            <Card withBorder padding="sm">
              <Text size="xs" c="dimmed" fw={700}>Ô đã sửa tay</Text>
              <Text size="xl" fw={800}>0</Text>
              <Text size="xs" c="dimmed">Chưa có API tổng hợp trên kỳ.</Text>
            </Card>
            <Card withBorder padding="sm">
              <Text size="xs" c="dimmed" fw={700}>Chờ giải trình/khiếu nại</Text>
              <Text size="xl" fw={800} c={counts.DISPUTED > 0 ? "orange" : undefined}>{counts.DISPUTED}</Text>
            </Card>
          </SimpleGrid>
          <Group>
            <Badge color="gray">Chưa xác nhận: {counts.PENDING}</Badge>
            <Badge color="green">Đã xác nhận: {counts.CONFIRMED}</Badge>
            <Badge color="orange">Khiếu nại: {counts.DISPUTED}</Badge>
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCloseTarget(null)}>Hủy</Button>
            <Button
              color="green"
              leftSection={<IconLock size={16} />}
              loading={closePeriod.isPending}
              onClick={() => {
                if (closeTarget) {
                  void handleClosePeriod(closeTarget).then((success) => {
                    if (success) setCloseTarget(null);
                  });
                }
              }}
            >
              Xác nhận chốt kỳ
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={reopenTarget !== null}
        onClose={() => setReopenTarget(null)}
        title="Mở khóa kỳ công"
        centered
      >
        <Stack gap="sm">
          <Alert color="orange" variant="light">
            Mở khóa sẽ gỡ khóa các ô bảng công trong kỳ. HR phải ghi lý do để
            truy vết khi đối chiếu.
          </Alert>
          <Textarea
            label="Lý do mở khóa"
            withAsterisk
            minRows={3}
            value={reopenReason}
            onChange={(event) => setReopenReason(event.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setReopenTarget(null)}>
              Hủy
            </Button>
            <Button
              color="orange"
              loading={reopenPeriod.isPending}
              onClick={() => void handleReopenPeriod()}
            >
              Mở khóa
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
