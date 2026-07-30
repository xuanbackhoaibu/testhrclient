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
