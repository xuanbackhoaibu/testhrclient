import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import {
  IconCalendarCheck,
  IconCheck,
  IconInfoCircle,
  IconMessageReport,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveAttendanceExplanation,
  listPendingAttendanceExplanations,
  rejectAttendanceExplanation,
  type AttendanceExplanation,
  type AttendanceExplanationType,
} from "../../features/attendance/attendanceExplanationApi";
import { showAttendanceError } from "../../features/attendance/attendanceErrorNotification";
import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  approveLeaveRequest,
  listPendingLeaveApprovals,
  rejectLeaveRequest,
} from "../../features/leave/leaveApi";
import type { LeaveRequest } from "../../features/leave/leaveTypes";
import { DataTable, type DataTableColumn } from "../../shared/components/DataTable";
import { FilterBar } from "../../shared/components/FilterBar";
import filterStyles from "../../shared/components/FilterBar.module.css";
import { PageHeader } from "../../shared/components/PageHeader";
import { SectionCard } from "../../shared/components/SectionCard";
import { formatDate } from "../../shared/utils/date";
import { toast } from "../../shared/utils/toast";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Phép năm",
  SICK: "Ốm đau",
  UNPAID: "Nghỉ không lương",
  MARRIAGE: "Nghỉ kết hôn",
  MATERNITY: "Nghỉ thai sản",
  OTHER: "Nghỉ khác",
};

const EXPLANATION_TYPE_LABELS: Record<AttendanceExplanationType, string> = {
  MISSING_PUNCH: "Thiếu chấm công",
  LATE: "Đi muộn",
  EARLY_LEAVE: "Về sớm",
  OUT_OF_OFFICE: "Ra ngoài công việc",
  OTHER: "Khác",
};

const HALF_DAY_LABELS: Record<string, string> = {
  FULL_DAY: "Cả ngày",
  MORNING: "Buổi sáng",
  AFTERNOON: "Buổi chiều",
};

type InboxTab = "leave" | "explanation";
type ReviewAction = "approve" | "reject";
type ReviewTarget =
  | { kind: "leave"; action: ReviewAction; item: LeaveRequest }
  | {
      kind: "explanation";
      action: ReviewAction;
      item: AttendanceExplanation;
    };

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("vi");
}

function employeeName(item: LeaveRequest | AttendanceExplanation) {
  return item.employee?.fullName?.trim() || "Chưa có tên nhân sự";
}

function employeeCode(item: LeaveRequest | AttendanceExplanation) {
  return item.employee?.employeeCode?.trim() || "Chưa có MCB";
}

function leaveTypeLabel(type: string) {
  return LEAVE_TYPE_LABELS[type] ?? type;
}

function leaveSessionLabel(request: LeaveRequest) {
  const start = HALF_DAY_LABELS[request.startHalfDaySession ?? "FULL_DAY"];
  const end = HALF_DAY_LABELS[request.endHalfDaySession ?? "FULL_DAY"];
  return start === end ? start : `${start} – ${end}`;
}

function reviewErrorMessage(error: unknown) {
  const code =
    (error as { errorCode?: string })?.errorCode ??
    (error as { response?: { data?: { errorCode?: string; message?: string } } })
      ?.response?.data?.errorCode;
  if (code === "SELF_APPROVAL_DENIED") {
    return "Không thể tự duyệt giải trình của chính mình.";
  }
  if ((error as { statusCode?: number })?.statusCode === 409) {
    return "Yêu cầu đã được người khác xử lý. Danh sách sẽ được tải lại.";
  }
  return (error as { message?: string })?.message || "Không thể xử lý yêu cầu. Vui lòng tải lại và thử lại.";
}

function matchesLeave(request: LeaveRequest, search: string) {
  if (!search) return true;
  return normalizeSearch(
    [
      employeeName(request),
      employeeCode(request),
      leaveTypeLabel(request.leaveType),
      request.reason,
      request.currentApprovalStep?.stepName,
    ]
      .filter(Boolean)
      .join(" "),
  ).includes(search);
}

function matchesExplanation(item: AttendanceExplanation, search: string) {
  if (!search) return true;
  return normalizeSearch(
    [
      employeeName(item),
      employeeCode(item),
      EXPLANATION_TYPE_LABELS[item.type],
      item.reason,
      item.timesheetDay?.displaySymbol,
    ]
      .filter(Boolean)
      .join(" "),
  ).includes(search);
}

