/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Popover,
  Select,
  SegmentedControl,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconEye,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/useAuth";
import {
  createBusinessGrant,
  getCorporation,
  listBusinessDepartments,
  listBusinessUnits,
  listMatrix,
  type BusinessAction,
  type BusinessPermission,
  type DepartmentOption,
  type MatrixRow,
  type UnitOption,
} from "../../features/work-report-authorizations/canonicalWorkReportAuthorizationsApi";
import { unitScopeLabel } from "../../features/work-report-authorizations/scopeSelectionPolicy";
import {
  workReportAuthorizationToEmployeePermissionViewModel,
  type PermissionPresentation,
} from "../../features/work-report-authorizations/workReportAuthorizationViewModel";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { PageHeader } from "../../shared/components/PageHeader";
import { includesNormalizedSearch } from "../../shared/utils/normalizeSearchText";
import { NormalizedSearchInput } from "../../shared/components/NormalizedSearchInput";
import { sortByCode } from "../../shared/utils/sort";
import { useImeSafeSelectFilter } from "../../shared/hooks/useImeSafeSelectFilter";
const MANAGE = "admin.work_report_authorization.manage";
type Kind = "department" | "unit";
type Draft = (DepartmentOption | UnitOption) & { actions: BusinessAction[] };
export function WorkReportAuthorizationsPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [editor, setEditor] = useState<{ row: MatrixRow; kind: Kind } | null>(
    null,
  );
  const [detail, setDetail] = useState<MatrixRow | null>(null);
  const [corp, setCorp] = useState<MatrixRow | null>(null);
  const page = Math.max(1, Number(sp.get("page") ?? 1)),
    search = sp.get("search") ?? "",
    unitId = sp.get("unitId");
  const setQ = (x: Record<string, string | null>) =>
    setSp((c) => {
      const n = new URLSearchParams(c);
      Object.entries(x).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
      return n;
    });
  const matrix = useQuery({
    queryKey: ["work-report-matrix", page, search, unitId],
    queryFn: () =>
      listMatrix({
        page,
        pageSize: 20,
        search: search || undefined,
        unitId: unitId ?? undefined,
      }),
  });
  const ids = useMemo(() => {
    const p = matrix.data?.items.flatMap((x) => x.permissions) ?? [];
    return {
      d: p.filter((x) => x.type === "DEPARTMENT_REPORT").map((x) => x.scopeId),
      u: p.filter((x) => x.type === "UNIT_REPORT").map((x) => x.scopeId),
    };
  }, [matrix.data]);
  const ds = useQuery({
    queryKey: ["work-report-options", "departments", "matrix", ids.d],
    queryFn: () =>
      listBusinessDepartments({ ids: ids.d.join(","), pageSize: 100 }),
    enabled: ids.d.length > 0,
  });
  const us = useQuery({
    queryKey: ["work-report-options", "units", "matrix", ids.u],
    queryFn: () => listBusinessUnits({ ids: ids.u.join(","), pageSize: 100 }),
    enabled: ids.u.length > 0,
  });
  const units = useQuery({
    queryKey: ["work-report-options", "units", "filter"],
    queryFn: () => listBusinessUnits({ pageSize: 100 }),
  });
  const corporation = useQuery({
    queryKey: ["work-report-options", "corporation"],
    queryFn: getCorporation,
    enabled: !!corp,
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["work-report-matrix"] });
    void qc.invalidateQueries({ queryKey: ["work-report-options"] });
  };
  const corpSave = useMutation({
    mutationFn: (r: MatrixRow) => {
      const old = r.permissions.filter((x) => x.type === "CORPORATE_REPORT"),
        on = old.some((x) => x.actions.includes("AGGREGATE"));
      if (!corporation.data) throw Error("Chưa tải được phạm vi Tổng công ty.");
      return createBusinessGrant({
        employeeId: r.employeeId,
        permissions: on
          ? []
          : [
              {
                type: "CORPORATE_REPORT",
                scopeId: corporation.data.scopeId,
                actions: ["AGGREGATE"],
              },
            ],
        removedPermissions: on ? old : [],
      });
    },
    onSuccess: () => {
      setCorp(null);
      refresh();
    },
    onError: (e) =>
      notifications.show({
        color: "red",
        message: e instanceof Error ? e.message : "Không thể cập nhật quyền.",
      }),
  });
  const views = useMemo(
    () =>
      new Map(
        (matrix.data?.items ?? []).map((r) => [
          r.employeeId,
          workReportAuthorizationToEmployeePermissionViewModel(
            r,
            ds.data?.items,
            us.data?.items,
          ),
        ]),
      ),
    [matrix.data, ds.data, us.data],
  );
  const cols: DataTableColumn<MatrixRow>[] = [
    {
      key: "employee",
      header: "Nhân sự",
      minWidth: 240,
      render: (r) => (
        <UnstyledButton onClick={() => setDetail(r)}>
          <Stack gap={2} align="flex-start">
            <Text fw={600} size="sm">
              {r.fullName}
            </Text>
            <Text size="xs" c="dimmed">
              {r.employeeCode} · {r.email ?? "Chưa có email"}
            </Text>
          </Stack>
        </UnstyledButton>
      ),
    },
    {
      key: "org",
      header: "Đơn vị / phòng ban hiện tại",
      minWidth: 240,
      render: (r) => (
        <>
          <Text size="sm">{r.unitName ?? "Chưa xác định"}</Text>
          <Text size="xs" c="dimmed">
            {r.departmentName ?? "Chưa xác định"}
          </Text>
        </>
      ),
    },
    {
      key: "department",
      header: "Quyền cấp phòng",
      minWidth: 210,
      render: (r) => (
        <Compact
          scopes={views.get(r.employeeId)?.departmentPermissions ?? []}
          enabled={can(MANAGE)}
          label="Thêm quyền xem báo cáo theo phòng ban"
          onOpen={() => setEditor({ row: r, kind: "department" })}
        />
      ),
    },
    {
      key: "unit",
      header: "Quyền cấp đơn vị",
      minWidth: 210,
      render: (r) => (
        <Compact
          scopes={views.get(r.employeeId)?.unitPermissions ?? []}
          enabled={can(MANAGE)}
          label="Thêm quyền xem báo cáo theo đơn vị"
          onOpen={() => setEditor({ row: r, kind: "unit" })}
        />
      ),
    },
    {
      key: "corporation",
      header: "Quyền Tổng công ty",
      align: "center",
      minWidth: 160,
      render: (r) => {
        const on = !!views
          .get(r.employeeId)
          ?.corporationPermission?.actions.includes("AGGREGATE");
        return (
          <Tooltip
            label={
              on
                ? "Có quyền xem báo cáo toàn Tổng công ty"
                : "Chưa có quyền toàn Tổng công ty"
            }
          >
            <Switch
              aria-label="Quyền Tổng công ty"
              checked={on}
              disabled={!can(MANAGE) || corpSave.isPending}
              onChange={() => setCorp(r)}
            />
          </Tooltip>
        );
      },
    },
    {
      key: "updated",
      header: "Cập nhật",
      minWidth: 120,
      render: (r) => (
        <Text size="xs">
          {r.updatedAt
            ? new Intl.DateTimeFormat("vi-VN", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(r.updatedAt))
            : "—"}
        </Text>
      ),
    },
    {
      key: "view",
      header: "",
      minWidth: 48,
      render: (r) => (
        <ActionIcon
          aria-label={`Xem chi tiết ${r.fullName}`}
          variant="subtle"
          onClick={() => setDetail(r)}
        >
          <IconEye size={16} />
        </ActionIcon>
      ),
    },
  ];
  return (
    <Stack gap="lg">
      <PageHeader
        title="Phân quyền báo cáo công việc"
        subtitle="Quản lý quyền theo phòng ban, đơn vị và Tổng công ty."
        actions={
          <ActionIcon aria-label="Làm mới" variant="default" onClick={refresh}>
            <IconRefresh size={16} />
          </ActionIcon>
        }
      />
      <Group align="end">
        <NormalizedSearchInput
          label="Tìm nhân sự"
          placeholder="Tìm theo tên, mã nhân sự hoặc email"
          value={search}
          onChange={(value) => setQ({ search: value || null, page: null })}
          w={360}
        />
        <Select
          clearable
          label="Đơn vị hiện tại"
          data={sortByCode(units.data?.items, (unit) => unit.unitCode).map((u) => ({
            value: u.unitId,
            label: unitScopeLabel(u),
          }))}
          value={unitId}
          onChange={(v) => setQ({ unitId: v, page: null })}
          w={260}
        />
      </Group>
      <DataTable
        data={matrix.data?.items ?? []}
        columns={cols}
        rowKey={(r) => r.employeeId}
        loading={matrix.isLoading || ds.isLoading || us.isLoading}
        error={matrix.error}
        onRetry={() => matrix.refetch()}
        meta={
          matrix.data
            ? {
                page: matrix.data.page,
                pageSize: matrix.data.pageSize,
                total: matrix.data.total,
                totalPages: Math.max(
                  1,
                  Math.ceil(matrix.data.total / matrix.data.pageSize),
                ),
                hasNextPage: matrix.data.hasNext,
                hasPreviousPage: matrix.data.page > 1,
              }
            : undefined
        }
        onPageChange={(p) => setQ({ page: String(p) })}
        emptyTitle="Chưa có nhân sự phù hợp"
      />
      {editor && (
        <ScopeModal
          key={`${editor.kind}:${editor.row.employeeId}`}
          {...editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            refresh();
          }}
        />
      )}
      {detail && (
        <Modal
          opened
          onClose={() => setDetail(null)}
          title="Chi tiết quyền báo cáo công việc"
          size="lg"
        >
          {
            <Text>
              {detail.fullName} · {detail.employeeCode}
            </Text>
          }
        </Modal>
      )}
      {corp && (
        <Confirm
          row={corp}
          pending={corpSave.isPending}
          onClose={() => setCorp(null)}
          onConfirm={() => corpSave.mutate(corp)}
        />
      )}
    </Stack>
  );
}
function Compact({
  scopes,
  enabled,
  label,
  onOpen,
}: {
  scopes: PermissionPresentation[];
  enabled: boolean;
  label: string;
  onOpen: () => void;
}) {
  const read = scopes.filter(
    (s) => s.actions.includes("READ") && !s.actions.includes("SUBMIT"),
  );
  const submit = scopes.filter((s) => s.actions.includes("SUBMIT"));
  const scopeLabel = label.includes("phòng") ? "phòng ban" : "đơn vị";
  const summary = scopes.length
    ? `${scopes.length} ${scopeLabel} · ${read.length} Chỉ đọc · ${submit.length} Đọc và gửi`
    : `Chưa có quyền ${scopeLabel}`;
  return (
    <Group gap="xs" wrap="nowrap" justify="space-between">
      <Popover width={360} position="bottom-start" withArrow shadow="md">
        <Popover.Target>
          <UnstyledButton
            aria-label={`${summary}. Nhấn để xem chi tiết.`}
            style={{ minWidth: 0, textAlign: "left", flex: 1 }}
          >
            <Text size="sm" fw={600}>
              {scopes.length
                ? `${scopes.length} ${scopeLabel}`
                : `Chưa có quyền ${scopeLabel}`}
            </Text>
            {scopes.length ? (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {read.length} Chỉ đọc · {submit.length} Đọc và gửi
              </Text>
            ) : null}
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="sm">
            <Text fw={700} size="sm">
              Quyền cấp {scopeLabel}
            </Text>
            {submit.length ? (
              <ScopeGroup title="Đọc và gửi" scopes={submit} />
            ) : null}
            {read.length ? <ScopeGroup title="Chỉ đọc" scopes={read} /> : null}
            {!scopes.length ? (
              <Text size="sm" c="dimmed">
                Chưa có quyền được cấp.
              </Text>
            ) : null}
            {enabled && (
              <Button size="compact-sm" variant="light" onClick={onOpen}>
                Xem và chỉnh sửa quyền
              </Button>
            )}
          </Stack>
        </Popover.Dropdown>
      </Popover>
      {enabled && (
        <Tooltip label={label} withArrow>
          <ActionIcon
            size={34}
            variant="light"
            aria-label={label}
            onClick={onOpen}
          >
            <IconPlus size={17} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
function ScopeGroup({
  title,
  scopes,
}: {
  title: string;
  scopes: PermissionPresentation[];
}) {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={700}>
        {title} — {scopes.length}
      </Text>
      {scopes.map((s) => (
        <Stack key={s.scopeId} gap={0}>
          <Text size="sm">{s.name}</Text>
          <Text size="xs" c="dimmed">
            {s.code}
            {s.ownerName ? ` · ${s.ownerName}` : ""}
          </Text>
        </Stack>
      ))}
    </Stack>
  );
}
function ScopeModal({
  row,
  kind,
  onClose,
  onSaved,
}: {
  row: MatrixRow;
  kind: Kind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const selectSearch = useImeSafeSelectFilter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [unitFilter, setUnitFilter] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "ASSIGNED" | "UNASSIGNED">(
    "ALL",
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [removed, setRemoved] = useState<BusinessPermission[]>([]);
  const old = useMemo(
    () =>
      row.permissions.filter((p) =>
        kind === "department"
          ? p.type === "DEPARTMENT_REPORT"
          : p.type === "UNIT_REPORT",
      ),
    [row, kind],
  );
  const oldIds = old.map((p) => p.scopeId).join(",");
  const q = useQuery({
    queryKey: ["scope-editor", kind, unitFilter, status],
    queryFn: () =>
      (kind === "department"
        ? listBusinessDepartments({
            unitId: unitFilter ?? undefined,
            status: status === "ALL" ? undefined : status,
            pageSize: 100,
          })
        : listBusinessUnits({
            status: status === "ALL" ? undefined : status,
            pageSize: 100,
          })) as Promise<{ items: Array<DepartmentOption | UnitOption> }>,
  });
  const unitOptions = useQuery({
    queryKey: ["work-report-options", "units", "department-scope-filter"],
    queryFn: () => listBusinessUnits({ pageSize: 100 }),
    enabled: kind === "department",
  });
  const eq = useQuery({
    queryKey: ["scope-editor-existing", kind, oldIds],
    queryFn: () =>
      (kind === "department"
        ? listBusinessDepartments({ ids: oldIds, pageSize: 100 })
        : listBusinessUnits({ ids: oldIds, pageSize: 100 })) as Promise<{
        items: Array<DepartmentOption | UnitOption>;
      }>,
    enabled: !!oldIds,
  });
  useEffect(() => {
    const x = (eq.data?.items ?? []) as Array<DepartmentOption | UnitOption>;
    if (!x.length) return;
    setDrafts((c) => {
      const n = { ...c };
      old.forEach((p) => {
        const s = x.find(
          (v) =>
            (kind === "department"
              ? (v as DepartmentOption).departmentId
              : (v as UnitOption).unitId) === p.scopeId,
        );
        if (s && !n[p.scopeId]) n[p.scopeId] = { ...s, actions: p.actions };
      });
      return n;
    });
  }, [eq.data, old, kind]);
  const all = ((q.data?.items ?? []) as Array<DepartmentOption | UnitOption>)
    .filter((s) =>
      includesNormalizedSearch(
        kind === "department"
          ? `${(s as DepartmentOption).departmentName} ${(s as DepartmentOption).departmentCode} ${(s as DepartmentOption).unitName} ${(s as DepartmentOption).unitCode}`
          : `${(s as UnitOption).unitName} ${(s as UnitOption).unitCode}`,
        search,
      ),
    )
    .filter((s) => {
      const id =
        kind === "department"
          ? (s as DepartmentOption).departmentId
          : (s as UnitOption).unitId;
      return (
        filter === "ALL" || (filter === "ASSIGNED" ? !!drafts[id] : !drafts[id])
      );
    });
  const save = useMutation({
    mutationFn: () =>
      createBusinessGrant({
        employeeId: row.employeeId,
        permissions: Object.entries(drafts).map(([scopeId, s]) => ({
          type:
            kind === "department"
              ? ("DEPARTMENT_REPORT" as const)
              : ("UNIT_REPORT" as const),
          scopeId,
          actions: s.actions,
        })),
        removedPermissions: removed,
      }),
    onSuccess: onSaved,
    onError: (e) =>
      notifications.show({
        color: "red",
        message: e instanceof Error ? e.message : "Không thể lưu thay đổi.",
      }),
  });
  const add = (s: DepartmentOption | UnitOption) => {
    const id =
      kind === "department"
        ? (s as DepartmentOption).departmentId
        : (s as UnitOption).unitId;
    setDrafts((c) => ({ ...c, [id]: c[id] ?? { ...s, actions: ["READ"] } }));
    setRemoved((c) => c.filter((p) => p.scopeId !== id));
  };
  const drop = (id: string) => {
    const p = old.find((x) => x.scopeId === id);
    if (p) setRemoved((c) => (c.some((x) => x.scopeId === id) ? c : [...c, p]));
    setDrafts((c) => {
      const n = { ...c };
      delete n[id];
      return n;
    });
  };
  const changed =
    removed.length > 0 ||
    Object.entries(drafts).some(([id, s]) => {
      const p = old.find((x) => x.scopeId === id);
      return !p || p.actions.join() != s.actions.join();
    });
  return (
    <Modal
      opened
      onClose={onClose}
      title={
        <>
          <Text fw={700}>
            Cấp quyền theo {kind === "department" ? "phòng ban" : "đơn vị"}
          </Text>
          <Text size="sm" c="dimmed">
            {row.fullName} · {row.employeeCode}
            <br />
            {row.departmentName ?? "Chưa xác định"} ·{" "}
            {row.unitName ?? "Chưa xác định"}
          </Text>
        </>
      }
      size={1000}
      centered
      styles={{ body: { paddingBottom: 70 } }}
    >
      <Stack gap="sm">
        <Group align="end">
          <NormalizedSearchInput
            label="Tìm kiếm"
            placeholder={
              kind === "department"
                ? "Tìm tên hoặc mã phòng ban"
                : "Tìm tên hoặc mã đơn vị"
            }
            value={search}
            onChange={setSearch}
            style={{ flex: 1 }}
          />
          {kind === "department" && (
            <Select
              clearable
              searchable
              {...selectSearch}
              label="Đơn vị trực thuộc"
              placeholder="Tất cả đơn vị"
              data={sortByCode(unitOptions.data?.items, (unit) => unit.unitCode).map((u) => ({
                value: u.unitId,
                label: unitScopeLabel(u),
              }))}
              value={unitFilter}
              onChange={setUnitFilter}
              w={230}
            />
          )}
          <Select
            label="Trạng thái"
            value={status}
            data={[
              { value: "ACTIVE", label: "Đang hoạt động" },
              { value: "INACTIVE", label: "Không hoạt động" },
              { value: "ALL", label: "Tất cả trạng thái" },
            ]}
            onChange={(v) =>
              setStatus(v === "INACTIVE" || v === "ALL" ? v : "ACTIVE")
            }
            w={170}
          />
        </Group>
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {all.length} kết quả · Đã chọn {Object.keys(drafts).length}
          </Text>
          <SegmentedControl
            size="xs"
            value={filter}
            data={[
              { value: "ALL", label: "Tất cả" },
              { value: "ASSIGNED", label: "Đã cấp" },
              { value: "UNASSIGNED", label: "Chưa cấp" },
            ]}
            onChange={(v) => setFilter(v as typeof filter)}
          />
        </Group>
        <Results
          kind={kind}
          rows={all}
          drafts={drafts}
          loading={q.isFetching}
          error={q.error}
          retry={() => q.refetch()}
          add={add}
          drop={drop}
          setActions={(id, a) =>
            setDrafts((c) => ({ ...c, [id]: { ...c[id], actions: a } }))
          }
        />
        <Group
          justify="space-between"
          style={{
            position: "sticky",
            bottom: 0,
            background: "var(--mantine-color-body)",
            paddingTop: 8,
          }}
        >
          <Text size="sm" c="dimmed">
            Đã chọn {Object.keys(drafts).length} · Thu hồi {removed.length}
          </Text>
          <Group>
            <Button variant="default" onClick={onClose}>
              Hủy
            </Button>
            <Button
              loading={save.isPending}
              disabled={!changed}
              onClick={() => save.mutate()}
            >
              Lưu thay đổi
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
function Results({
  kind,
  rows,
  drafts,
  loading,
  error,
  retry,
  add,
  drop,
  setActions,
}: {
  kind: Kind;
  rows: Array<DepartmentOption | UnitOption>;
  drafts: Record<string, Draft>;
  loading: boolean;
  error: unknown;
  retry: () => void;
  add: (s: DepartmentOption | UnitOption) => void;
  drop: (id: string) => void;
  setActions: (id: string, a: BusinessAction[]) => void;
}) {
  if (loading)
    return (
      <Paper p="sm" withBorder>
        <Skeleton height={260} />
      </Paper>
    );
  if (error)
    return (
      <Paper p="md" withBorder>
        <Button onClick={retry}>Thử lại</Button>
      </Paper>
    );
  return (
    <Paper p={0} withBorder>
      <Box mah={320} style={{ overflowY: "auto" }}>
        <Table layout="fixed">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Phạm vi</Table.Th>
              <Table.Th>Tham chiếu</Table.Th>
              <Table.Th>Quyền</Table.Th>
              <Table.Th>Thao tác</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((s) => {
              const id =
                  kind === "department"
                    ? (s as DepartmentOption).departmentId
                    : (s as UnitOption).unitId,
                n =
                  kind === "department"
                    ? (s as DepartmentOption).departmentName
                    : (s as UnitOption).unitName,
                c =
                  kind === "department"
                    ? (s as DepartmentOption).departmentCode
                    : (s as UnitOption).unitCode,
                x = drafts[id];
              return (
                <Table.Tr key={id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {n}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {c}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {kind === "department"
                        ? `${(s as DepartmentOption).unitName} · ${(s as DepartmentOption).unitCode}`
                        : ((s as UnitOption).unitType ?? "—")}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {x ? (
                      <SegmentedControl
                        size="xs"
                        value={x.actions.includes("SUBMIT") ? "SUBMIT" : "READ"}
                        data={[
                          { value: "READ", label: "Chỉ đọc" },
                          { value: "SUBMIT", label: "Đọc và gửi" },
                        ]}
                        onChange={(v) =>
                          setActions(
                            id,
                            v === "SUBMIT" ? ["READ", "SUBMIT"] : ["READ"],
                          )
                        }
                      />
                    ) : (
                      <Text size="xs" c="dimmed">
                        Chỉ đọc khi thêm
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      color={x ? "red" : "hacomRed"}
                      variant={x ? "subtle" : "filled"}
                      aria-label={
                        x ? `Bỏ quyền của ${n}` : `Thêm quyền cho ${n}`
                      }
                      onClick={() => (x ? drop(id) : add(s))}
                    >
                      {x ? <IconTrash size={16} /> : <IconPlus size={16} />}
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>
    </Paper>
  );
}
function Confirm({
  row,
  pending,
  onClose,
  onConfirm,
}: {
  row: MatrixRow;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const on = row.permissions.some(
    (p) => p.type === "CORPORATE_REPORT" && p.actions.includes("AGGREGATE"),
  );
  return (
    <Modal
      opened
      onClose={onClose}
      title={
        on ? "Thu hồi quyền Tổng công ty?" : "Xác nhận cấp quyền Tổng công ty"
      }
      centered
    >
      <Stack>
        <Alert color={on ? "orange" : "yellow"}>
          {on
            ? `Sau khi thu hồi, ${row.fullName} không còn quyền xem báo cáo toàn Tổng công ty.`
            : `Bạn đang cấp cho ${row.fullName} quyền xem báo cáo toàn Tổng công ty.`}
        </Alert>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Hủy
          </Button>
          <Button
            color={on ? "orange" : "yellow"}
            loading={pending}
            onClick={onConfirm}
          >
            Xác nhận
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
