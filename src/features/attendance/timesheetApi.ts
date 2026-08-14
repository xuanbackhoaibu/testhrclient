import {
  api,
  type SaveLocationDownloadResult,
} from '../../shared/api/httpClient';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import type {
  AdjustTimesheetDayPayload,
  RecomputePayload,
  RecomputeResult,
  SetAutoFullAttendancePayload,
  SetAutoFullAttendanceResult,
  OpenTimesheetPeriodPayload,
  ReopenTimesheetPeriodPayload,
  TimesheetGrid,
  TimesheetGridQuery,
  TimesheetConfirmation,
  TimesheetPeriod,
} from './timesheetTypes';

const BASE = '/attendance/timesheet';
const PERIOD_BASE = '/timesheet/periods';
const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

/** API nhận các bộ lọc nhiều lựa chọn dạng CSV để Nest xử lý ổn định ở cả
 * proxy và query parser khác nhau (tránh phụ thuộc departmentIds[]=...). */
function timesheetParams(query: TimesheetGridQuery): Record<string, unknown> {
  return {
    ...query,
    departmentIds: query.departmentIds?.length
      ? query.departmentIds.join(',')
      : undefined,
    unitIds: query.unitIds?.length ? query.unitIds.join(',') : undefined,
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function nowIso(): string {
  return new Date().toISOString();
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isWeekend(year: number, month: number, day: number): boolean {
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 || weekday === 6;
}

function holidayName(year: number, month: number, day: number): string | null {
  const key = `${pad2(month)}-${pad2(day)}`;
  if (key === '01-01') return 'Tết Dương lịch';
  if (key === '04-30') return 'Ngày Giải phóng miền Nam';
  if (key === '05-01') return 'Quốc tế Lao động';
  if (year === 2026 && key === '02-17') return 'Tết Nguyên đán';
  return null;
}

function buildMockGrid(query: TimesheetGridQuery): TimesheetGrid {
  const daysInMonth = getDaysInMonth(query.year, query.month);
  const employees = mockEmployees.filter((employee) => {
    const assignment = employee.currentEmployeeAssignment;
    if (query.employeeId && employee.id !== query.employeeId) return false;
    if (query.departmentId && assignment?.departmentId !== query.departmentId) return false;
    if (query.unitId && assignment?.unitId !== query.unitId) return false;
    if (query.departmentIds?.length && !query.departmentIds.includes(assignment?.departmentId ?? '')) return false;
    if (query.unitIds?.length && !query.unitIds.includes(assignment?.unitId ?? '')) return false;
    return true;
  });

  return {
    month: query.month,
    year: query.year,
    daysInMonth,
    rows: employees.map((employee, employeeIndex) => {
      const assignment = employee.currentEmployeeAssignment;
      const days = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = `${query.year}-${pad2(query.month)}-${pad2(day)}`;
        const holiday = holidayName(query.year, query.month, day);
        const weekend = isWeekend(query.year, query.month, day);
        const annualLeave = !holiday && !weekend && day === 12 && employeeIndex % 5 === 0;
        const unpaidLeave = !holiday && !weekend && day === 18 && employeeIndex % 6 === 0;
        const late = !holiday && !weekend && day === 8 && employeeIndex % 3 === 0;
        const manualAdjustment = !holiday && !weekend && day === 22 && employeeIndex % 4 === 0;
        const displaySymbol = holiday
          ? 'L'
          : weekend
            ? ''
            : annualLeave
              ? 'P'
              : unpaidLeave
                ? 'KL'
                : '+';
        const paidDays = holiday || (!weekend && !unpaidLeave) ? 1 : 0;

        return {
          id: `mock-day-${employee.id}-${date}`,
          date,
          day,
          displaySymbol,
          paidDays,
          leaveDays: annualLeave ? 1 : 0,
          isWorkingDay: !weekend,
          holidayName: holiday,
          firstPunch: !weekend && !holiday && !annualLeave && !unpaidLeave ? `${date}T${late ? '08:18' : '08:00'}:00` : null,
          lastPunch: !weekend && !holiday && !annualLeave && !unpaidLeave ? `${date}T17:30:00` : null,
          lateMinutes: late ? 18 : 0,
          earlyLeaveMinutes: manualAdjustment ? 10 : 0,
          needsExplanation: late || manualAdjustment,
          hasAdjustment: manualAdjustment,
          isLocked: day <= 5,
        };
      });

      const countBySymbol = days.reduce<Record<string, number>>((acc, day) => {
        if (day.displaySymbol) {
          acc[day.displaySymbol] = (acc[day.displaySymbol] ?? 0) + 1;
        }
        return acc;
      }, {});
      const totalLeaveDays = days.reduce((sum, day) => sum + day.leaveDays, 0);
      const totalPaidDays = days.reduce((sum, day) => sum + day.paidDays, 0);

      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        attendanceAutoFullDay: employeeIndex === 1,
        departmentId: assignment?.departmentId ?? null,
        departmentName: assignment?.departmentName ?? null,
        unitId: assignment?.unitId ?? null,
        unitName: assignment?.unitName ?? null,
        jobTitle: assignment?.jobTitle ?? assignment?.positionName ?? null,
        days,
        summary: {
          totalPaidDays,
          totalLeaveDays,
          countBySymbol,
          bcc: {
            actualWorkDays: countBySymbol['+'] ?? 0,
            publicHolidayDays: countBySymbol.L ?? 0,
            annualLeaveDays: countBySymbol.P ?? 0,
            compensatoryLeaveDays: 0,
            paidPersonalLeaveDays: 0,
            companyTripDays: 0,
            dutyDays: 0,
            unpaidLeaveDays: countBySymbol.KL ?? 0,
            socialInsuranceDays: 0,
            totalActualDays: totalPaidDays,
          },
          annualLeaveUsedToMonth: totalLeaveDays + employeeIndex,
          annualLeaveUsedInYear: totalLeaveDays + employeeIndex + 2,
        },
      };
    }),
  };
}

