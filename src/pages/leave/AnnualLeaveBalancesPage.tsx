import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Drawer,
  FileInput,
  Group,
  Loader,
  Modal,
  NumberInput,
  Pagination,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBook2,
  IconFileAlert,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import { useMemo, useState, type CSSProperties } from "react";

import {
  downloadAnnualLeaveExport,
  downloadAnnualLeaveImportErrors,
  downloadAnnualLeaveTemplate,
} from "../../features/annual-leave/annualLeaveApi";
import type {
  AnnualLeaveQuery,
  AnnualLeaveReconciliationStatus,
  AnnualLeaveRow,
} from "../../features/annual-leave/annualLeaveTypes";
import {
  useAdjustAnnualLeaveBalance,
  useAnnualLeaveBalances,
  useAnnualLeaveImportPreview,
  useAnnualLeaveLedger,
  useCommitAnnualLeaveImport,
} from "../../features/annual-leave/useAnnualLeave";
import { HR_PERMISSIONS, hasPermission } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import { ImportExportToolbar } from "../../features/import-export/ImportExportToolbar";
import { useDepartmentsSelect } from "../../features/organization/useDepartments";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { InfoBanner } from "../../shared/components/InfoBanner";
import { PageHeader } from "../../shared/components/PageHeader";
import { formatDate } from "../../shared/utils/date";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 9 }, (_, index) => {
  const year = currentYear + 2 - index;
  return { value: String(year), label: String(year) };
});
const pageSizeOptions = [20, 50, 100].map((value) => ({
  value: String(value),
  label: `${value}/trang`,
}));

const reconciliationOptions: Array<{
  value: AnnualLeaveReconciliationStatus;
  label: string;
}> = [
  { value: "RECONCILED", label: "Đã đối chiếu" },
  {
    value: "PENDING_HR_CSV_RECONCILIATION",
    label: "Chờ đối chiếu Excel",
  },
  { value: "MISMATCH", label: "Có chênh lệch" },
  {
    value: "BLOCKED_MISSING_HIRE_DATE",
    label: "Thiếu ngày bắt đầu làm việc",
  },
];

const fixedColumns = [
  { key: "sequence", width: 32, left: 0 },
  { key: "name", width: 160, left: 32 },
  { key: "code", width: 62, left: 192 },
  { key: "department", width: 170, left: 254 },
  { key: "hireDate", width: 136, left: 424 },
] as const;

function fixedCellStyle(
  column: (typeof fixedColumns)[number],
  header = false,
): CSSProperties {
  return {
    position: "sticky",
    left: column.left,
    width: column.width,
    minWidth: column.width,
    maxWidth: column.width,
    zIndex: header ? 5 : 2,
    background: header ? "#e6f2df" : "var(--mantine-color-body)",
    boxShadow:
      column.key === "hireDate"
        ? "2px 0 0 var(--mantine-color-gray-4)"
        : undefined,
  };
}

const headerStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 4,
  minWidth: 76,
  height: 78,
  padding: "8px 7px",
  color: "var(--mantine-color-dark-7)",
  background: "#e6f2df",
  borderColor: "var(--mantine-color-gray-4)",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.25,
  textAlign: "center",
  whiteSpace: "normal",
};

