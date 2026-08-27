import type { AttendanceRecord } from '../../features/attendance/attendanceTypes';
import type { AuditLog } from '../../features/audit/auditTypes';
import type { Contract } from '../../features/contracts/contractTypes';
import type { ImportBatch } from '../../features/imports/importTypes';
import type { LeaveRequest } from '../../features/leave/leaveTypes';
import type { Movement } from '../../features/movements/movementTypes';
import type { OffboardingInstance, OffboardingTemplate } from '../../features/offboarding/offboardingTypes';
import type { OnboardingInstance, OnboardingTemplate } from '../../features/onboarding/onboardingTypes';

export const mockMovements: Movement[] = [
  { id: 'mov-01', employeeId: 'emp-03', employeeName: 'Le Thanh Mai', movementType: 'TRANSFER', effectiveDate: '2026-04-28', reason: 'Retail staffing rebalance', afterJson: { departmentId: 'ou-sales', departmentName: 'Sales' }, status: 'DRAFT' },
  { id: 'mov-02', employeeId: 'emp-04', employeeName: 'Pham Duc Anh', movementType: 'PROMOTION', effectiveDate: '2026-05-01', reason: 'Delivery performance', afterJson: { positionName: 'Engineering Lead', grade: 'M1' }, status: 'SUBMITTED' },
  { id: 'mov-03', employeeId: 'emp-07', employeeName: 'Bui Hong Nhung', movementType: 'TERMINATION', effectiveDate: '2026-03-12', reason: 'Offboarding completed', afterJson: { employmentStatus: 'TERMINATED' }, status: 'APPROVED' },
];

export const mockContracts: Contract[] = [
  { id: 'ctr-01', employeeId: 'emp-01', employeeName: 'Nguyen Ha Linh', contractNo: 'HD-2023-001', contractType: 'LABOR', startDate: '2023-01-15', endDate: '2027-01-14', status: 'ACTIVE' },
  { id: 'ctr-02', employeeId: 'emp-03', employeeName: 'Le Thanh Mai', contractNo: 'TV-2024-002', contractType: 'PROBATION', startDate: '2024-01-05', endDate: '2024-04-05', status: 'COMPLETED' },
  { id: 'ctr-03', employeeId: 'emp-07', employeeName: 'Bui Hong Nhung', contractNo: 'HD-2019-014', contractType: 'LABOR', startDate: '2019-09-09', endDate: '2026-03-12', status: 'TERMINATED' },
];

export const mockLeaveRequests: LeaveRequest[] = [
  { id: 'lv-01', employeeId: 'emp-05', employeeName: 'Do Thu Trang', leaveType: 'ANNUAL', startDate: '2026-04-29', endDate: '2026-04-30', totalDays: 2, reason: 'Family trip', status: 'SUBMITTED' },
  { id: 'lv-02', employeeId: 'emp-04', employeeName: 'Pham Duc Anh', leaveType: 'SICK', startDate: '2026-04-21', endDate: '2026-04-21', totalDays: 1, reason: 'Medical appointment', status: 'APPROVED' },
  { id: 'lv-03', employeeId: 'emp-09', employeeName: 'Hoang Lam', leaveType: 'UNPAID', startDate: '2026-05-10', endDate: '2026-05-12', totalDays: 3, reason: 'Personal matter', status: 'DRAFT' },
];

export const mockAttendanceRecords: AttendanceRecord[] = [
  { id: 'att-01', employeeId: 'emp-01', employeeName: 'Nguyen Ha Linh', workDate: '2026-04-24', checkIn: '2026-04-24T08:05:00', checkOut: '2026-04-24T17:45:00', source: 'MACHINE', status: 'APPROVED' },
  { id: 'att-02', employeeId: 'emp-04', employeeName: 'Pham Duc Anh', workDate: '2026-04-24', checkIn: '2026-04-24T08:33:00', checkOut: '2026-04-24T18:02:00', source: 'IMPORT', status: 'SUBMITTED' },
  { id: 'att-03', employeeId: 'emp-09', employeeName: 'Hoang Lam', workDate: '2026-04-24', checkIn: '2026-04-24T08:09:00', checkOut: '2026-04-24T17:31:00', source: 'MANUAL', status: 'DRAFT' },
];

