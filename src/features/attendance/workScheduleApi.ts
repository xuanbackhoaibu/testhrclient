import { api } from '../../shared/api/httpClient';
import type {
  CloneHolidaysPayload,
  CloneHolidaysResult,
  Holiday,
  HolidayPayload,
  ShiftAssignment,
  ShiftAssignmentPayload,
  WorkCalendarDay,
  WorkCalendarDayPayload,
  WorkShift,
  WorkShiftPayload,
} from './workScheduleTypes';

const BASE = '/attendance/work-schedule';
const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
const MOCK_WORK_SCHEDULE_KEY = 'hr-web-client.mock-work-schedule';

interface MockWorkScheduleState {
  shifts: WorkShift[];
  holidays: Holiday[];
  assignments: ShiftAssignment[];
  calendar: WorkCalendarDay[];
}

function nowIso() {
  return new Date().toISOString();
}

function defaultWorkScheduleState(): MockWorkScheduleState {
  const createdAt = nowIso();
  const shifts: WorkShift[] = [
    {
      id: 'shift-day',
      code: 'HC',
      name: 'Ca hành chính',
      startTime: '08:00',
      endTime: '17:30',
      breakStart: '12:00',
      breakEnd: '13:00',
      breakDeducted: true,
      standardMinutes: 510,
      dayValue: 1,
      lateThresholdMinutes: 15,
      earlyLeaveThresholdMinutes: 10,
      maxOvertimeMinutes: 120,
      status: 'ACTIVE',
      note: 'Ca demo dùng cho khối văn phòng.',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'shift-night',
      code: 'CD',
      name: 'Ca đêm kho vận',
      startTime: '22:00',
      endTime: '06:00',
      breakStart: null,
      breakEnd: null,
      breakDeducted: false,
      standardMinutes: 480,
      dayValue: 1,
      lateThresholdMinutes: 10,
      earlyLeaveThresholdMinutes: 10,
      maxOvertimeMinutes: 180,
      status: 'ACTIVE',
      note: 'Ca demo vắt qua ngày hôm sau.',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'shift-sat',
      code: 'T7',
      name: 'Ca thứ bảy',
      startTime: '08:00',
      endTime: '12:00',
      breakStart: null,
      breakEnd: null,
      breakDeducted: false,
      standardMinutes: 240,
      dayValue: 1,
      lateThresholdMinutes: 15,
      earlyLeaveThresholdMinutes: 10,
      maxOvertimeMinutes: 60,
      status: 'ACTIVE',
      note: 'Theo rule HR: 240 phút vẫn tính 1 công.',
      createdAt,
      updatedAt: createdAt,
    },
  ];
  return {
    shifts,
    holidays: [
      { id: 'holiday-new-year', date: '2026-01-01', name: 'Tết Dương lịch', year: 2026, isPaid: true, note: null },
      { id: 'holiday-lunar', date: '2026-02-17', name: 'Tết Nguyên đán', year: 2026, isPaid: true, note: 'Cần HR soát lại ngày âm lịch.' },
      { id: 'holiday-liberation', date: '2026-04-30', name: 'Ngày Giải phóng miền Nam', year: 2026, isPaid: true, note: null },
      { id: 'holiday-labor', date: '2026-05-01', name: 'Quốc tế Lao động', year: 2026, isPaid: true, note: null },
    ],
    assignments: [
      {
        id: 'assign-hr',
        shiftId: 'shift-day',
        employeeId: null,
        departmentId: 'ou-hr',
        unitId: null,
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        status: 'ACTIVE',
        note: 'Áp dụng cho phòng Nhân sự.',
        shift: { code: 'HC', name: 'Ca hành chính' },
        employee: null,
        department: { code: 'HR', name: 'Human Resources' },
        unit: null,
      },
      {
        id: 'assign-retail',
        shiftId: 'shift-night',
        employeeId: null,
        departmentId: 'ou-retail',
        unitId: 'le-02',
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        status: 'ACTIVE',
        note: 'Nhóm vận hành bán lẻ có thể dùng ca đêm.',
        shift: { code: 'CD', name: 'Ca đêm kho vận' },
        employee: null,
        department: { code: 'RTL', name: 'Retail Operations' },
        unit: { code: 'RETAIL', name: 'HACOM Retail' },
      },
    ],
    calendar: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      id: `calendar-${weekday}`,
      weekday,
      isWorkingDay: weekday !== 0,
      shiftId: weekday === 0 ? null : weekday === 6 ? 'shift-sat' : 'shift-day',
      shift: weekday === 0
        ? null
        : weekday === 6
          ? { code: 'T7', name: 'Ca thứ bảy', dayValue: 1 }
          : { code: 'HC', name: 'Ca hành chính', dayValue: 1 },
    })),
  };
}

