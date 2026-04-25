export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  checkIn?: string;
  checkOut?: string;
  source: string;
  status: string;
}

export interface AttendancePayload {
  employeeId: string;
  workDate: string;
  checkIn?: string;
  checkOut?: string;
  source: string;
  status: string;
}