export const mockOnboardingTemplates: OnboardingTemplate[] = [
  { id: 'obt-01', name: 'Office Staff Onboarding', status: 'ACTIVE', itemCount: 5 },
  { id: 'obt-02', name: 'Store Staff Onboarding', status: 'ACTIVE', itemCount: 6 },
];

export const mockOnboardingInstances: OnboardingInstance[] = [
  {
    id: 'obi-01',
    employeeId: 'emp-09',
    employeeName: 'Hoang Lam',
    templateName: 'Store Staff Onboarding',
    status: 'IN_PROGRESS',
    startDate: '2026-04-20',
    items: [
      { id: 'obi-01-it-1', title: 'Account provisioning', owner: 'IT', status: 'COMPLETED' },
      { id: 'obi-01-it-2', title: 'Welcome orientation', owner: 'HR', status: 'IN_PROGRESS' },
    ],
  },
];

export const mockOffboardingTemplates: OffboardingTemplate[] = [
  { id: 'oft-01', name: 'Standard Offboarding', status: 'ACTIVE', itemCount: 4 },
];

export const mockOffboardingInstances: OffboardingInstance[] = [
  {
    id: 'ofi-01',
    employeeId: 'emp-07',
    employeeName: 'Bui Hong Nhung',
    templateName: 'Standard Offboarding',
    status: 'COMPLETED',
    startDate: '2026-03-01',
    items: [
      { id: 'ofi-01-it-1', title: 'Device return', owner: 'IT', status: 'COMPLETED' },
      { id: 'ofi-01-it-2', title: 'Final clearance', owner: 'HR', status: 'COMPLETED' },
    ],
  },
];

export const mockImportBatches: ImportBatch[] = [
  {
    id: 'imp-01',
    batchCode: 'BATCH-EMP-001',
    importType: 'EMPLOYEE',
    fileName: 'employees_april.csv',
    totalRows: 120,
    successRows: 117,
    failedRows: 3,
    status: 'PARTIAL_SUCCESS',
    createdAt: '2026-04-24T09:00:00',
    errorSummary: [
      { rowNo: 18, field: 'companyEmail', message: 'Invalid email format' },
      { rowNo: 43, field: 'employeeCode', message: 'Duplicated employee code' },
      { rowNo: 99, field: 'unitId', message: 'Unknown legal entity' },
    ],
  },
  {
    id: 'imp-02',
    batchCode: 'BATCH-ATT-003',
    importType: 'ATTENDANCE',
    fileName: 'attendance_20260424.csv',
    totalRows: 850,
    successRows: 850,
    failedRows: 0,
    status: 'COMPLETED',
    createdAt: '2026-04-24T18:00:00',
    errorSummary: [],
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'adt-01',
    entityType: 'EMPLOYEE',
    entityId: 'emp-09',
    action: 'CREATE',
    actorUserId: 'usr-hr-admin',
    actorName: 'Nguyen Ha Linh',
    beforeJson: null,
    afterJson: { employeeCode: 'EMP0009', fullName: 'Hoang Lam', employmentStatus: 'PROBATION' },
    createdAt: '2026-04-24T08:30:00',
  },
  {
    id: 'adt-02',
    entityType: 'LEAVE_REQUEST',
    entityId: 'lv-01',
    action: 'SUBMIT',
    actorUserId: 'usr-manager',
    actorName: 'Tran Minh Quan',
    beforeJson: { status: 'DRAFT' },
    afterJson: { status: 'SUBMITTED' },
    createdAt: '2026-04-24T14:05:00',
  },
  {
    id: 'adt-03',
    entityType: 'DEPARTMENT',
    entityId: 'ou-sales',
    action: 'UPDATE',
    actorUserId: 'usr-hr-admin',
    actorName: 'Nguyen Ha Linh',
    beforeJson: { name: 'Sales' },
    afterJson: { name: 'Sales & Business Development' },
    createdAt: '2026-04-23T10:15:00',
  },
];