function readMockState(): MockWorkScheduleState {
  if (typeof window === 'undefined') return defaultWorkScheduleState();
  try {
    const raw = window.localStorage.getItem(MOCK_WORK_SCHEDULE_KEY);
    if (!raw) return defaultWorkScheduleState();
    return { ...defaultWorkScheduleState(), ...(JSON.parse(raw) as Partial<MockWorkScheduleState>) };
  } catch {
    return defaultWorkScheduleState();
  }
}

function writeMockState(state: MockWorkScheduleState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MOCK_WORK_SCHEDULE_KEY, JSON.stringify(state));
}

// ─── Ca làm việc ──────────────────────────────────────────────────────────────

export async function listWorkShifts(): Promise<WorkShift[]> {
  if (isMockMode) return readMockState().shifts;
  return api.get<WorkShift[]>(`${BASE}/shifts`);
}

export async function createWorkShift(payload: WorkShiftPayload): Promise<WorkShift> {
  if (isMockMode) {
    const state = readMockState();
    const shift: WorkShift = {
      id: `shift-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      startTime: payload.startTime,
      endTime: payload.endTime,
      breakStart: payload.breakStart ?? null,
      breakEnd: payload.breakEnd ?? null,
      breakDeducted: payload.breakDeducted ?? false,
      standardMinutes: payload.standardMinutes,
      dayValue: payload.dayValue ?? 1,
      lateThresholdMinutes: payload.lateThresholdMinutes ?? 0,
      earlyLeaveThresholdMinutes: payload.earlyLeaveThresholdMinutes ?? 0,
      maxOvertimeMinutes: payload.maxOvertimeMinutes ?? 0,
      status: payload.status ?? 'ACTIVE',
      note: payload.note ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    writeMockState({ ...state, shifts: [shift, ...state.shifts] });
    return shift;
  }
  return api.post<WorkShift>(`${BASE}/shifts`, payload);
}

export async function updateWorkShift(
  id: string,
  payload: Partial<WorkShiftPayload>,
): Promise<WorkShift> {
  if (isMockMode) {
    const state = readMockState();
    const current = state.shifts.find((shift) => shift.id === id);
    if (!current) throw new Error('Không tìm thấy ca làm việc demo.');
    const updated: WorkShift = { ...current, ...payload, updatedAt: nowIso() };
    writeMockState({
      ...state,
      shifts: state.shifts.map((shift) => shift.id === id ? updated : shift),
    });
    return updated;
  }
  return api.patch<WorkShift>(`${BASE}/shifts/${id}`, payload);
}

// ─── Ngày lễ ──────────────────────────────────────────────────────────────────

export async function listHolidays(year: number): Promise<Holiday[]> {
  if (isMockMode) {
    return readMockState().holidays.filter((holiday) => holiday.year === year);
  }
  return api.get<Holiday[]>(`${BASE}/holidays`, { params: { year } });
}

export async function createHoliday(payload: HolidayPayload): Promise<Holiday> {
  if (isMockMode) {
    const state = readMockState();
    const holiday: Holiday = {
      id: `holiday-${Date.now()}`,
      date: payload.date,
      name: payload.name,
      year: Number(payload.date.slice(0, 4)),
      isPaid: payload.isPaid ?? true,
      note: payload.note ?? null,
    };
    writeMockState({ ...state, holidays: [holiday, ...state.holidays] });
    return holiday;
  }
  return api.post<Holiday>(`${BASE}/holidays`, payload);
}

export async function deleteHoliday(id: string): Promise<{ deleted: boolean }> {
  if (isMockMode) {
    const state = readMockState();
    writeMockState({ ...state, holidays: state.holidays.filter((holiday) => holiday.id !== id) });
    return { deleted: true };
  }
  return api.delete<{ deleted: boolean }>(`${BASE}/holidays/${id}`);
}

export async function cloneHolidays(
  payload: CloneHolidaysPayload,
): Promise<CloneHolidaysResult> {
  if (isMockMode) {
    const state = readMockState();
    const source = state.holidays.filter((holiday) => holiday.year === payload.fromYear);
    const existingDates = new Set(state.holidays.filter((holiday) => holiday.year === payload.toYear).map((holiday) => holiday.date));
    const created = source
      .map((holiday) => ({
        ...holiday,
        id: `holiday-${payload.toYear}-${holiday.id}`,
        date: holiday.date.replace(String(payload.fromYear), String(payload.toYear)),
        year: payload.toYear,
        note: holiday.note ?? 'Nhân bản từ năm trước, cần HR soát lại.',
      }))
      .filter((holiday) => !existingDates.has(holiday.date));
    writeMockState({ ...state, holidays: [...created, ...state.holidays] });
    return { created: created.length, skipped: source.length - created.length };
  }
  return api.post<CloneHolidaysResult>(`${BASE}/holidays/clone`, payload);
}

// ─── Phân ca ──────────────────────────────────────────────────────────────────

export async function listShiftAssignments(params: {
  employeeId?: string;
  departmentId?: string;
  unitId?: string;
} = {}): Promise<ShiftAssignment[]> {
  if (isMockMode) {
    return readMockState().assignments
      .filter((item) => (params.employeeId ? item.employeeId === params.employeeId : true))
      .filter((item) => (params.departmentId ? item.departmentId === params.departmentId : true))
      .filter((item) => (params.unitId ? item.unitId === params.unitId : true));
  }
  return api.get<ShiftAssignment[]>(`${BASE}/assignments`, { params });
}

export async function createShiftAssignment(
  payload: ShiftAssignmentPayload,
): Promise<ShiftAssignment> {
  if (isMockMode) {
    const state = readMockState();
    const shift = state.shifts.find((item) => item.id === payload.shiftId) ?? state.shifts[0];
    const assignment: ShiftAssignment = {
      id: `assign-${Date.now()}`,
      shiftId: payload.shiftId,
      employeeId: payload.employeeId ?? null,
      departmentId: payload.departmentId ?? null,
      unitId: payload.unitId ?? null,
      effectiveFrom: payload.effectiveFrom,
      effectiveTo: payload.effectiveTo ?? null,
      status: 'ACTIVE',
      note: payload.note ?? null,
      shift: { code: shift?.code ?? 'HC', name: shift?.name ?? 'Ca hành chính' },
      employee: payload.employeeId ? { employeeCode: 'DEMO', fullName: 'Nhân sự demo' } : null,
      department: payload.departmentId ? { code: 'DEPT', name: 'Phòng ban demo' } : null,
      unit: payload.unitId ? { code: 'UNIT', name: 'Đơn vị demo' } : null,
    };
    writeMockState({ ...state, assignments: [assignment, ...state.assignments] });
    return assignment;
  }
  return api.post<ShiftAssignment>(`${BASE}/assignments`, payload);
}

export async function endShiftAssignment(id: string): Promise<ShiftAssignment> {
  if (isMockMode) {
    const state = readMockState();
    const current = state.assignments.find((assignment) => assignment.id === id);
    if (!current) throw new Error('Không tìm thấy phân ca demo.');
    const updated = { ...current, status: 'INACTIVE' as const, effectiveTo: new Date().toISOString().slice(0, 10) };
    writeMockState({
      ...state,
      assignments: state.assignments.map((assignment) => assignment.id === id ? updated : assignment),
    });
    return updated;
  }
  return api.patch<ShiftAssignment>(`${BASE}/assignments/${id}/end`, {});
}

// ─── Lịch tuần ────────────────────────────────────────────────────────────────

export async function getWorkCalendar(): Promise<WorkCalendarDay[]> {
  if (isMockMode) return readMockState().calendar;
  return api.get<WorkCalendarDay[]>(`${BASE}/calendar`);
}

export async function updateWorkCalendarDay(
  payload: WorkCalendarDayPayload,
): Promise<WorkCalendarDay> {
  if (isMockMode) {
    const state = readMockState();
    const shift = state.shifts.find((item) => item.id === payload.shiftId);
    const current = state.calendar.find((day) => day.weekday === payload.weekday);
    const updated: WorkCalendarDay = {
      id: current?.id ?? `calendar-${payload.weekday}`,
      weekday: payload.weekday,
      isWorkingDay: payload.isWorkingDay,
      shiftId: payload.shiftId ?? null,
      shift: shift ? { code: shift.code, name: shift.name, dayValue: shift.dayValue } : null,
    };
    writeMockState({
      ...state,
      calendar: state.calendar.map((day) => day.weekday === payload.weekday ? updated : day),
    });
    return updated;
  }
  return api.put<WorkCalendarDay>(`${BASE}/calendar/day`, payload);
}
