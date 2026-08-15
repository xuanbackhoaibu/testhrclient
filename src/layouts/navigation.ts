import {
  IconBriefcase,
  IconBuildingBank,
  IconCalendar,
  IconCalendarCheck,
  IconCalendarStats,
  IconCalendarTime,
  IconClipboardList,
  IconClock,
  IconDashboard,
  IconFileAnalytics,
  IconFileImport,
  IconFolderOpen,
  IconKey,
  IconLink,
  IconSettings,
  IconShield,
  IconSitemap,
  IconTable,
  IconTransfer,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";

import { ROUTES } from "../shared/constants/routes";

export interface NavItem {
  label: string;
  path: string;
  icon: typeof IconDashboard;
}

/** A labeled sub-list inside a group (renders as a nested expandable NavLink).
 *  Omit `label` for a section that should render its items directly under the
 *  group, with no extra nesting level (e.g. "Tổ chức" only needs one level). */
export interface NavSection {
  label?: string;
  items: NavItem[];
}

export interface NavGroup {
  label: string;
  icon: typeof IconDashboard;
  sections: NavSection[];
}

/** Always-visible, ungrouped items shown above the collapsible groups. */
export const topLevelItems: NavItem[] = [
  { label: "Dashboard", path: ROUTES.dashboard, icon: IconDashboard },
  { label: "Nhân sự", path: ROUTES.employees, icon: IconUsers },
  // "Lịch của tôi" dùng chung route/quyền 'authenticated' như Cài đặt (mọi
  // vai trò đăng nhập đều truy cập được) — trước đây route đã đăng ký và
  // employee còn được điều hướng thẳng vào đây sau khi login, nhưng mục
  // sidebar bị thiếu nên rời trang là không còn cách quay lại.
  { label: "Lịch của tôi", path: ROUTES.calendar, icon: IconCalendar },
];

/** Always-visible, ungrouped items shown below the collapsible groups. */
export const bottomLevelItems: NavItem[] = [
  { label: "Audit logs", path: ROUTES.auditLogs, icon: IconFileAnalytics },
  { label: "Cài đặt", path: ROUTES.settings, icon: IconSettings },
];

export const navGroups: NavGroup[] = [
  {
    label: "Tổ chức",
    icon: IconBuildingBank,
    sections: [
      {
        items: [
          { label: "Lĩnh vực", path: ROUTES.businessSectors, icon: IconBuildingBank },
          { label: "Đơn vị", path: ROUTES.units, icon: IconBuildingBank },
          { label: "Phòng ban", path: ROUTES.departments, icon: IconSitemap },
          { label: "Chức danh", path: ROUTES.positions, icon: IconBriefcase },
        ],
      },
    ],
  },
  {
    label: "Quy trình nhân sự",
    icon: IconUsers,
    sections: [
      {
        items: [
          { label: "Điều chuyển", path: ROUTES.movements, icon: IconTransfer },
          { label: "Hợp đồng", path: ROUTES.contracts, icon: IconBriefcase },
          { label: "Nghỉ phép", path: ROUTES.leave, icon: IconCalendarCheck },
          {
            label: "Cấu hình duyệt phép",
            path: ROUTES.leaveApprovalAssignments,
            icon: IconUserCheck,
          },
          { label: "Onboarding", path: ROUTES.onboarding, icon: IconFolderOpen },
          { label: "Offboarding", path: ROUTES.offboarding, icon: IconFileImport },
        ],
      },
    ],
  },
  {
    label: "Chấm công & Ca làm việc",
    icon: IconClock,
    sections: [
      {
        label: "Chấm công",
        items: [
          { label: "Chấm công", path: ROUTES.attendance, icon: IconClipboardList },
          { label: "Xử lý mapping", path: ROUTES.attendanceMapping, icon: IconLink },
          { label: "Bảng công tháng", path: ROUTES.timesheetGrid, icon: IconTable },
          { label: "Kỳ công", path: ROUTES.timesheetPeriods, icon: IconCalendarStats },
        ],
      },
      {
        label: "Lịch làm việc",
        items: [
          { label: "Ca làm việc", path: ROUTES.workShifts, icon: IconClock },
          { label: "Ca tuần", path: ROUTES.weeklyShifts, icon: IconCalendarTime },
          { label: "Sắp ca tháng", path: ROUTES.monthlyTimesheetRoster, icon: IconCalendarTime },
          { label: "Ngày lễ", path: ROUTES.holidays, icon: IconCalendarCheck },
          { label: "Phân ca", path: ROUTES.shiftAssignments, icon: IconCalendarTime },
        ],
      },
    ],
  },
  {
    label: "Phân quyền",
    icon: IconShield,
    sections: [
      {
        label: "Người dùng và tài khoản",
        items: [
          { label: "Danh sách tài khoản", path: ROUTES.accounts, icon: IconUserCheck },
          { label: "Tài khoản chờ liên kết", path: ROUTES.pendingHrLinkAccounts, icon: IconLink },
        ],
      },
      {
        label: "Vai trò và quyền",
        items: [
          { label: "Vai trò", path: ROUTES.roles, icon: IconShield },
          { label: "Nhóm quyền", path: ROUTES.permissionGroups, icon: IconShield },
          { label: "Danh mục quyền", path: ROUTES.permissions, icon: IconKey },
        ],
      },
      {
        items: [
          {
            label: "Phân quyền báo cáo công việc",
            path: ROUTES.workReportAuthorizations,
            icon: IconClipboardList,
          },
        ],
      },
    ],
  },
];

export const routeTitles: Record<string, string> = {
  [ROUTES.dashboard]: "Dashboard",
  [ROUTES.calendar]: "Lịch của tôi",
  [ROUTES.employees]: "Nhân sự",
  [ROUTES.businessSectors]: "Lĩnh vực",
  [ROUTES.units]: "Đơn vị",
  [ROUTES.departments]: "Phòng ban",
  [ROUTES.positions]: "Chức danh",
  [ROUTES.movements]: "Điều chuyển",
  [ROUTES.contracts]: "Hợp đồng",
  [ROUTES.leave]: "Nghỉ phép",
  [ROUTES.leaveApprovalAssignments]: "Cấu hình duyệt phép",
  [ROUTES.attendance]: "Chấm công",
  [ROUTES.attendanceMapping]: "Xử lý mapping",
  [ROUTES.monthlyTimesheetRoster]: "Sắp ca tháng",
  [ROUTES.timesheetGrid]: "Bảng công tháng",
  [ROUTES.timesheetPeriods]: "Kỳ công",
  [ROUTES.workShifts]: "Ca làm việc",
  [ROUTES.weeklyShifts]: "Ca tuần",
  [ROUTES.holidays]: "Ngày lễ",
  [ROUTES.shiftAssignments]: "Phân ca",
  [ROUTES.onboarding]: "Onboarding",
  [ROUTES.offboarding]: "Offboarding",
  [ROUTES.imports]: "Imports",
  [ROUTES.auditLogs]: "Audit logs",
  [ROUTES.settings]: "Cài đặt",
  [ROUTES.accounts]: "Tài khoản",
  [ROUTES.pendingHrLinkAccounts]: "Tài khoản chờ liên kết nhân sự",
  [ROUTES.roles]: "Vai trò",
  [ROUTES.permissionGroups]: "Nhóm quyền",
  [ROUTES.permissions]: "Danh mục quyền",
  [ROUTES.workReportAuthorizations]: "Phân quyền báo cáo công việc",
};

export function isActive(pathname: string, path: string) {
  if (path === ROUTES.employees) {
    return pathname === path || pathname.startsWith("/employees/");
  }
  return pathname === path;
}

/** Keeps only items the user can access; drops sections/groups left empty. */
export function filterNavGroups(
  groups: NavGroup[],
  canAccess: (path: string) => boolean,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      sections: group.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => canAccess(item.path)),
        }))
        .filter((section) => section.items.length > 0),
    }))
    .filter((group) => group.sections.length > 0);
}