export function ApprovalInboxPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canApproveLeave = can(HR_PERMISSIONS.LEAVE_APPROVE);
  const canRejectLeave = can(HR_PERMISSIONS.LEAVE_REJECT);
  const canReviewLeave = canApproveLeave || canRejectLeave;
  const canReviewExplanation =
    can(HR_PERMISSIONS.ATTENDANCE_READ) &&
    can(HR_PERMISSIONS.ATTENDANCE_UPDATE);
  const [activeTab, setActiveTab] = useState<InboxTab>(
    canReviewLeave ? "leave" : "explanation",
  );
  const [leavePage, setLeavePage] = useState(1);
  const [leavePageSize, setLeavePageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const leaveQuery = useQuery({
    queryKey: ["approval-inbox", "leave", leavePage, leavePageSize],
    queryFn: () =>
      listPendingLeaveApprovals({ page: leavePage, pageSize: leavePageSize }),
    enabled: canReviewLeave,
  });
  const explanationQuery = useQuery({
    queryKey: ["approval-inbox", "attendance-explanations"],
    queryFn: listPendingAttendanceExplanations,
    enabled: canReviewExplanation,
  });

  const normalizedSearch = normalizeSearch(search);
  const leaveRows = useMemo(
    () =>
      (leaveQuery.data?.items ?? []).filter((item) =>
        matchesLeave(item, normalizedSearch),
      ),
    [leaveQuery.data?.items, normalizedSearch],
  );
  const explanationRows = useMemo(
    () =>
      (explanationQuery.data ?? []).filter((item) =>
        matchesExplanation(item, normalizedSearch),
      ),
    [explanationQuery.data, normalizedSearch],
  );

  const reviewMutation = useMutation({
    mutationFn: async ({ target: selected, note }: { target: ReviewTarget; note: string }) => {
      if (selected.kind === "leave") {
        return selected.action === "approve"
          ? approveLeaveRequest(selected.item.id, note)
          : rejectLeaveRequest(selected.item.id, note);
      }
      return selected.action === "approve"
        ? approveAttendanceExplanation(selected.item.id, note)
        : rejectAttendanceExplanation(selected.item.id, note);
    },
    onSuccess: async (_result, variables) => {
      const isApprove = variables.target.action === "approve";
      toast.success(isApprove ? "Đã duyệt yêu cầu." : "Đã từ chối yêu cầu.");
      if (
        variables.target.kind === "leave" &&
        leaveRows.length === 1 &&
        leavePage > 1
      ) {
        setLeavePage((page) => page - 1);
      }
      setTarget(null);
      setReviewNote("");
      await queryClient.invalidateQueries({ queryKey: ["approval-inbox"] });
    },
    onError: async (error) => {
      showAttendanceError(
        error,
        "Không xử lý được yêu cầu",
        reviewErrorMessage(error),
      );
      await queryClient.invalidateQueries({ queryKey: ["approval-inbox"] });
    },
  });

  const openReview = (nextTarget: ReviewTarget) => {
    setReviewNote("");
    setTarget(nextTarget);
  };

  const leaveColumns = useMemo<DataTableColumn<LeaveRequest>[]>(
    () => [
      {
        key: "employee",
        header: "Nhân sự",
        minWidth: 190,
        render: (request) => (
          <Stack gap={2}>
            <Text size="sm" fw={600}>{employeeName(request)}</Text>
            <Text size="xs" c="dimmed">MCB: {employeeCode(request)}</Text>
          </Stack>
        ),
      },
      {
        key: "leaveType",
        header: "Loại nghỉ",
        minWidth: 145,
        render: (request) => (
          <Stack gap={4}>
            <Text size="sm" fw={500}>{leaveTypeLabel(request.leaveType)}</Text>
            <Text size="xs" c="dimmed">{request.totalDays} ngày</Text>
          </Stack>
        ),
      },
      {
        key: "period",
        header: "Thời gian nghỉ",
        minWidth: 190,
        render: (request) => (
          <Stack gap={2}>
            <Text size="sm">{formatDate(request.startDate)} – {formatDate(request.endDate)}</Text>
            <Text size="xs" c="dimmed">{leaveSessionLabel(request)}</Text>
          </Stack>
        ),
      },
      {
        key: "reason",
        header: "Lý do / bàn giao",
        minWidth: 230,
        render: (request) => (
          <Stack gap={2}>
            <Text size="sm" lineClamp={2}>{request.reason || "Không có lý do"}</Text>
            {request.replacementEmployee ? (
              <Text size="xs" c="dimmed">
                Bàn giao: {request.replacementEmployee.fullName || "-"} · {request.replacementEmployee.employeeCode || "-"}
              </Text>
            ) : null}
          </Stack>
        ),
      },
      {
        key: "step",
        header: "Bước duyệt",
        minWidth: 150,
        render: (request) => (
          <Stack gap={4} align="flex-start">
            <Badge color="blue" variant="light" radius="sm">
              {request.currentApprovalStep
                ? `Cấp ${request.currentApprovalStep.stepOrder}`
                : "Chờ duyệt"}
            </Badge>
            <Text size="xs" c="dimmed">
              {request.currentApprovalStep?.stepName || "Bước hiện tại"}
            </Text>
            {request.lateSubmission ? (
              <Badge color="yellow" variant="light" radius="sm">Báo muộn</Badge>
            ) : null}
          </Stack>
        ),
      },
      {
        key: "actions",
        header: "Thao tác",
        minWidth: 175,
        render: (request) => (
          <Group gap="xs" wrap="nowrap">
            {canApproveLeave ? (
              <Button
                size="xs"
                leftSection={<IconCheck size={14} />}
                disabled={reviewMutation.isPending}
                onClick={() => openReview({ kind: "leave", action: "approve", item: request })}
              >
                Duyệt
              </Button>
            ) : null}
            {canRejectLeave ? (
              <Button
                size="xs"
                color="red"
                variant="light"
                leftSection={<IconX size={14} />}
                disabled={reviewMutation.isPending}
                onClick={() => openReview({ kind: "leave", action: "reject", item: request })}
              >
                Từ chối
              </Button>
            ) : null}
          </Group>
        ),
      },
    ],
    [canApproveLeave, canRejectLeave, reviewMutation.isPending],
  );

  const explanationColumns = useMemo<DataTableColumn<AttendanceExplanation>[]>(
    () => [
      {
        key: "employee",
        header: "Nhân sự",
        minWidth: 190,
        render: (item) => (
          <Stack gap={2}>
            <Text size="sm" fw={600}>{employeeName(item)}</Text>
            <Text size="xs" c="dimmed">MCB: {employeeCode(item)}</Text>
          </Stack>
        ),
      },
      {
        key: "workDate",
        header: "Ngày công",
        minWidth: 125,
        render: (item) => (
          <Stack gap={4} align="flex-start">
            <Text size="sm">{formatDate(item.timesheetDay?.workDate)}</Text>
            {item.timesheetDay?.displaySymbol ? (
              <Badge color="gray" variant="light" radius="sm">
                Ký hiệu {item.timesheetDay.displaySymbol}
              </Badge>
            ) : null}
          </Stack>
        ),
      },
      {
        key: "type",
        header: "Loại giải trình",
        minWidth: 165,
        render: (item) => (
          <Badge color="yellow" variant="light" radius="sm">
            {EXPLANATION_TYPE_LABELS[item.type]}
          </Badge>
        ),
      },
      {
        key: "reason",
        header: "Nội dung giải trình",
        minWidth: 300,
        render: (item) => <Text size="sm" lineClamp={3}>{item.reason}</Text>,
      },
      {
        key: "actions",
        header: "Thao tác",
        minWidth: 175,
        render: (item) => (
          <Group gap="xs" wrap="nowrap">
            <Button
              size="xs"
              leftSection={<IconCheck size={14} />}
              disabled={reviewMutation.isPending}
              onClick={() => openReview({ kind: "explanation", action: "approve", item })}
            >
              Duyệt
            </Button>
            <Button
              size="xs"
              color="red"
              variant="light"
              leftSection={<IconX size={14} />}
              disabled={reviewMutation.isPending}
              onClick={() => openReview({ kind: "explanation", action: "reject", item })}
            >
              Từ chối
            </Button>
          </Group>
        ),
      },
    ],
    [reviewMutation.isPending],
  );

  const refreshActive = () => {
    if (activeTab === "leave") {
      void leaveQuery.refetch();
    } else {
      void explanationQuery.refetch();
    }
  };
  const activeLoading =
    activeTab === "leave" ? leaveQuery.isFetching : explanationQuery.isFetching;

  return (
    <>
      <PageHeader
        title="Duyệt công ca phép"
        subtitle="Xử lý tập trung đơn nghỉ phép và giải trình chấm công. Kết quả được ghi trực tiếp vào nguồn dữ liệu HRM mà Chat và Bảng chấm công đang sử dụng."
        actions={(
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            loading={activeLoading}
            onClick={refreshActive}
          >
            Tải lại
          </Button>
        )}
      />

      <Stack gap="md">
        <Alert color="blue" icon={<IconInfoCircle size={18} />} title="Danh sách theo đúng phạm vi được giao">
          Đơn nghỉ chỉ xuất hiện khi bạn là người duyệt của bước hiện tại. Giải trình chấm công được giới hạn theo phạm vi nhân sự; hệ thống không cho phép tự duyệt.
        </Alert>

        <Tabs
          value={activeTab}
          onChange={(value) => {
            if (value) {
              setActiveTab(value as InboxTab);
              setSearch("");
            }
          }}
        >
          <Tabs.List>
            <Tabs.Tab
              value="leave"
              leftSection={<IconCalendarCheck size={16} />}
              disabled={!canReviewLeave}
            >
              Đơn nghỉ phép ({leaveQuery.data?.pagination.total ?? 0})
            </Tabs.Tab>
            <Tabs.Tab
              value="explanation"
              leftSection={<IconMessageReport size={16} />}
              disabled={!canReviewExplanation}
            >
              Giải trình chấm công ({explanationQuery.data?.length ?? 0})
            </Tabs.Tab>
          </Tabs.List>

          <FilterBar>
            <TextInput
              className={filterStyles.grow}
              leftSection={<IconSearch size={16} />}
              placeholder="Lọc trang hiện tại theo họ tên, MCB, loại hoặc nội dung"
              aria-label="Lọc danh sách chờ duyệt trên trang hiện tại"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
            {search ? (
              <Button variant="subtle" color="gray" onClick={() => setSearch("")}>
                Xóa lọc
              </Button>
            ) : null}
          </FilterBar>

          <Tabs.Panel value="leave" pt="md">
            <SectionCard
              title="Đơn nghỉ phép chờ duyệt"
              count={normalizedSearch ? `${leaveRows.length} kết quả trên trang` : `${leaveQuery.data?.pagination.total ?? 0} đơn`}
              description="Thứ tự và người duyệt hiện tại do Cấu hình duyệt phép xác định."
            >
              <DataTable
                data={leaveRows}
                columns={leaveColumns}
                rowKey={(item) => item.id}
                meta={leaveQuery.data?.pagination}
                loading={leaveQuery.isLoading}
                error={leaveQuery.error}
                emptyTitle={normalizedSearch ? "Không có đơn khớp bộ lọc" : "Không có đơn nghỉ chờ duyệt"}
                emptyDescription={normalizedSearch ? "Xóa bộ lọc hoặc kiểm tra trang khác." : "Các đơn được giao cho bạn sẽ xuất hiện tại đây."}
                onRetry={() => void leaveQuery.refetch()}
                onPageChange={(page, pageSize) => {
                  setLeavePage(page);
                  setLeavePageSize(pageSize);
                }}
                maxHeight="calc(100vh - 430px)"
              />
            </SectionCard>
          </Tabs.Panel>

          <Tabs.Panel value="explanation" pt="md">
            <SectionCard
              title="Giải trình chấm công chờ duyệt"
              count={normalizedSearch ? `${explanationRows.length} kết quả` : `${explanationQuery.data?.length ?? 0} giải trình`}
              description="Duyệt hoặc từ chối sau khi đối chiếu ngày công, ký hiệu và nội dung nhân sự gửi."
            >
              <DataTable
                data={explanationRows}
                columns={explanationColumns}
                rowKey={(item) => item.id}
                loading={explanationQuery.isLoading}
                error={explanationQuery.error}
                emptyTitle={normalizedSearch ? "Không có giải trình khớp bộ lọc" : "Không có giải trình chờ duyệt"}
                emptyDescription={normalizedSearch ? "Xóa bộ lọc để xem lại toàn bộ danh sách." : "Giải trình mới trong phạm vi của bạn sẽ xuất hiện tại đây."}
                onRetry={() => void explanationQuery.refetch()}
                maxHeight="calc(100vh - 430px)"
              />
            </SectionCard>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Modal
        opened={Boolean(target)}
        onClose={() => {
          if (!reviewMutation.isPending) {
            setTarget(null);
            setReviewNote("");
          }
        }}
        title={target?.action === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
        centered
        closeOnClickOutside={!reviewMutation.isPending}
        closeOnEscape={!reviewMutation.isPending}
      >
        <Stack gap="md">
          <Text size="sm">
            {target
              ? `${target.action === "approve" ? "Duyệt" : "Từ chối"} yêu cầu của ${employeeName(target.item)} (${employeeCode(target.item)})?`
              : ""}
          </Text>
          <Textarea
            label="Ghi chú xử lý"
            description="Không bắt buộc, tối đa 1.000 ký tự."
            minRows={3}
            maxLength={1000}
            value={reviewNote}
            onChange={(event) => setReviewNote(event.currentTarget.value)}
            placeholder="Nội dung trao đổi hoặc căn cứ xử lý"
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={reviewMutation.isPending}
              onClick={() => {
                setTarget(null);
                setReviewNote("");
              }}
            >
              Hủy
            </Button>
            <Button
              color={target?.action === "reject" ? "red" : "blue"}
              leftSection={target?.action === "reject" ? <IconX size={16} /> : <IconCheck size={16} />}
              loading={reviewMutation.isPending}
              onClick={() => {
                if (target) reviewMutation.mutate({ target, note: reviewNote });
              }}
            >
              {target?.action === "reject" ? "Từ chối" : "Duyệt"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