const numberCellStyle: CSSProperties = {
  minWidth: 76,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

function day(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function statusBadge(status: AnnualLeaveReconciliationStatus) {
  const spec = {
    RECONCILED: { color: "green", label: "Đã đối chiếu" },
    PENDING_HR_CSV_RECONCILIATION: {
      color: "yellow",
      label: "Chờ đối chiếu",
    },
    MISMATCH: { color: "orange", label: "Chênh lệch" },
    BLOCKED_MISSING_HIRE_DATE: {
      color: "red",
      label: "Thiếu ngày vào làm",
    },
  }[status];
  return (
    <Badge color={spec.color} variant="light" size="xs">
      {spec.label}
    </Badge>
  );
}

function transactionLabel(type: string) {
  return (
    {
      INITIAL_IMPORT: "Số dư đầu kỳ",
      MONTHLY_ACCRUAL: "Phép được hưởng",
      SENIORITY_ACCRUAL: "Phép thâm niên",
      CARRY_OVER: "Kết chuyển",
      EXPIRE: "Hết hạn",
      REQUEST_RESERVE: "Giữ chỗ theo đơn",
      REQUEST_RELEASE: "Hoàn phép",
      REQUEST_DEDUCT: "Đơn phép đã duyệt",
      MANUAL_ADJUSTMENT: "Điều chỉnh",
    }[type] ?? type
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Không thể hoàn tất thao tác. Vui lòng thử lại.";
}

export function AnnualLeaveBalancesPage() {
  const { user } = useAuth();
  const [year, setYear] = useState(currentYear);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 350);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [reconciliationStatus, setReconciliationStatus] =
    useState<AnnualLeaveReconciliationStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [importOpened, importDisclosure] = useDisclosure(false);
  const [selectedRow, setSelectedRow] = useState<AnnualLeaveRow | null>(null);

  const query: AnnualLeaveQuery = useMemo(
    () => ({
      year,
      page,
      pageSize,
      search: debouncedSearch.trim() || undefined,
      unitId: unitId ?? undefined,
      departmentId: departmentId ?? undefined,
      reconciliationStatus: reconciliationStatus ?? undefined,
    }),
    [
      year,
      page,
      pageSize,
      debouncedSearch,
      unitId,
      departmentId,
      reconciliationStatus,
    ],
  );
  const balances = useAnnualLeaveBalances(query);
  const units = useUnitsSelect();
  const departments = useDepartmentsSelect(unitId ?? undefined);

  const canImport = hasPermission(user, HR_PERMISSIONS.LEAVE_BALANCE_IMPORT);
  const canExport = hasPermission(user, HR_PERMISSIONS.LEAVE_BALANCE_EXPORT);
  const canUpdate = hasPermission(user, HR_PERMISSIONS.LEAVE_BALANCE_UPDATE);
  const unitOptions = (units.data ?? []).map((unit) => ({
    value: unit.id,
    label: `${unit.code} — ${unit.name}`,
  }));
  const departmentOptions = (departments.data ?? []).map((department) => ({
    value: department.id,
    label: `${department.code} — ${department.name}`,
  }));

  function resetFilters() {
    setSearch("");
    setUnitId(null);
    setDepartmentId(null);
    setReconciliationStatus(null);
    setPage(1);
  }

  async function handleTemplate() {
    setIsDownloadingTemplate(true);
    try {
      await downloadAnnualLeaveTemplate(year);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Không tải được file mẫu",
        message: errorMessage(error),
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadAnnualLeaveExport(query);
      notifications.show({
        color: "green",
        title: "Đã xuất bảng phép năm",
        message: "File Excel dùng đúng năm, bộ lọc và phạm vi được phân quyền.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Không xuất được Excel",
        message: errorMessage(error),
      });
    } finally {
      setIsExporting(false);
    }
  }

  const previousYear = year - 1;
  const rows = balances.data?.data ?? [];
  const pagination = balances.data?.pagination;

  return (
    <>
      <PageHeader
        compact
        title={`Bảng phép năm ${year}`}
        subtitle="Đối chiếu phép đầu kỳ, số đã nghỉ từ Bảng công tháng và số còn được sử dụng theo từng nhân sự."
        actions={
          <ImportExportToolbar
            title="Thao tác Bảng phép năm"
            onDownloadTemplate={canImport ? handleTemplate : undefined}
            onImport={canImport ? importDisclosure.open : undefined}
            onExport={canExport ? handleExport : undefined}
            canImport={canImport}
            canExport={canExport}
            isDownloadingTemplate={isDownloadingTemplate}
            isExporting={isExporting}
          />
        }
      />

      <Stack gap="sm">
        <InfoBanner title="Nguồn dữ liệu và nguyên tắc đối chiếu" collapsible>
          <Text size="sm" inherit>
            <b>MCB</b> lấy từ mã chấm công BioTime; <b>Ngày bắt đầu làm việc</b>{" "}
            lấy từ hồ sơ Nhân sự để kiểm soát thâm niên. Các cột T1–T12 chỉ cộng
            ký hiệu <b>P</b> đã chốt trên Bảng công tháng. Import chỉ cập nhật
            bốn cột nguồn: kết chuyển, được hưởng, thâm niên và phép khác; các
            cột đã nghỉ/tổng còn lại do hệ thống tính lại.
          </Text>
        </InfoBanner>

        <Paper withBorder radius="md" p="sm">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="sm">
            <Select
              label="Năm phép"
              data={yearOptions}
              value={String(year)}
              allowDeselect={false}
              onChange={(value) => {
                setYear(Number(value));
                setPage(1);
              }}
            />
            <TextInput
              label="Tìm nhân sự"
              placeholder="Họ tên, mã NS hoặc MCB"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
            />
            <Select
              label="Đơn vị"
              placeholder="Tất cả đơn vị"
              searchable
              clearable
              data={unitOptions}
              value={unitId}
              onChange={(value) => {
                setUnitId(value);
                setDepartmentId(null);
                setPage(1);
              }}
            />
            <Select
              label="Phòng ban"
              placeholder="Tất cả phòng ban"
              searchable
              clearable
              data={departmentOptions}
              value={departmentId}
              disabled={departments.isLoading}
              onChange={(value) => {
                setDepartmentId(value);
                setPage(1);
              }}
            />
            <Select
              label="Trạng thái đối chiếu"
              placeholder="Tất cả trạng thái"
              clearable
              data={reconciliationOptions}
              value={reconciliationStatus}
              onChange={(value) => {
                setReconciliationStatus(
                  value as AnnualLeaveReconciliationStatus | null,
                );
                setPage(1);
              }}
            />
          </SimpleGrid>
          <Group justify="space-between" mt="sm" gap="xs" wrap="wrap">
            <Text size="sm" c="dimmed">
              {pagination
                ? `${pagination.total} nhân sự trong phạm vi được xem`
                : "Đang nạp phạm vi nhân sự…"}
            </Text>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconRefresh size={15} />}
              onClick={resetFilters}
            >
              Đặt lại bộ lọc
            </Button>
          </Group>
        </Paper>

        {balances.isError ? (
          <Alert
            color="red"
            icon={<IconAlertTriangle size={18} />}
            title="Không tải được Bảng phép năm"
          >
            <Group justify="space-between" gap="sm" wrap="wrap">
              <Text size="sm">{errorMessage(balances.error)}</Text>
              <Button
                size="xs"
                variant="light"
                color="red"
                onClick={() => void balances.refetch()}
              >
                Thử lại
              </Button>
            </Group>
          </Alert>
        ) : null}

        <Paper withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
          <ScrollArea type="auto" scrollbarSize={12}>
            <Table
              withColumnBorders
              withRowBorders
              highlightOnHover
              style={{
                minWidth: 2_900,
                borderCollapse: "separate",
                borderSpacing: 0,
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th
                    style={{
                      ...headerStyle,
                      ...fixedCellStyle(fixedColumns[0], true),
                    }}
                  >
                    TT
                  </Table.Th>
                  <Table.Th
                    style={{
                      ...headerStyle,
                      ...fixedCellStyle(fixedColumns[1], true),
                      textAlign: "left",
                    }}
                  >
                    Họ và tên
                  </Table.Th>
                  <Table.Th
                    style={{
                      ...headerStyle,
                      ...fixedCellStyle(fixedColumns[2], true),
                    }}
                  >
                    MCB
                  </Table.Th>
                  <Table.Th
                    style={{
                      ...headerStyle,
                      ...fixedCellStyle(fixedColumns[3], true),
                      textAlign: "left",
                    }}
                  >
                    Phòng ban
                  </Table.Th>
                  <Table.Th
                    style={{
                      ...headerStyle,
                      ...fixedCellStyle(fixedColumns[4], true),
                    }}
                  >
                    Ngày bắt đầu làm việc
                  </Table.Th>
                  <Table.Th style={{ ...headerStyle, minWidth: 138 }}>
                    Số ngày phép {previousYear} kết chuyển
                  </Table.Th>
                  <Table.Th style={{ ...headerStyle, minWidth: 138 }}>
                    Số ngày phép được hưởng năm {year}
                  </Table.Th>
                  <Table.Th style={{ ...headerStyle, minWidth: 112 }}>
                    Số ngày phép thâm niên
                  </Table.Th>
                  <Table.Th style={{ ...headerStyle, minWidth: 118 }}>
                    Số ngày phép khác (Nếu có)
                  </Table.Th>
                  {Array.from({ length: 12 }, (_, index) => (
                    <Table.Th
                      key={index}
                      style={{ ...headerStyle, minWidth: 54 }}
                    >
                      T{index + 1}
                    </Table.Th>
                  ))}
                  <Table.Th style={{ ...headerStyle, minWidth: 138 }}>
                    Số ngày phép năm {previousYear} đã nghỉ
                  </Table.Th>
                  <Table.Th style={{ ...headerStyle, minWidth: 138 }}>
                    Số ngày phép đã nghỉ trong năm {year}
                  </Table.Th>
                  <Table.Th style={{ ...headerStyle, minWidth: 138 }}>
                    Số ngày phép năm {previousYear} đã sử dụng
                  </Table.Th>
                  <Table.Th style={{ ...headerStyle, minWidth: 152 }}>
                    Số ngày phép năm {previousYear} không được sử dụng
                  </Table.Th>
                  <Table.Th style={{ ...headerStyle, minWidth: 165 }}>
                    Tổng số ngày phép còn được sử dụng của năm {year}
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {balances.isLoading ? (
                  <Table.Tr>
                    <Table.Td colSpan={26} py="xl">
                      <Group justify="center">
                        <Loader size="sm" />
                        <Text size="sm" c="dimmed">
                          Đang tổng hợp phép từ hồ sơ và bảng công…
                        </Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ) : rows.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={26} py={48}>
                      <Stack align="center" gap={4}>
                        <IconBook2
                          size={28}
                          color="var(--mantine-color-gray-5)"
                        />
                        <Text fw={600}>Chưa có nhân sự phù hợp</Text>
                        <Text size="sm" c="dimmed">
                          Đổi bộ lọc hoặc kiểm tra phạm vi quyền được cấp.
                        </Text>
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  rows.map((row) => (
                    <Table.Tr key={row.employeeId}>
                      <Table.Td
                        style={{
                          ...fixedCellStyle(fixedColumns[0]),
                          textAlign: "center",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {row.sequence}
                      </Table.Td>
                      <Table.Td style={fixedCellStyle(fixedColumns[1])}>
                        <UnstyledButton
                          onClick={() => setSelectedRow(row)}
                          style={{
                            display: "block",
                            minWidth: 0,
                            textAlign: "left",
                            width: "100%",
                          }}
                          aria-label={`Mở sổ phép của ${row.fullName}`}
                        >
                          <Text size="xs" fw={600} truncate="end" td="underline">
                            {row.fullName}
                          </Text>
                          <Group gap={5} mt={3} wrap="nowrap">
                            {statusBadge(row.reconciliationStatus)}
                            {row.warnings.length ? (
                              <IconAlertTriangle
                                size={14}
                                color="var(--mantine-color-orange-7)"
                              />
                            ) : null}
                          </Group>
                        </UnstyledButton>
                      </Table.Td>
                      <Table.Td
                        style={{
                          ...fixedCellStyle(fixedColumns[2]),
                          textAlign: "center",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Text
                          size="xs"
                          fw={600}
                          c={row.attendanceCode ? undefined : "red"}
                        >
                          {row.attendanceCode ?? "Thiếu"}
                        </Text>
                      </Table.Td>
                      <Table.Td style={fixedCellStyle(fixedColumns[3])}>
                        <Text
                          size="xs"
                          truncate
                          title={row.department?.name ?? ""}
                        >
                          {row.department?.name ?? "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td
                        style={{
                          ...fixedCellStyle(fixedColumns[4]),
                          textAlign: "center",
                        }}
                      >
                        <Text size="sm" c={row.hireDate ? undefined : "red"}>
                          {row.hireDate
                            ? formatDate(row.hireDate)
                            : "Thiếu dữ liệu"}
                        </Text>
                      </Table.Td>
                      {[
                        row.carryOverDays,
                        row.accruedDays,
                        row.seniorityDays,
                        row.otherDays,
                      ].map((value, index) => (
                        <Table.Td
                          key={`source-${index}`}
                          style={numberCellStyle}
                        >
                          {day(value)}
                        </Table.Td>
                      ))}
                      {row.monthlyUsed.map((value, index) => (
                        <Table.Td
                          key={`month-${index}`}
                          style={{
                            ...numberCellStyle,
                            minWidth: 54,
                            background: value > 0 ? "#fff59d" : undefined,
                          }}
                        >
                          {value ? day(value) : "—"}
                        </Table.Td>
                      ))}
                      <Table.Td style={numberCellStyle}>
                        {day(row.previousYearUsedDays)}
                      </Table.Td>
                      <Table.Td style={numberCellStyle}>
                        {day(row.usedCurrentYearDays)}
                      </Table.Td>
                      <Table.Td style={numberCellStyle}>
                        {day(row.carryOverUsedDays)}
                      </Table.Td>
                      <Table.Td style={numberCellStyle}>
                        {day(row.carryOverExpiredDays)}
                      </Table.Td>
                      <Table.Td
                        style={{
                          ...numberCellStyle,
                          minWidth: 165,
                          fontWeight: 800,
                          color:
                            row.remainingDays < 0
                              ? "var(--mantine-color-red-7)"
                              : "var(--mantine-color-blue-8)",
                          background:
                            row.remainingDays < 0
                              ? "var(--mantine-color-red-0)"
                              : "#dbeafe",
                        }}
                      >
                        {day(row.remainingDays)}
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Group justify="space-between" p="sm" gap="sm" wrap="wrap">
            <Text size="xs" c="dimmed">
              Nhấn vào họ tên để xem sổ phép và lịch sử điều chỉnh.
            </Text>
            <Group gap="sm">
              <Select
                aria-label="Số dòng mỗi trang"
                w={120}
                data={pageSizeOptions}
                value={String(pageSize)}
                allowDeselect={false}
                onChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              />
              <Pagination
                value={page}
                total={Math.max(1, pagination?.totalPages ?? 1)}
                onChange={setPage}
                size="sm"
              />
            </Group>
          </Group>
        </Paper>
      </Stack>

      <AnnualLeaveImportModal
        opened={importOpened}
        year={year}
        onClose={importDisclosure.close}
      />
      <AnnualLeaveLedgerDrawer
        row={selectedRow}
        year={year}
        canUpdate={canUpdate}
        onClose={() => setSelectedRow(null)}
        onAdjusted={(daysDelta) =>
          setSelectedRow((current) =>
            current
              ? {
                  ...current,
                  otherDays: current.otherDays + daysDelta,
                  remainingDays: current.remainingDays + daysDelta,
                }
              : current,
          )
        }
      />
    </>
  );
}

function AnnualLeaveImportModal({
  opened,
  year,
  onClose,
}: {
  opened: boolean;
  year: number;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [allowWarnings, setAllowWarnings] = useState(false);
  const [note, setNote] = useState("");
  const preview = useAnnualLeaveImportPreview();
  const commit = useCommitAnnualLeaveImport();

  function close() {
    if (preview.isPending || commit.isPending) return;
    setFile(null);
    setAllowWarnings(false);
    setNote("");
    preview.reset();
    commit.reset();
    onClose();
  }

  async function checkFile() {
    if (!file) return;
    try {
      await preview.mutateAsync({ file, year });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Không kiểm tra được file",
        message: errorMessage(error),
      });
    }
  }

  async function commitFile() {
    if (!preview.data) return;
    try {
      const result = await commit.mutateAsync({
        batchId: preview.data.batchId,
        allowWarnings,
        note: note.trim() || undefined,
      });
      notifications.show({
        color: "green",
        title: "Đã đối chiếu Bảng phép năm",
        message: `${result.committedRows} dòng đã được ghi vào sổ phép năm ${year}.`,
      });
      close();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Không thể xác nhận import",
        message: errorMessage(error),
      });
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={`Import Bảng phép năm ${year}`}
      size="xl"
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        <Alert
          color="blue"
          variant="light"
          title="File được kiểm tra trước khi ghi dữ liệu"
        >
          <Text size="sm">
            Dùng file mẫu của đúng năm. MCB và Ngày bắt đầu làm việc phải khớp
            hồ sơ Nhân sự; T1–T12 được đối chiếu với Bảng công tháng và không
            ghi đè từ Excel.
          </Text>
        </Alert>
        <Group align="flex-end" wrap="wrap">
          <FileInput
            flex={1}
            label="File Excel"
            placeholder="Chọn file .xlsx, tối đa 10 MB"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            value={file}
            clearable
            onChange={(value) => {
              setFile(value);
              preview.reset();
              commit.reset();
            }}
          />
          <Button
            loading={preview.isPending}
            disabled={!file}
            onClick={() => void checkFile()}
          >
            Kiểm tra file
          </Button>
        </Group>

        {preview.data ? (
          <>
            <Group gap="xs" wrap="wrap">
              <Badge variant="light" color="gray">
                {preview.data.totalRows} dòng
              </Badge>
              <Badge variant="light" color="green">
                {preview.data.validRows} hợp lệ
              </Badge>
              <Badge variant="light" color="yellow">
                {preview.data.warningRows} cảnh báo
              </Badge>
              <Badge variant="light" color="red">
                {preview.data.failedRows} lỗi
              </Badge>
            </Group>
            {preview.data.alreadyProcessed ? (
              <Alert
                color="blue"
                variant="light"
                title={
                  preview.data.status === "COMMITTED"
                    ? "File này đã được import"
                    : "Đã dùng lại kết quả kiểm tra file"
                }
              >
                <Text size="sm">
                  Hệ thống nhận diện đúng file, năm phép và người thao tác nên
                  không tạo batch trùng hoặc ghi sổ phép lần thứ hai.
                </Text>
              </Alert>
            ) : null}
            {preview.data.failedRows > 0 ? (
              <Alert
                color="red"
                icon={<IconFileAlert size={18} />}
                title="Cần sửa file trước khi import"
              >
                <Group justify="space-between" gap="sm" wrap="wrap">
                  <Text size="sm">
                    Tải file lỗi, sửa các dòng màu đỏ rồi kiểm tra lại.
                  </Text>
                  <Button
                    variant="light"
                    color="red"
                    size="xs"
                    leftSection={<IconFileAlert size={15} />}
                    onClick={() =>
                      void downloadAnnualLeaveImportErrors(
                        preview.data!.batchId,
                        year,
                      )
                    }
                  >
                    Tải file lỗi
                  </Button>
                </Group>
              </Alert>
            ) : null}
            {preview.data.rows.some((row) => row.status !== "VALID") ? (
              <ScrollArea h={230} type="auto">
                <Table withTableBorder withColumnBorders striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Dòng</Table.Th>
                      <Table.Th>MCB</Table.Th>
                      <Table.Th>Họ và tên</Table.Th>
                      <Table.Th>Kết quả kiểm tra</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {preview.data.rows
                      .filter((row) => row.status !== "VALID")
                      .map((row) => (
                        <Table.Tr key={row.rowNumber}>
                          <Table.Td>{row.rowNumber}</Table.Td>
                          <Table.Td>
                            {row.rawData.attendanceCode ?? "—"}
                          </Table.Td>
                          <Table.Td>{row.rawData.fullName ?? "—"}</Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              {[...row.errors, ...row.warnings].map(
                                (issue, index) => (
                                  <Text
                                    key={`${issue.code}-${index}`}
                                    size="xs"
                                    c={
                                      row.errors.includes(issue)
                                        ? "red"
                                        : "orange"
                                    }
                                  >
                                    <b>{issue.field}:</b> {issue.message}
                                  </Text>
                                ),
                              )}
                            </Stack>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            ) : null}
            {preview.data.warningRows > 0 ? (
              <Checkbox
                checked={allowWarnings}
                onChange={(event) =>
                  setAllowWarnings(event.currentTarget.checked)
                }
                label="Tôi đã đọc cảnh báo và xác nhận dùng dữ liệu nguồn trong HRM cho các cột hệ thống tính."
              />
            ) : null}
            <Textarea
              label="Lý do / ghi chú đối chiếu"
              description="Bắt buộc nếu file có Số ngày phép khác lớn hơn 0."
              required={preview.data.requiresNote}
              error={
                preview.data.requiresNote && !note.trim()
                  ? "File có Số ngày phép khác; cần nhập lý do trước khi xác nhận."
                  : undefined
              }
              minRows={2}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.currentTarget.value)}
            />
          </>
        ) : null}

        <Group justify="flex-end">
          <Button variant="default" onClick={close}>
            Hủy
          </Button>
          <Button
            loading={commit.isPending}
            disabled={
              !preview.data ||
              !preview.data.canCommit ||
              (preview.data.warningRows > 0 && !allowWarnings) ||
              (preview.data.requiresNote && !note.trim())
            }
            onClick={() => void commitFile()}
          >
            Xác nhận import
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function AnnualLeaveLedgerDrawer({
  row,
  year,
  canUpdate,
  onClose,
  onAdjusted,
}: {
  row: AnnualLeaveRow | null;
  year: number;
  canUpdate: boolean;
  onClose: () => void;
  onAdjusted: (daysDelta: number) => void;
}) {
  const ledger = useAnnualLeaveLedger(row?.employeeId ?? null, year);
  const adjustment = useAdjustAnnualLeaveBalance();
  const [daysDelta, setDaysDelta] = useState<number | string>(0.5);
  const [note, setNote] = useState("");

  async function submitAdjustment() {
    if (
      !row ||
      typeof daysDelta !== "number" ||
      daysDelta === 0 ||
      !note.trim()
    )
      return;
    try {
      await adjustment.mutateAsync({
        employeeId: row.employeeId,
        year,
        daysDelta,
        note: note.trim(),
      });
      onAdjusted(daysDelta);
      setDaysDelta(0.5);
      setNote("");
      notifications.show({
        color: "green",
        title: "Đã ghi điều chỉnh",
        message: "Sổ phép và tổng số ngày còn lại đã được cập nhật.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Không ghi được điều chỉnh",
        message: errorMessage(error),
      });
    }
  }

  return (
    <Drawer
      opened={Boolean(row)}
      onClose={onClose}
      title={row ? `Sổ phép — ${row.fullName}` : "Sổ phép"}
      position="right"
      size="lg"
    >
      {row ? (
        <Stack gap="md">
          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <div>
                <Text fw={800}>{row.fullName}</Text>
                <Text size="sm" c="dimmed">
                  MCB {row.attendanceCode ?? "chưa có"} ·{" "}
                  {row.department?.name ?? "Chưa có phòng ban"}
                </Text>
              </div>
              {statusBadge(row.reconciliationStatus)}
            </Group>
            <SimpleGrid cols={3} mt="md">
              <div>
                <Text size="xs" c="dimmed">
                  Được sử dụng
                </Text>
                <Text fw={800}>
                  {day(
                    row.carryOverDays +
                      row.accruedDays +
                      row.seniorityDays +
                      row.otherDays,
                  )}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Đã nghỉ {year}
                </Text>
                <Text fw={800}>{day(row.usedCurrentYearDays)}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Còn lại
                </Text>
                <Text fw={800} c={row.remainingDays < 0 ? "red" : "blue"}>
                  {day(row.remainingDays)}
                </Text>
              </div>
            </SimpleGrid>
          </Paper>

          {canUpdate ? (
            <Paper withBorder radius="md" p="md">
              <Text fw={700} mb="xs">
                Điều chỉnh có biên bản
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <NumberInput
                  label="Số ngày tăng / giảm"
                  description="Dùng số âm để giảm; bước 0,5 ngày."
                  step={0.5}
                  decimalScale={1}
                  value={daysDelta}
                  onChange={setDaysDelta}
                />
                <Textarea
                  label="Lý do điều chỉnh"
                  minRows={2}
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.currentTarget.value)}
                />
              </SimpleGrid>
              <Group justify="flex-end" mt="sm">
                <Button
                  size="sm"
                  loading={adjustment.isPending}
                  disabled={
                    typeof daysDelta !== "number" ||
                    daysDelta === 0 ||
                    !note.trim()
                  }
                  onClick={() => void submitAdjustment()}
                >
                  Ghi vào sổ phép
                </Button>
              </Group>
            </Paper>
          ) : null}

          <div>
            <Group justify="space-between" mb="xs">
              <Text fw={700}>Lịch sử phát sinh năm {year}</Text>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconRefresh size={14} />}
                onClick={() => void ledger.refetch()}
              >
                Làm mới
              </Button>
            </Group>
            {ledger.isLoading ? (
              <Group justify="center" py="xl">
                <Loader size="sm" />
              </Group>
            ) : ledger.isError ? (
              <Alert color="red">{errorMessage(ledger.error)}</Alert>
            ) : !ledger.data?.length ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                Chưa có giao dịch trong sổ phép năm này.
              </Text>
            ) : (
              <Table withTableBorder withColumnBorders striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Ngày</Table.Th>
                    <Table.Th>Nghiệp vụ</Table.Th>
                    <Table.Th ta="right">Biến động</Table.Th>
                    <Table.Th>Ghi chú</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {ledger.data.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{formatDate(item.occurredAt)}</Table.Td>
                      <Table.Td>
                        {transactionLabel(item.transactionType)}
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text
                          fw={700}
                          c={item.usableDelta < 0 ? "red" : "green"}
                        >
                          {item.usableDelta > 0 ? "+" : ""}
                          {day(item.usableDelta)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={2}>
                          {item.note ?? "—"}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </div>
        </Stack>
      ) : null}
    </Drawer>
  );
}
