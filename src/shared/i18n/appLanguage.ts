export type AppLanguageMode = 'vi' | 'en' | 'system';
export type ResolvedAppLanguage = 'vi' | 'en';

export const appLanguageStorageKey = 'hrm:appearance-language';
export const appLanguageChangedEvent = 'hrm:language-changed';

const translations: Record<string, string> = {
  'Âm thanh thông báo': 'Notification sound',
  'Auth mode': 'Auth mode',
  'Auth service': 'Auth service',
  'Auth user ID': 'Auth user ID',
  'Bảng công tháng': 'Monthly timesheet',
  'Bật': 'On',
  'Ca làm việc': 'Work shifts',
  'Ca tuần': 'Weekly shifts',
  'Cài đặt': 'Settings',
  'Cài đặt chung': 'General settings',
  'Cài đặt giao diện': 'Appearance settings',
  'Cài đặt thông báo': 'Notification settings',
  'Chấm công': 'Attendance',
  'Chấm công & Ca làm việc': 'Attendance & shifts',
  'Chọn ngôn ngữ hiển thị trong ứng dụng.': 'Choose the display language for the application.',
  'Chức danh': 'Positions',
  'Cấu hình duyệt phép': 'Leave approval settings',
  'Cấu hình sẽ được đồng bộ theo quyền và API tương ứng.': 'Configuration will be synchronized by permissions and related APIs.',
  'Cấu hình vận hành': 'Runtime configuration',
  'Cỡ chữ': 'Font size',
  'Danh mục quyền': 'Permission catalog',
  'Danh sách tài khoản': 'Account list',
  'Data scopes': 'Data scopes',
  'Dashboard': 'Dashboard',
  'Email': 'Email',
  'English': 'English',
  'English interface for bilingual teams.': 'English interface for bilingual teams.',
  'Giao diện': 'Appearance',
  'Giao diện tiếng Việt cho vận hành HRM hằng ngày.': 'Vietnamese interface for daily HRM operations.',
  'HACOM HRM': 'HACOM HRM',
  'Hiển thị thêm dòng `Ngôn ngữ trình duyệt` để HR biết chế độ hệ thống đang dựa trên locale nào.': 'Show browser language so HR can see which locale system mode uses.',
  'Hình nền chat': 'Chat wallpaper',
  'Hợp đồng': 'Contracts',
  'Kỳ công': 'Timesheet periods',
  'Lịch của tôi': 'My calendar',
  'Lịch làm việc': 'Work schedule',
  'Lĩnh vực': 'Business sectors',
  'Lớn': 'Large',
  'Mở rộng thanh bên': 'Expand sidebar',
  'Ngày lễ': 'Holidays',
  'Ngôn ngữ': 'Language',
  'Ngôn ngữ hiển thị': 'Display language',
  'Ngôn ngữ trình duyệt': 'Browser language',
  'Người dùng': 'User',
  'Người dùng và tài khoản': 'Users and accounts',
  'Nghỉ phép': 'Leave',
  'Quản lý nghỉ phép': 'Leave Management',
  'Nhân sự': 'Employees',
  'Nhóm quyền': 'Permission groups',
  'Nhỏ': 'Small',
  'Nhận được thông báo mỗi khi có cập nhật mới trong HRM': 'Receive notifications whenever HRM has new updates',
  'Offboarding': 'Offboarding',
  'Onboarding': 'Onboarding',
  'Phân ca': 'Shift assignments',
  'Phạm vi dữ liệu': 'Data scope',
  'Phân quyền': 'Authorization',
  'Phân quyền báo cáo công việc': 'Work report authorization',
  'Phát âm thanh khi có tin nhắn & thông báo mới': 'Play sound for new messages and notifications',
  'Phòng ban': 'Departments',
  'Quy trình nhân sự': 'HR workflows',
  'Quản lý dữ liệu': 'Data management',
  'Redirect URI': 'Redirect URI',
  'Roles': 'Roles',
  'Runtime': 'Runtime',
  'Runtime config đang dùng trong phiên hiện tại.': 'Runtime config used in the current session.',
  'Sắp ca tháng': 'Monthly shift planning',
  'Sắp có': 'Coming soon',
  'Sáng': 'Light',
  'Sử dụng Avatar làm hình nền': 'Use avatar as wallpaper',
  'Sử dụng ngôn ngữ của trình duyệt.': 'Use the browser language.',
  'Theo hệ thống': 'System',
  'Thông báo': 'Notifications',
  'Thông tin nhận diện tài khoản HRM đang đăng nhập.': 'Identity information for the current HRM account.',
  'Tháng này': 'This month',
  'Thu gọn': 'Collapse',
  'Tiếng Việt': 'Vietnamese',
  'Trạng thái tài khoản': 'Account status',
  'Tài khoản': 'Account',
  'Tài khoản chờ liên kết': 'Pending linked accounts',
  'Tài khoản chờ liên kết nhân sự': 'Pending HR link accounts',
  'Tài khoản và bảo mật': 'Account and security',
  'Tắt': 'Off',
  'Tối': 'Dark',
  'Tổ chức': 'Organization',
  'Vai trò': 'Roles',
  'Vai trò và quyền': 'Roles and permissions',
  'Vừa': 'Medium',
  'Xử lý mapping': 'Mapping processing',
  'Đang áp dụng': 'Applied',
  'Đăng xuất': 'Log out',
  'Điều chuyển': 'Movements',
  'Đơn vị': 'Units',
};

export function resolveAppLanguage(mode: AppLanguageMode): ResolvedAppLanguage {
  if (mode !== 'system') return mode;
  if (typeof navigator === 'undefined') return 'vi';
  return navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function readAppLanguageMode(): AppLanguageMode {
  if (typeof window === 'undefined') return 'vi';
  const saved = window.localStorage.getItem(appLanguageStorageKey);
  return saved === 'en' || saved === 'system' ? saved : 'vi';
}

export function applyAppLanguage(mode: AppLanguageMode) {
  const resolved = resolveAppLanguage(mode);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.hrmLanguage = mode;
    document.documentElement.lang = resolved === 'vi' ? 'vi' : 'en';
  }
}

export function writeAppLanguageMode(mode: AppLanguageMode) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(appLanguageStorageKey, mode);
    window.dispatchEvent(new CustomEvent(appLanguageChangedEvent, { detail: mode }));
  }
  applyAppLanguage(mode);
}

export function translateUiText(value: string, mode: AppLanguageMode): string {
  if (resolveAppLanguage(mode) === 'vi') return value;
  return translations[value] ?? value;
}