function buildMockPeriod(month: number, year: number, status?: TimesheetPeriod['status']): TimesheetPeriod {
  const createdAt = `${year}-${pad2(month)}-01T02:00:00.000Z`;
  const currentMonth = new Date().getMonth() + 1;
  const resolvedStatus = status ?? (month < currentMonth ? 'CLOSED' : 'PENDING_HR');

  return {
    id: `mock-period-${year}-${pad2(month)}`,
    month,
    year,
    unitId: null,
    status: resolvedStatus,
    confirmDeadline: `${year}-${pad2(month)}-25`,
    openedAt: createdAt,
    openedBy: 'HR Demo',
    closedAt: resolvedStatus === 'CLOSED' ? `${year}-${pad2(month)}-28T10:00:00.000Z` : null,
    closedBy: resolvedStatus === 'CLOSED' ? 'HR Demo' : null,
    reopenedAt: null,
    reopenedBy: null,
    reopenReason: null,
    createdAt,
    updatedAt: nowIso(),
    unit: null,
    _count: { confirmations: mockEmployees.length },
  };
}

function downloadText(filename: string, content: string): SaveLocationDownloadResult {
  if (typeof window === 'undefined' || typeof Blob === 'undefined') {
    return { status: 'unsupported' };
  }
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
  return { status: 'saved', filename };
}

export async function getTimesheetGrid(
  query: TimesheetGridQuery,
): Promise<TimesheetGrid> {
  if (isMockMode) return buildMockGrid(query);
  return api.get<TimesheetGrid>(`${BASE}/grid`, { params: timesheetParams(query) });
}

