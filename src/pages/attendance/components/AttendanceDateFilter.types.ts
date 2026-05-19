export type AttendanceDateMode = 'date' | 'range';

export type AttendanceDateFilterValue = {
  mode: AttendanceDateMode;
  date?: string;
  from?: string;
  to?: string;
};
