import { CalendarEventType } from './calendarSharedTypes';

// Tách khỏi CalendarView.tsx để CalendarSidebar (checklist lọc loại sự kiện)
// dùng chung 1 nguồn màu/nhãn duy nhất — tránh lệch màu giữa ô vuông trên
// lưới lịch và chấm màu trong danh sách lọc ở sidebar.
export const EVENT_TYPE_COLORS: Record<string, string> = {
  [CalendarEventType.PERSONAL]: 'grape',
  [CalendarEventType.MEETING]: 'blue',
  [CalendarEventType.TASK]: 'green',
  [CalendarEventType.DEADLINE]: 'red',
  [CalendarEventType.LEAVE]: 'orange',
  [CalendarEventType.REMINDER]: 'yellow',
  [CalendarEventType.OTHER]: 'gray',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  [CalendarEventType.PERSONAL]: 'Cá nhân',
  [CalendarEventType.MEETING]: 'Họp',
  [CalendarEventType.TASK]: 'Công việc',
  [CalendarEventType.DEADLINE]: 'Hạn chót',
  [CalendarEventType.LEAVE]: 'Nghỉ phép',
  [CalendarEventType.REMINDER]: 'Nhắc nhở',
  [CalendarEventType.OTHER]: 'Khác',
};

// Thứ tự hiển thị trong checklist sidebar — ưu tiên các loại phổ biến trước.
export const EVENT_TYPE_ORDER = [
  CalendarEventType.MEETING,
  CalendarEventType.PERSONAL,
  CalendarEventType.TASK,
  CalendarEventType.DEADLINE,
  CalendarEventType.LEAVE,
  CalendarEventType.REMINDER,
  CalendarEventType.OTHER,
];
