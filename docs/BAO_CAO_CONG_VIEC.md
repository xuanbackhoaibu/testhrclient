# Báo cáo công việc: Cải thiện Dashboard & Đăng nhập (HRM)

**Người thực hiện:** Đỗ Công Ngọc Sơn
**Tính năng liên quan:** Trang Dashboard, Trang Đăng nhập

## 1. Việc tôi đã làm

- Sửa lỗi: user không phải Super Admin sau khi đăng nhập bị điều hướng vào Dashboard và
  gặp lỗi 403 do không có quyền xem. Nay chỉ Super Admin mới được vào Dashboard, các role
  khác sẽ tự động vào tính năng đầu tiên mà họ có quyền sử dụng.
- Thiết kế lại giao diện trang Đăng nhập: thêm phần giới thiệu, bọc form trong khối card
  rõ ràng hơn, đổi cách chọn role ở chế độ demo (mock) từ dạng nút bấm sang dropdown, thêm
  "Ghi nhớ đăng nhập" và "Quên mật khẩu".
- Thiết kế lại khung bao quanh trang đăng nhập (AuthLayout): từ 1 cột đơn giản thành 2
  cột, thêm banner giới thiệu sản phẩm bên trái.
- Thiết kế lại trang Dashboard: thêm banner chào mừng kèm 2 nút thao tác nhanh, gộp các
  chỉ số từ 8 thẻ nhỏ xuống còn 4 thẻ tổng hợp dễ đọc hơn, đổi cách hiển thị phân bổ nhân
  sự sang dạng thanh tiến trình (progress bar), thêm khối "Việc cần ưu tiên" ở cuối trang.
- Tạo thêm file CSS riêng cho Dashboard thay vì để style inline.

## 2. File đã sửa

- `src/features/auth/AuthorizationLanding.tsx`
- `src/layouts/AuthLayout.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/DashboardPage.css` (file mới)

## 3. Việc cần làm tiếp / cần lưu ý

- Cần đăng nhập thử với 1 tài khoản Super Admin và 1 tài khoản role khác để xác nhận:
  Super Admin vào được Dashboard, role khác không còn bị lỗi 403.
- Rà lại các chỗ khác trong code có điều hướng thẳng vào Dashboard sau đăng nhập để tránh
  còn sót trường hợp tương tự.

---

# Báo cáo công việc: Hoàn thiện giao diện Nghỉ phép / Hợp đồng / Onboarding / Offboarding / Audit logs (HRM)

**Người thực hiện:** Đỗ Công Ngọc Sơn
**Tính năng liên quan:** Trang Nghỉ phép, Trang Hợp đồng, Trang Onboarding, Trang Offboarding, Trang Audit logs, Sidebar (MainLayout)

## 1. Việc tôi đã làm

- 5 trang trên đã có sẵn route và logic gọi API/mock nhưng bị ẩn khỏi sidebar vì giao diện
  còn sơ sài (dùng Ant Design rời rạc, chưa đồng bộ style với Dashboard/Nhân sự). Đã nâng
  cấp toàn bộ UI của 5 trang này sang Mantine, tái sử dụng các component dùng chung sẵn có
  trong `shared/components`: `DataTable`, `PageHeader`, `StatusTag`, `ConfirmActionModal`,
  `NormalizedSearchInput`, `TableActionsMenu`.
- **Nghỉ phép:** chuẩn hoá bộ lọc (nhân viên, loại nghỉ, trạng thái), form tạo yêu cầu có
  validate ngày bắt đầu/kết thúc, các thao tác gửi duyệt/duyệt/từ chối/hủy đều xác nhận qua
  modal trước khi thực hiện.
- **Hợp đồng:** thêm badge cảnh báo hợp đồng sắp hết hạn (còn ≤30 ngày) và đã hết hạn ngay
  trên cột hiệu lực, giúp nhìn nhanh hợp đồng cần xử lý mà không phải mở từng dòng.
- **Onboarding / Offboarding:** thêm thanh tiến độ (progress bar) hiển thị % hoàn thành
  checklist theo từng đợt, tách rõ 2 tab "Đợt" và "Mẫu".
- **Audit logs:** bổ sung bộ lọc đầy đủ (loại đối tượng, entity ID, hành động, người thực
  hiện, khoảng thời gian) và đổi cách xem chi tiết log từ JSON thô sang bảng so sánh
  before/after, dòng nào thay đổi được tô nổi bật.
- **MainLayout (sidebar):** mở lại 5 mục trên trong menu chính (trước đó bị comment ẩn),
  bổ sung icon tương ứng.
- Đã chạy `npm run typecheck` và `npm run lint` cho toàn bộ file thay đổi, không còn lỗi.

## 2. File đã sửa

- `src/pages/leave/LeavePage.tsx`
- `src/pages/contracts/ContractsPage.tsx`
- `src/pages/onboarding/OnboardingPage.tsx`
- `src/pages/offboarding/OffboardingPage.tsx`
- `src/pages/audit/AuditLogsPage.tsx`
- `src/layouts/MainLayout.tsx`

## 3. Việc cần làm tiếp / cần lưu ý

- Cần test thủ công đầy đủ trên trình duyệt (mock mode `VITE_USE_MOCKS=true`) cho cả 5
  trang, đặc biệt kiểm tra lại trang Dashboard sau khi đổi `MainLayout.tsx` để chắc chắn
  không có cache/HMR cũ khiến sidebar hiển thị thiếu mục.
- Chưa chạy được `npm run build` đầy đủ trong môi trường hỗ trợ do thiếu package nội bộ
  `@hacom/chat-shared-types`; cần chạy lại `npm run build` trên máy có đủ dependency trước
  khi merge.
- Không thay đổi hợp đồng API/dữ liệu backend, chỉ thay đổi phần hiển thị UI và cách gọi
  các hàm/hook đã có sẵn.

