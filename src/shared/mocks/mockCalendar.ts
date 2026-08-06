import type { CalendarEvent } from '../../features/calendar/calendarSharedTypes';
import { CalendarEventType, CalendarVisibility, ParticipantResponse } from '../../features/calendar/calendarSharedTypes';
import { mockEmployees } from './mockEmployees';

function toCalendarEmployee(employeeId: string) {
  const employee = mockEmployees.find((item) => item.id === employeeId);
  if (!employee) return null;
  return {
    id: employee.id,
    fullName: employee.fullName,
    employeeCode: employee.employeeCode,
    department: employee.currentEmployeeAssignment?.departmentName,
    position: employee.currentEmployeeAssignment?.positionName,
  };
}

function isoAt(daysFromToday: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: 'cal-evt-01',
    title: 'Họp giao ban tuần',
    description: 'Cập nhật tiến độ các dự án trong tuần.',
    ownerId: 'emp-01',
    ownerAuthUserId: 'auth-1000',
    ownerEmployeeCode: 'HC000001',
    ownerName: 'Nguyen Ha Linh',
    owner: toCalendarEmployee('emp-01'),
    startAt: isoAt(0, 9, 0),
    endAt: isoAt(0, 10, 0),
    timezone: 'Asia/Ho_Chi_Minh',
    isAllDay: false,
    isRecurring: false,
    recurrenceRule: null,
    visibility: CalendarVisibility.TEAM,
    eventType: CalendarEventType.MEETING,
    location: 'Phòng họp tầng 3',
    participants: [
      {
        id: 'cal-part-01',
        employeeId: 'emp-03',
        authUserId: 'auth-1003',
        employeeCode: 'TECH000001',
        fullName: 'Le Thanh Mai',
        avatarUrl: null,
        departmentName: 'Retail Operations',
        employee: toCalendarEmployee('emp-03'),
        response: ParticipantResponse.ACCEPTED,
        respondedAt: isoAt(-1, 8, 0),
        createdAt: isoAt(-2, 8, 0),
      },
    ],
    canEdit: false,
    canDelete: false,
    canViewFullDetails: true,
    isParticipant: true,
    createdAt: isoAt(-2, 8, 0),
    updatedAt: isoAt(-2, 8, 0),
  },
  {
    id: 'cal-evt-02',
    title: 'Nghỉ phép năm',
    description: null,
    ownerId: 'emp-03',
    ownerAuthUserId: 'auth-1003',
    ownerEmployeeCode: 'TECH000001',
    ownerName: 'Le Thanh Mai',
    owner: toCalendarEmployee('emp-03'),
    startAt: isoAt(3, 0, 0),
    endAt: isoAt(3, 23, 59),
    timezone: 'Asia/Ho_Chi_Minh',
    isAllDay: true,
    isRecurring: false,
    recurrenceRule: null,
    visibility: CalendarVisibility.PRIVATE,
    eventType: CalendarEventType.LEAVE,
    location: null,
    participants: [],
    canEdit: true,
    canDelete: true,
    canViewFullDetails: true,
    isParticipant: false,
    createdAt: isoAt(-5, 10, 0),
    updatedAt: isoAt(-5, 10, 0),
  },
  {
    id: 'cal-evt-03',
    title: 'Deadline báo cáo tháng',
    description: 'Nộp báo cáo doanh số Retail Operations.',
    ownerId: 'emp-03',
    ownerAuthUserId: 'auth-1003',
    ownerEmployeeCode: 'TECH000001',
    ownerName: 'Le Thanh Mai',
    owner: toCalendarEmployee('emp-03'),
    startAt: isoAt(5, 17, 0),
    endAt: isoAt(5, 17, 30),
    timezone: 'Asia/Ho_Chi_Minh',
    isAllDay: false,
    isRecurring: false,
    recurrenceRule: null,
    visibility: CalendarVisibility.PRIVATE,
    eventType: CalendarEventType.DEADLINE,
    location: null,
    participants: [],
    canEdit: true,
    canDelete: true,
    canViewFullDetails: true,
    isParticipant: false,
    createdAt: isoAt(-1, 9, 0),
    updatedAt: isoAt(-1, 9, 0),
  },
];
