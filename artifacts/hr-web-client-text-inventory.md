# HR web client text inventory

Generated: 2026-08-24T05:19:07.237Z
Files scanned: 284
Findings: 7

| File | Dòng | Text hiện tại | Text đề xuất | Loại lỗi | Trạng thái |
| --- | ---: | --- | --- | --- | --- |
| src/features/attendance/rowOrderDrop.ts | 4 | Ã  | Lưu lại chuỗi UTF-8 và dùng tiếng Việt có dấu. | Mojibake | Cần xử lý |
| src/features/attendance/shiftPayrollCatalog.ts | 10 | Ã" | Lưu lại chuỗi UTF-8 và dùng tiếng Việt có dấu. | Mojibake | Cần xử lý |
| src/features/attendance/shiftPayrollCatalog.ts | 10 | Ã" | Lưu lại chuỗi UTF-8 và dùng tiếng Việt có dấu. | Mojibake | Cần xử lý |
| src/features/attendance/shiftPayrollCatalog.ts | 141 | ÂN | Lưu lại chuỗi UTF-8 và dùng tiếng Việt có dấu. | Mojibake | Cần xử lý |
| src/features/attendance/timesheetDayPresentation.ts | 171 | Ã  | Lưu lại chuỗi UTF-8 và dùng tiếng Việt có dấu. | Mojibake | Cần xử lý |
| src/features/attendance/timesheetDayPresentation.ts | 171 | ÂN | Lưu lại chuỗi UTF-8 và dùng tiếng Việt có dấu. | Mojibake | Cần xử lý |
| src/pages/attendance/components/AttendanceSummaryChart.tsx | 188 | Detail | Dùng nhãn tiếng Việt theo ngữ cảnh. | Nhãn tiếng Anh | Cần xử lý |

Các mã quyền, enum API, route, URL và object key không nằm trong phạm vi thay thế tự động.