export async function downloadTimesheetGridExport(
  query: TimesheetGridQuery,
): Promise<SaveLocationDownloadResult> {
  if (isMockMode) {
    const grid = buildMockGrid(query);
    const header = ['Ma NV', 'Ho ten', 'Phong ban', 'Tong cong'];
    const rows = grid.rows.map((row) => [
      row.employeeCode,
      row.fullName,
      row.departmentName ?? '',
      String(row.summary.totalPaidDays),
    ]);
    return downloadText(
      `bang-cham-cong-${query.year}-${pad2(query.month)}.csv`,
      [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n'),
    );
  }
  return api.downloadToSelectedLocation(
    `${BASE}/export`,
    `bang-cham-cong-${query.year}-${String(query.month).padStart(2, '0')}.xlsx`,
    timesheetParams(query),
  );
}

export async function adjustTimesheetDay(
  id: string,
  payload: AdjustTimesheetDayPayload,
): Promise<unknown> {
  if (isMockMode) return { id, ...payload, updatedAt: nowIso() };
  return api.patch(`${BASE}/days/${id}/adjust`, payload);
}

export async function recomputeTimesheet(
  payload: RecomputePayload,
): Promise<RecomputeResult> {
  if (isMockMode) return { processed: mockEmployees.length, skippedLocked: 3, skippedAdjusted: 2 };
  return api.post<RecomputeResult>(`${BASE}/recompute`, payload);
}

export async function setAutoFullAttendance(
  employeeId: string,
  payload: SetAutoFullAttendancePayload,
): Promise<SetAutoFullAttendanceResult> {
  if (isMockMode) {
    return {
      employeeId,
      attendanceAutoFullDay: payload.enabled,
      recompute: { processed: 22, skippedLocked: 3, skippedAdjusted: 2 },
    };
  }
  return api.patch<SetAutoFullAttendanceResult>(
    `${BASE}/employees/${employeeId}/auto-full-attendance`,
    payload,
  );
}

export async function listTimesheetPeriods(year: number): Promise<TimesheetPeriod[]> {
  if (isMockMode) {
    const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() + 1 : 12;
    return [currentMonth, Math.max(1, currentMonth - 1), Math.max(1, currentMonth - 2)]
      .filter((month, index, months) => months.indexOf(month) === index)
      .map((month, index) => buildMockPeriod(month, year, index === 0 ? 'PENDING_HR' : 'CLOSED'));
  }
  return api.get<TimesheetPeriod[]>(PERIOD_BASE, { params: { year } });
}

export async function listTimesheetConfirmations(
  periodId: string,
): Promise<TimesheetConfirmation[]> {
  if (isMockMode) {
    return mockEmployees.slice(0, 8).map((employee, index) => {
      const status: TimesheetConfirmation['status'] = index % 5 === 0
        ? 'DISPUTED'
        : index % 2 === 0
          ? 'CONFIRMED'
          : 'PENDING';
      return {
        id: `mock-confirmation-${periodId}-${employee.id}`,
        periodId,
        employeeId: employee.id,
        status,
        confirmedAt: status === 'CONFIRMED' ? nowIso() : null,
        disputeNote: status === 'DISPUTED' ? 'Nhân viên báo thiếu dữ liệu check-out.' : null,
        disputedAt: status === 'DISPUTED' ? nowIso() : null,
        resolvedAt: null,
        resolvedBy: null,
        resolveNote: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        employee: {
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
        },
      };
    });
  }
  return api.get<TimesheetConfirmation[]>(`${PERIOD_BASE}/${periodId}/confirmations`);
}

export async function downloadTimesheetPeriodExport(period: TimesheetPeriod): Promise<void> {
  if (isMockMode) {
    downloadText(
      `timesheet-confirmations-${period.year}-${pad2(period.month)}.csv`,
      'Ma ky,Thang,Nam,Trang thai\n'
        + `"${period.id}","${period.month}","${period.year}","${period.status}"`,
    );
    return;
  }
  await api.download(
    `${PERIOD_BASE}/${period.id}/export`,
    `timesheet-confirmations-${period.year}-${String(period.month).padStart(2, '0')}.xlsx`,
  );
}

export async function openTimesheetPeriod(
  payload: OpenTimesheetPeriodPayload,
): Promise<TimesheetPeriod> {
  if (isMockMode) {
    return {
      ...buildMockPeriod(payload.month, payload.year, 'PENDING_EMPLOYEE'),
      unitId: payload.unitId ?? null,
      confirmDeadline: payload.confirmDeadline ?? null,
    };
  }
  return api.post<TimesheetPeriod>(`${PERIOD_BASE}/open`, payload);
}

export async function closeTimesheetPeriod(id: string): Promise<TimesheetPeriod> {
  if (isMockMode) {
    const [, , year = String(new Date().getFullYear()), month = String(new Date().getMonth() + 1)] = id.split('-');
    return {
      ...buildMockPeriod(Number(month), Number(year), 'CLOSED'),
      id,
      closedAt: nowIso(),
      closedBy: 'HR Demo',
    };
  }
  return api.post<TimesheetPeriod>(`${PERIOD_BASE}/${id}/close`);
}

export async function reopenTimesheetPeriod(
  id: string,
  payload: ReopenTimesheetPeriodPayload,
): Promise<TimesheetPeriod> {
  if (isMockMode) {
    const [, , year = String(new Date().getFullYear()), month = String(new Date().getMonth() + 1)] = id.split('-');
    return {
      ...buildMockPeriod(Number(month), Number(year), 'PENDING_HR'),
      id,
      reopenedAt: nowIso(),
      reopenedBy: 'HR Demo',
      reopenReason: payload.reason,
    };
  }
  return api.post<TimesheetPeriod>(`${PERIOD_BASE}/${id}/reopen`, payload);
}
