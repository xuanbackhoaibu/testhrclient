# Tổng hợp công việc đã thực hiện - Bactx

## 1. Chuẩn bị môi trường phát triển

- Clone repository `hr-web-client` về máy local.
- Clone thêm repository phụ `chat-shared-types` vì `hr-web-client` đang phụ thuộc package local `@hacom/chat-shared-types` qua `file:../chat-shared-types`.
- Cài dependencies cho `hr-web-client`.
- Cài dependencies và build `chat-shared-types` để `hr-web-client` resolve được shared types.
- Tạo file cấu hình local `.env.local` cho `hr-web-client` với mock mode:

```env
VITE_USE_MOCKS=true
```

- Chạy được app bằng Vite dev server tại:

```text
http://localhost:5173/
```

## 2. Thiết lập nhánh làm việc

- Kiểm tra repo `hr-web-client` đang ở nhánh `main`.
- Tạo và chuyển sang nhánh riêng:

```text
Bactx
```

- Cấu hình Git user name local của repo thành:

```text
Bactx
```

- Email Git local vẫn giữ:

```text
Bxuan964@gmail.com
```

- Các thay đổi đã được commit và push lên nhánh riêng `Bactx` trên GitHub.

Commit mới nhất trên nhánh:

```text
0b1a9dd Match login UI with Son branch
```

Các commit chính trên nhánh:

```text
c092454 feat: improve HRM UI workflows
e7d554e Update HR web client UI and attendance flows
0b1a9dd Match login UI with Son branch
```

Nhánh remote:

```text
origin/Bactx
```

## 3. Tìm hiểu cấu trúc dự án

Đã đọc và phân tích các phần chính của `hr-web-client`:

- `src/main.tsx`: entrypoint render React app.
- `src/app/providers.tsx`: cấu hình Mantine, notification, React Query và auth bootstrap.
- `src/app/App.tsx`: mount router.
- `src/app/router.tsx`: khai báo route public và route cần đăng nhập.
- `src/layouts/MainLayout.tsx`: layout chính, header, sidebar, menu theo quyền.
- `src/features/auth/ProtectedRoute.tsx`: guard đăng nhập và phân quyền.
- `src/features/auth/routePolicies.ts`: mapping route với permission.
- `src/features/auth/permissions.ts`: danh sách quyền HR và auth-admin.
- `src/shared/api/http-client.ts`: axios client, token, API envelope, xử lý lỗi.
- `src/pages/employees/EmployeesPage.tsx`: màn Nhân sự, là màn được chọn để nâng cấp đầu tiên.

Kết luận:

- Dự án đã có nhiều module HRM: nhân sự, tổ chức, chấm công, tài khoản, phân quyền, import/export, dashboard.
- Module nên ưu tiên nâng cấp trước là `EmployeesPage` vì đây là màn trung tâm của HRM.

## 4. Nghiên cứu UI HRM

Đã tham khảo pattern UI/UX của một số hệ thống HRM phổ biến:

- Zoho People
- BambooHR
- Odoo Employees/Attendances
- OrangeHRM

Các điểm rút ra:

- HRM tốt cần tối ưu thao tác lặp lại hằng ngày của HR.
- Màn danh sách nhân sự cần hỗ trợ tìm kiếm, lọc nhanh, thao tác hàng loạt, import/export và trạng thái dữ liệu rõ ràng.
- Dashboard hoặc phần tổng quan không nên chỉ hiển thị số liệu, mà nên chỉ ra các việc cần xử lý.
- UI HRM nên gọn, dễ scan, ít màu thừa và không giống landing page.

## 5. Các nâng cấp đã thực hiện trên EmployeesPage

File chính:

```text
src/pages/employees/EmployeesPage.tsx
```

### 5.1. Thêm quick filter theo tình huống HR hay xử lý

Đã thêm nhóm lọc nhanh cho danh sách nhân sự:

- `Tất cả`
- `Chưa có TK`
- `Thiếu mã CC`
- `Thử việc`
- `Thiếu hồ sơ`

Ý nghĩa:

- HR có thể lọc nhanh các nhóm nhân sự cần xử lý mà không phải tự kết hợp nhiều bộ lọc.
- Các quick filter hoạt động trên danh sách đã được lọc bởi search, trạng thái, đơn vị, phòng ban.
- Khi đổi quick filter, danh sách tự về trang 1.
- Khi đổi quick filter, các dòng đang chọn sẽ được bỏ chọn để tránh thao tác nhầm.

### 5.2. Cải thiện khu vực bộ lọc

Đã bọc bộ lọc danh sách vào panel riêng để giao diện rõ nhóm chức năng hơn.

Các phần trong panel:

- Search theo tên, email, số điện thoại.
- Lọc trạng thái nhân sự.
- Lọc đơn vị.
- Lọc phòng ban.
- Quick filter.
- Nút `Xóa lọc`.

Nút `Xóa lọc` sẽ reset:

- Search input.
- Trạng thái nhân sự.
- Đơn vị.
- Phòng ban.
- Quick filter.
- Dòng đang chọn.
- Page về 1.

### 5.3. Cải thiện thao tác chọn nhiều nhân sự

Trước đó nút cấp tài khoản hàng loạt nằm ở header khi có dòng được chọn.

Đã chuyển sang thanh thao tác riêng khi chọn dòng:

- Hiển thị số nhân sự đang chọn.
- Có nút `Cấp tài khoản`.
- Có nút `Bỏ chọn`.

Lý do:

- Header gọn hơn.
- Thao tác hàng loạt nằm gần ngữ cảnh chọn dòng hơn.
- Giảm cảm giác giao diện bị nhảy nút ở phần header.

### 5.4. Tự bỏ chọn khi đổi filter/search

Đã bổ sung xử lý bỏ chọn các dòng cũ khi người dùng thay đổi:

- Search.
- Trạng thái.
- Đơn vị.
- Phòng ban.
- Quick filter.

Lý do:

- Tránh trường hợp người dùng chọn nhân sự ở bộ lọc cũ nhưng lại thao tác sau khi danh sách đã đổi.
- Giúp thao tác hàng loạt an toàn hơn.

### 5.5. Cải thiện empty state

Đã đổi title empty state theo ngữ cảnh:

- Nếu chưa có filter: `Chưa có nhân sự`.
- Nếu đang có filter/search: `Không có nhân sự phù hợp`.

Lý do:

- Người dùng hiểu rõ là không có dữ liệu thật hay chỉ không khớp bộ lọc.

## 6. Lưu trạng thái màn Nhân sự vào URL

Đã nâng cấp `EmployeesPage` để trạng thái danh sách được đồng bộ vào URL query.

Các trạng thái được lưu:

- `search`
- `status`
- `unitId`
- `departmentId`
- `quick`
- `page`
- `pageSize`

Ví dụ URL sau khi lọc:

```text
/employees?search=an&status=ACTIVE&quick=missingAccount&page=2&pageSize=20
```

Lợi ích:

- Reload trang không mất bộ lọc.
- Copy link gửi người khác vẫn giữ đúng view hiện tại.
- Quay lại từ trang chi tiết nhân sự không mất ngữ cảnh danh sách.
- URL chỉ ghi những giá trị khác mặc định để gọn hơn.

Chi tiết kỹ thuật:

- Dùng `useSearchParams` từ `react-router-dom`.
- Parse query ban đầu để khởi tạo state.
- Đồng bộ lại URL khi search/filter/page/pageSize/quick filter thay đổi.
- Có parser an toàn cho page, pageSize và quick filter.
- Page được clamp khi số trang thay đổi, tránh hiển thị page không hợp lệ.

## 7. Cải thiện style giao diện

File style:

```text
src/styles.css
```

Đã cải thiện:

- Bảng dữ liệu có border, shadow nhẹ và hover row tinh tế hơn.
- Header bảng nhẹ hơn, dễ scan hơn.
- Dải tổng quan nhân sự có bố cục liền mạch.
- Panel bộ lọc có border/shadow nhẹ.
- Quick filter responsive, trên màn nhỏ có thể scroll ngang.
- Thanh chọn nhiều nhân sự có nền nhẹ và ít gây nhiễu.

Đã bỏ các thay đổi style quá rộng trước đó:

- Không giữ dark mode global.
- Không giữ design token global dư thừa.
- Không giữ print stylesheet dư thừa.
- Không thêm transition global cho toàn bộ element.

Mục tiêu sau khi tinh chỉnh:

- UI gọn hơn.
- Bớt giống giao diện tạo tự động.
- Ít chữ hơn.
- Phù hợp màn vận hành nội bộ của HR.

## 7.1. Làm đẹp layout tổng thể

Đã tinh chỉnh giao diện chung để app nhìn gọn và chuyên nghiệp hơn.

Thay đổi đã làm:

- Header chính có nền trắng, border và shadow nhẹ.
- Sidebar có nền tách biệt hơn với vùng nội dung.
- Menu active trong sidebar rõ hơn bằng màu nền và vạch nhấn bên trái.
- Nút tài khoản ở header có hover state gọn hơn.
- Page header được bọc thành khối trắng có border/shadow nhẹ để tách khỏi nội dung.
- Auth layout/login card có border và shadow nhẹ hơn.
- Card dùng chung có border/shadow đồng bộ hơn.
- Không thay đổi route, quyền, API/backend hoặc dữ liệu hiển thị.

## 8. Thêm sắp xếp bảng Nhân sự

Đã nâng cấp bảng Nhân sự để các cột chính có thể bấm để sắp xếp.

Các cột hỗ trợ sort:

- `Mã NS`
- `Mã chấm công`
- `Họ tên`

Hành vi:

- Mặc định vẫn sắp xếp theo `Mã chấm công` tăng dần như logic cũ.
- Bấm vào header một cột sẽ sắp xếp tăng dần theo cột đó.
- Bấm lại cùng cột sẽ đảo chiều tăng/giảm.
- Khi đổi sort, danh sách tự về trang 1.
- Khi đổi sort, các dòng đang chọn sẽ được bỏ chọn để tránh thao tác nhầm.
- Header đang sort có icon chỉ hướng tăng/giảm.

Sort cũng được lưu vào URL query:

```text
/employees?sort=fullName&dir=desc
```

URL chỉ ghi `sort` và `dir` khi khác mặc định, nên link vẫn gọn.

## 9. Thêm ẩn/hiện cột bảng Nhân sự

Đã thêm menu `Cột` trong khu vực bộ lọc danh sách.

Các cột có thể bật/tắt:

- `Mã chấm công`
- `Email`
- `SĐT`
- `TT nhân sự`
- `TT tài khoản`
- `Phòng ban`
- `Chức danh`
- `Tài khoản`

Các cột luôn giữ lại:

- `Mã NS`
- `Họ tên`
- Cột thao tác cuối dòng

Hành vi:

- Người dùng có thể chọn bảng gọn hoặc đầy đủ tùy nhu cầu.
- Cấu hình cột được lưu vào `localStorage`.
- Reload trang vẫn giữ cấu hình cột đã chọn.
- Có nút `Mặc định` để đưa cấu hình cột về trạng thái ban đầu.

Mục tiêu:

- Giảm độ rối của bảng khi HR chỉ cần xem một vài thông tin chính.
- Không làm thay đổi API/backend.
- Không thêm layout phức tạp hoặc text dư trên màn hình.

## 9.1. Cải thiện responsive màn Nhân sự

Đã tinh chỉnh responsive cho màn Nhân sự và khu vực bộ lọc.

Thay đổi đã làm:

- Nhóm nút thao tác ở header có thể xuống dòng gọn hơn trên màn nhỏ.
- Header của panel bộ lọc tự xếp dọc trên mobile để không chen vào tiêu đề.
- Nút `Cột` và `Xóa lọc` co giãn tốt hơn trên màn nhỏ.
- Quick filter có scroll ngang mượt hơn, tránh làm vỡ layout.
- Footer phân trang của bảng Nhân sự được chỉnh để select page size và pagination không tràn màn hình.
- Bảng Nhân sự dùng `maxHeight` để desktop có sticky header khi danh sách dài.
- Không thay đổi dữ liệu, API, sort, filter hay logic phân trang.

## 9.2. Tinh chỉnh form tạo/sửa nhân sự

Đã cải thiện form tạo/sửa nhân sự trong drawer của màn Nhân sự.

Thay đổi đã làm:

- Chia form thành các nhóm:
  - `Thông tin định danh`
  - `Thông tin cá nhân`
  - `Phân công hiện tại`
- Thêm alert tóm tắt lỗi ở đầu form khi dữ liệu nhập chưa hợp lệ.
- Sửa validate số điện thoại để khớp với UI đang đánh dấu bắt buộc.
- Thêm validate mã nhân sự: chỉ nhận chữ, số, dấu gạch ngang hoặc gạch dưới.
- Thêm validate mã chấm công BioTime/ZKTeco: chỉ nhận chữ, số, dấu gạch ngang hoặc gạch dưới.
- Thêm validate CCCD/CMND: chỉ nhận 9 hoặc 12 số nếu có nhập.
- Giữ placeholder ngắn cho email, số điện thoại, CCCD; không thêm mô tả dài trong form.
- Giữ nguyên API/backend và payload gửi lên server.

## 10. Bổ sung nút quay lại ở EmployeeDetailPage

Đã bổ sung thao tác quay lại trên trang chi tiết nhân sự:

File chính:

```text
src/pages/employees/EmployeeDetailPage.tsx
```

Thay đổi đã làm:

- Thêm nút `Quay lại` ở header trang.
- Giữ nguyên bố cục chi tiết nhân sự hiện có.
- Không thay đổi các tab hồ sơ, công việc, tài khoản, quyền truy cập, lịch sử.
- Không thay đổi logic sửa mã chấm công BioTime.

Mục tiêu:

- Người dùng có thể quay về danh sách trước đó nhanh hơn.
- Không thay đổi API/backend.
- Không thêm layout hoặc style không cần thiết vào trang chi tiết.

## 10.1. Tinh chỉnh bảng trong tab chi tiết nhân sự

Đã tinh chỉnh các bảng trong trang chi tiết nhân sự theo cùng ngôn ngữ UI với bảng Nhân sự.

Các bảng đã được chỉnh:

- `Phân công`
- `Hợp đồng`
- `Nghỉ phép`
- `Chấm công`
- `Nhật ký thao tác`

Thay đổi đã làm:

- Thêm wrapper scroll ngang cho bảng để không vỡ layout trên màn nhỏ.
- Đồng bộ style header, border, hover row và spacing với bảng danh sách Nhân sự.
- Empty state được chuyển thành vùng thông báo nhẹ, dễ nhìn hơn.
- Giữ nguyên dữ liệu, cột, tab và logic hiện có.
- Không thay đổi API/backend.

## 11. Cải thiện UI import Excel

Đã nâng cấp component import Excel dùng chung:

```text
src/features/import-export/ExcelImportModal.tsx
```

Thay đổi đã làm:

- Thêm khu vực quy trình 3 bước:
  - `Tải mẫu`
  - `Kiểm tra file`
  - `Xác nhận`
- Chuyển nút chọn file thành vùng kéo/thả file Excel rõ ràng hơn.
- Sau khi upload và preview thành công, ẩn vùng kéo/thả file để tập trung vào kết quả kiểm tra.
- Sau khi đã có preview, thêm nút `Chọn file khác` để reset kết quả hiện tại và mở lại vùng upload.
- Khi đóng modal hoặc import thành công, trạng thái preview được reset để lần mở sau không còn dữ liệu cũ.
- Giữ validate chỉ nhận file `.xlsx`.
- Giữ nguyên logic upload, preview, commit và tải file lỗi hiện có.
- Chuyển summary sau preview thành các card số liệu nhỏ, dễ nhìn hơn.
- Vẫn giữ các tab preview/lỗi/cảnh báo hiện có.
- Thêm số lượng lỗi/cảnh báo ngay trên tab `Lỗi` và `Cảnh báo`.
- Khi preview có lỗi, alert hiển thị nút `Tải file lỗi` ngay trong vùng cảnh báo.
- Nội dung alert sau preview được viết lại theo trạng thái:
  - Có lỗi cần xử lý.
  - Có cảnh báo cần kiểm tra.
  - Dữ liệu hợp lệ.
- Không thay đổi API/backend.

File style liên quan:

```text
src/styles.css
```

Mục tiêu:

- Import Excel nhìn giống một workflow rõ ràng hơn.
- Người dùng dễ hiểu đang ở bước tải mẫu, kiểm tra file hay xác nhận import.
- Preview/lỗi/cảnh báo dễ scan hơn nhưng không thêm logic phức tạp.

## 12. Những phần đã thử nhưng không giữ lại

Đã thử thêm cột `Hồ sơ` vào bảng nhân sự để hiển thị tình trạng thiếu dữ liệu từng dòng.

Sau khi xem lại, đã gỡ bỏ vì:

- Làm bảng nhiều chữ hơn.
- Tăng cảm giác rối.
- Không phù hợp yêu cầu UI gọn và bớt giống giao diện AI.

Hiện tại chỉ giữ quick filter trong khu vực bộ lọc để HR vẫn xử lý nhanh mà không làm bảng nặng thêm.

## 13. Cải thiện điều hướng sau đăng nhập

Đã sửa luồng đăng nhập để không mặc định đưa tất cả role vào dashboard.

Thay đổi đã làm:

- Super Admin đăng nhập xong sẽ đi thẳng vào `Dashboard`.
- Admin, HR, Ban lãnh đạo và các role khác sẽ đi vào màn đầu tiên mà tài khoản có quyền truy cập.
- Khi vào route `/`, hệ thống cũng dùng cùng logic điều hướng theo quyền.
- Nếu role không phải Super Admin truy cập trực tiếp `/dashboard`, màn hình trả về trạng thái `404`.
- Dashboard không còn hiện trong sidebar nếu tài khoản hiện tại không phải Super Admin.

File liên quan:

```text
src/features/auth/postLoginDestination.ts
src/features/auth/AuthorizationLanding.tsx
src/features/auth/ProtectedRoute.tsx
src/features/auth/routePolicies.ts
src/pages/AuthCallbackPage.tsx
src/pages/LoginPage.tsx
```

Mục tiêu:

- Super Admin vẫn có dashboard tổng quan.
- Các role vận hành HR không bị đưa vào màn dashboard không có quyền.
- Điều hướng sau đăng nhập nhất quán giữa mock login, real login và auth callback.

## 13.1. Kiểm tra role mock sau khi chỉnh đăng nhập

Đã rà lại các role mock chính sau khi chỉnh điều hướng đăng nhập.

Nguồn kiểm tra:

```text
src/shared/mocks/mockAuth.ts
src/features/auth/postLoginDestination.ts
src/features/auth/routePolicies.ts
src/layouts/MainLayout.tsx
```

Kết quả kiểm tra:

- `SUPER_ADMIN`
  - Role: `SUPER_ADMIN`.
  - Permission: `*`.
  - Sau đăng nhập đi vào `Dashboard`.
  - Sidebar có thể hiển thị `Dashboard`.
- `ADMIN`
  - Role: `ADMIN`.
  - Không có permission `hr.dashboard.read`.
  - Sau đăng nhập đi vào màn đầu tiên có quyền, hiện tại là `Nhân sự`.
  - Không hiển thị `Dashboard` trong sidebar.
  - Nếu truy cập trực tiếp `/dashboard`, màn trả về `404`.
- `HR`
  - Role: `HR`.
  - Không có permission `hr.dashboard.read`.
  - Sau đăng nhập đi vào `Nhân sự`.
  - Không hiển thị `Dashboard` trong sidebar.
  - Nếu truy cập trực tiếp `/dashboard`, màn trả về `404`.
- `BAN_LANH_DAO`
  - Role: `BAN_LANH_DAO`.
  - Chỉ có permission đọc nhân sự.
  - Sau đăng nhập đi vào `Nhân sự`.
  - Không hiển thị `Dashboard` trong sidebar.
  - Nếu truy cập trực tiếp `/dashboard`, màn trả về `404`.
- `BAN_LANH_DAO_DON_VI`
  - Role: `BAN_LANH_DAO_DON_VI`.
  - Có scope theo đơn vị/phòng ban và permission đọc nhân sự.
  - Sau đăng nhập đi vào `Nhân sự`.
  - Không hiển thị `Dashboard` trong sidebar.
  - Nếu truy cập trực tiếp `/dashboard`, màn trả về `404`.

Đã kiểm tra dev server đang chạy:

```text
http://127.0.0.1:5173/
```

Kết quả HTTP:

```text
HTTP/1.1 200 OK
```

## 13.2. Cập nhật giao diện đăng nhập theo nhánh Sơn

Đã cập nhật giao diện đăng nhập của nhánh `Bactx` theo thiết kế từ nhánh:

```text
sondcn/refactors/giao-dien-hrm
```

Các thay đổi đã làm:

- Thay layout đăng nhập cũ bằng layout 2 cột.
- Cột trái hiển thị slideshow hình ảnh dự án HACOM.
- Cột phải là card đăng nhập mới, gọn hơn và tập trung vào form.
- Thêm logo HACOM lớn trong card đăng nhập.
- Đổi phần chọn role mock từ segmented control sang card role có icon và mô tả.
- Thêm hiệu ứng vào form đăng nhập và slideshow.
- Bổ sung `prefers-reduced-motion` trong CSS để giảm animation khi hệ thống yêu cầu.

File liên quan:

```text
src/layouts/AuthLayout.tsx
src/layouts/AuthLayout.css
src/pages/LoginPage.tsx
src/pages/LoginPage.css
public/hacom-imperial-dalat.jpg
public/hacom-riverside.jpg
public/hacom-tower.jpg
public/hacom-wind.jpg
```

Commit đã push:

```text
0b1a9dd Match login UI with Son branch
```

## 13.3. Đưa phần chấm công và mapping về theo main

Sau khi thử lấy phần chấm công/mapping từ nhánh Sơn, đã điều chỉnh lại theo yêu cầu mới:

- Bỏ hướng lấy trực tiếp từ nhánh Sơn.
- Fetch `origin/main` mới nhất từ GitHub.
- Thay nhóm file chấm công/mapping bằng nội dung từ `origin/main`.
- Giữ nguyên các thay đổi đăng nhập đã commit trước đó.

Các điểm chính của bản `main` đang được áp vào `Bactx`:

- `attendanceApi.ts` không tự dựng dữ liệu chấm công/mapping từ mock local cho các API daily/sync/mapping.
- Trang chấm công và mapping dùng lại cấu trúc UI/filter của `main`.
- Có thêm helper search IME-safe và filter Select dùng chung từ `main`.

File liên quan:

```text
src/features/attendance/attendanceApi.ts
src/pages/attendance/AttendanceMappingPage.tsx
src/pages/attendance/AttendancePage.module.css
src/pages/attendance/AttendancePage.tsx
src/pages/attendance/components/AttendanceFilterBar.module.css
src/pages/attendance/components/AttendanceFilterBar.tsx
src/pages/attendance/components/BioTimeDepartmentsTable.tsx
src/shared/hooks/useImeSafeSearch.ts
src/shared/hooks/useImeSafeSelectFilter.ts
src/shared/utils/filterSelectOptions.ts
```

Trạng thái:

- Đã chạy `npm run build`: pass.
- Đã chạy `npm run lint`: pass.
- Các thay đổi này hiện chưa commit.

## 14. File đã thay đổi

Các file đã được thay đổi trên nhánh `Bactx`:

```text
public/hacom-imperial-dalat.jpg
public/hacom-riverside.jpg
public/hacom-tower.jpg
public/hacom-wind.jpg
src/features/import-export/ExcelImportModal.tsx
src/features/import-export/DomainExcelImportModal.tsx
src/features/import-export/HrmCoreExcelImportModal.tsx
src/shared/components/DataTable.tsx
src/features/auth/postLoginDestination.ts
src/features/auth/AuthorizationLanding.tsx
src/features/auth/ProtectedRoute.tsx
src/features/auth/routePolicies.ts
src/layouts/AuthLayout.css
src/layouts/AuthLayout.tsx
src/layouts/MainLayout.tsx
src/pages/AuthCallbackPage.tsx
src/pages/LoginPage.css
src/pages/LoginPage.tsx
src/pages/employees/EmployeesPage.tsx
src/pages/employees/EmployeeDetailPage.tsx
src/shared/components/PageHeader.tsx
src/styles.css
docs/HRM_UI_RESEARCH_Bactx.md
```

Các file chấm công/mapping đang được đưa về theo bản `origin/main` và hiện chưa commit:

```text
src/features/attendance/attendanceApi.ts
src/pages/attendance/AttendanceMappingPage.tsx
src/pages/attendance/AttendancePage.module.css
src/pages/attendance/AttendancePage.tsx
src/pages/attendance/components/AttendanceFilterBar.module.css
src/pages/attendance/components/AttendanceFilterBar.tsx
src/pages/attendance/components/BioTimeDepartmentsTable.tsx
src/shared/hooks/useImeSafeSearch.ts
src/shared/hooks/useImeSafeSelectFilter.ts
src/shared/utils/filterSelectOptions.ts
```

## 15. Kiểm tra đã thực hiện

Đã chạy:

```bash
npm run test:authorization
npm run lint
npm run build
```

Kết quả:

- `npm run test:authorization`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- Build vẫn có warning cũ của Vite về bundle lớn, không phát sinh từ lỗi code mới.

## 16. Trạng thái hiện tại

- Đang làm việc trên nhánh `Bactx`.
- Đã commit các thay đổi UI/HRM vào nhánh `Bactx`.
- Đã push nhánh `Bactx` lên GitHub.
- Nhánh local `Bactx` đang tracking remote `origin/Bactx`.
- Working tree hiện có thay đổi chưa commit ở nhóm chấm công/mapping vì đang đưa phần này về theo bản `origin/main`.
- Commit mới nhất:

```text
0b1a9dd Match login UI with Son branch
```

- Commit nâng cấp UI chính trước đó:

```text
c092454 feat: improve HRM UI workflows
```

- Link kiểm tra nhánh trên GitHub:

```text
https://github.com/hacom-holding-dx/hr-web-client/tree/Bactx
```

- Link tạo Pull Request:

```text
https://github.com/hacom-holding-dx/hr-web-client/pull/new/Bactx
```

- App chạy được tại:

```text
http://127.0.0.1:5173/
```

## 17. Hướng nâng cấp tiếp theo

Các hướng nên làm tiếp sau phần hiện tại:

1. Rà lại import Excel sau khi có backend thật để đồng bộ message lỗi/cảnh báo theo dữ liệu backend trả về.
2. Kiểm tra UI thực tế trên trình duyệt ở mobile/desktop trước khi tạo Pull Request.
3. Chuẩn bị mô tả Pull Request để gửi lead review nhánh `Bactx`.

Không ưu tiên nâng cấp dashboard trong phạm vi này vì phần dashboard/tổng quan đã có ở khu vực super admin.

Ưu tiên gần nhất nên là:

```text
Kiểm tra UI thực tế trên trình duyệt ở mobile/desktop.
```

## 18. Chuẩn hóa UI library và theme dùng chung

Thời gian ghi nhận:

```text
2026-08-11 18:38 +07
```

### 18.1. Phân định vai trò Ant Design và Mantine UI

Đã bắt đầu chuẩn hóa lại ranh giới sử dụng 2 thư viện UI:

- Ant Design giữ vai trò cho các component dữ liệu phức tạp như `Table`, `Descriptions`, các pattern dạng bảng/phân tích dữ liệu.
- Mantine UI dùng cho các component UX cơ bản như `Button`, `Input`, `Checkbox`, `Modal`, form controls, notification và các thao tác tương tác thường ngày.

Các điểm đã thay đổi:

- Chuyển một số `Button`, `Input`, `Checkbox`, `Alert` cơ bản từ AntD sang Mantine ở các vùng shared/import/auth.
- Giữ AntD `Result` ở các trang trạng thái lỗi/phân quyền vì đây là component hiển thị trạng thái tổng hợp, nhưng action button bên trong đã chuyển sang Mantine.
- Các màn CRUD lớn còn dùng AntD `Form/Input/Button` trực tiếp sẽ cần migration tiếp theo theo từng module để tránh phá logic form hiện tại.

### 18.2. Tạo wrapper component dùng chung

Đã tạo thư mục:

```text
src/shared/ui/
```

Các component đã thêm:

- `BaseTable`: bọc AntD `Table`, tích hợp skeleton loading khi API đang tải và chưa có dữ liệu.
- `BaseSelect`: bọc Mantine `Select`, bật searchable mặc định và thêm icon tìm kiếm.
- `BaseModal`: bọc Mantine `Modal`, chuẩn hóa title, radius, overlay và trạng thái centered.

File export chung:

```text
src/shared/ui/index.ts
```

Các bảng import Excel đã được chuyển sang dùng `BaseTable` để giảm import trực tiếp AntD `Table` rải rác.

### 18.3. Đồng bộ theme toàn app

Đã tạo file:

```text
src/app/theme.ts
```

Nội dung chính:

- Tạo bộ token chung `hrmThemeTokens`.
- Đồng bộ màu thương hiệu HACOM:

```text
#0b5ed7
```

- Đồng bộ radius mặc định:

```text
8px
```

- Đồng bộ font:

```text
Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

- Tạo `mantineTheme` cho `MantineProvider`.
- Tạo `antdTheme` cho AntD `ConfigProvider`.

Đã cập nhật:

```text
src/app/providers.tsx
```

App hiện được bọc theo thứ tự:

```text
ConfigProvider
MantineProvider
Notifications
QueryClientProvider
AuthBootstrap
```

### 18.4. Global style cho hai thư viện

Đã cập nhật:

```text
src/styles.css
```

Các điểm chính:

- Chuẩn hóa font weight của Mantine button và AntD button.
- Bỏ shadow mặc định của AntD button để gần với Mantine.
- Thêm active state `translateY(1px)` cho cảm giác bấm nhất quán.
- Thêm style skeleton cho `BaseTable`.

### 18.5. File đã thay đổi trong đợt này

```text
src/app/theme.ts
src/app/providers.tsx
src/shared/ui/BaseTable.tsx
src/shared/ui/BaseSelect.tsx
src/shared/ui/BaseModal.tsx
src/shared/ui/index.ts
src/styles.css
src/features/import-export/ImportExportToolbar.tsx
src/features/import-export/DomainExcelImportModal.tsx
src/features/import-export/HrmCoreExcelImportModal.tsx
src/features/auth/ProtectedRoute.tsx
src/features/auth/RequirePermission.tsx
src/pages/RouteErrorPage.tsx
```

### 18.6. Kiểm tra đã thực hiện

Đã chạy:

```bash
npm run typecheck
npm run lint
npm run build
```

Kết quả:

- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- Build còn warning bundle lớn của Vite, không chặn build và không phát sinh từ lỗi TypeScript/lint.

### 18.7. Trạng thái sau nâng cấp

- Web vẫn chạy được bằng Vite dev server tại:

```text
http://127.0.0.1:5173/
```

- Các thay đổi hiện chỉ nằm ở local theo yêu cầu tiếp tục phát triển web, chưa push lên GitHub mới.
- Hướng tiếp theo nên làm là migrate dần từng module legacy còn dùng AntD `Form/Input/Button` sang Mantine, ưu tiên các màn ít rủi ro trước khi chuyển các form CRUD lớn.

## 19. Sprint 2 - Nâng cấp trải nghiệm nhập liệu Form & Excel

Thời gian ghi nhận:

```text
2026-08-11 18:47 +07
```

### 19.1. Tích hợp Mantine Form + Zod

Đã thêm helper dùng chung:

```text
src/shared/forms/zodMantine.ts
```

Helper này gồm:

- `zodMantineValidate`: chuyển schema Zod thành validate function cho Mantine Form.
- `focusFirstFormError`: tự động scroll và focus vào field lỗi đầu tiên khi submit không hợp lệ.

### 19.2. Form Nhân sự

Đã nâng cấp:

```text
src/pages/employees/EmployeesPage.tsx
```

Thay đổi chính:

- Form tạo/sửa nhân sự dùng Zod schema thay cho validate object thủ công.
- Bật `validateInputOnChange` để báo lỗi realtime khi HR nhập sai email, số điện thoại, CCCD/CMND, mã nhân sự.
- Khi bấm lưu và còn lỗi, UI tự scroll/focus vào ô lỗi đầu tiên.
- Giữ logic nghiệp vụ hiện có như lấy mã nhân sự gợi ý, cập nhật mã chấm công BioTime, phân quyền tạo/sửa.

### 19.3. Form Hợp đồng

Đã rewrite:

```text
src/pages/contracts/ContractsPage.tsx
```

Thay đổi chính:

- Thay AntD Form/Input/Button bằng Mantine Form, Select, TextInput, Drawer, Modal, Button.
- Dùng Zod validate realtime các trường bắt buộc.
- Validate ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.
- Form kết thúc hợp đồng cũng dùng Mantine Form + Zod.
- Bảng danh sách hợp đồng chuyển sang `BaseTable` để đi qua wrapper AntD Table chuẩn hóa.

### 19.4. Form Đơn nghỉ và duyệt đơn

Đã rewrite:

```text
src/pages/leave/LeavePage.tsx
```

Thay đổi chính:

- Form tạo đơn nghỉ chuyển từ AntD Form sang Mantine Form + Zod.
- Validate realtime nhân sự, loại nghỉ, ngày bắt đầu/kết thúc, số ngày nghỉ và lý do.
- Validate ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.
- Các thao tác submit/approve/reject/cancel đi qua modal xác nhận dùng Mantine Form.
- Modal duyệt có ô ghi chú nội bộ để HR kiểm tra trước khi xác nhận thao tác.
- Bảng danh sách đơn nghỉ chuyển sang `BaseTable`.

### 19.5. Nâng cấp Import Excel

Đã cập nhật:

```text
src/features/import-export/ExcelImportModal.tsx
```

Thay đổi chính:

- Thêm bước client-side preflight trước khi gửi file lên server.
- Dùng `read-excel-file/browser` để parse file Excel ngay trên trình duyệt.
- Thêm progress bar trong lúc parse file để user biết web đang xử lý, tránh cảm giác bị đơ với file lớn.
- Sau khi parse, dữ liệu được đưa vào bảng preview editable.
- Highlight dòng lỗi bằng màu đỏ.
- Kiểm tra lỗi cơ bản ở client:
  - Ô dữ liệu bị bỏ trống.
  - Cột có tên giống ngày/date nhưng giá trị sai định dạng ngày.
- HR có thể sửa trực tiếp từng ô trên UI.
- Chỉ khi hết lỗi client-side mới cho bấm `Kiểm tra file`.
- Dùng `write-excel-file/browser` để tạo lại file Excel đã chỉnh, rồi mới gửi file đã sửa sang API preview hiện có.
- Import `read-excel-file` và `write-excel-file` bằng dynamic import để không kéo thư viện Excel vào bundle chính.

Style bổ sung:

```text
src/styles.css
```

- Thêm class `excel-import-row-error` để tô nền đỏ nhạt cho dòng preview có lỗi.

### 19.6. Kiểm tra đã thực hiện

Đã chạy:

```bash
npm run typecheck
npm run lint
npm run build
```

Kết quả:

- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- Build còn warning bundle lớn chung của Vite, không chặn build.
- Warning import tĩnh `write-excel-file` đã được xử lý bằng dynamic import.

### 19.7. Trạng thái sau Sprint 2

- Các nâng cấp Sprint 2 đang ở local, chưa push GitHub mới.
- Web dev server vẫn có thể chạy tại:

```text
http://127.0.0.1:5173/
```

- Hướng tiếp theo nên làm:
  - Kiểm tra thực tế flow import Excel với file mẫu lớn.
  - Bổ sung rule preflight theo từng template cụ thể, ví dụ mã nhân viên bắt buộc, email đúng định dạng, ngày vào làm bắt buộc.
  - Tiếp tục migrate các form CRUD legacy còn lại sang Mantine Form + Zod.

## 20. Nâng cấp Dashboard - Data Visualization & Actionable Widgets

Thời gian ghi nhận:

```text
2026-08-11 19:40 +07
```

### 20.1. Trực quan hóa dữ liệu

Đã nâng cấp:

```text
src/pages/DashboardPage.tsx
src/pages/DashboardPage.module.css
```

Thay đổi chính:

- Thay danh sách text "Nhân sự theo đơn vị" bằng Donut Chart.
- Thay danh sách text "Nhân sự theo trạng thái" bằng Donut Chart.
- Sau phản hồi UI, đã đổi "Nhân sự theo trạng thái" từ Donut Chart sang biểu đồ cột dọc để Dashboard không bị lặp hai biểu đồ tròn.
- Ở giữa Donut Chart hiển thị tổng số nhân sự/hồ sơ.
- Thêm legend có số lượng và tỷ lệ phần trăm.
- Tooltip khi hover từng phần hiển thị tên nhóm, số lượng và tỷ lệ.
- Click lát biểu đồ điều hướng sang danh sách nhân sự với query tương ứng.
- Thay bảng "Nhân sự đi muộn nhiều nhất" bằng Horizontal Bar Chart.
- Cột đi muộn chuyển màu đỏ khi vượt ngưỡng cảnh báo.
- Thêm Stacked Bar Chart cho chuyên cần theo phòng ban, gồm ngày đi làm và ngày vắng/nghỉ.
- Thêm sparkline nhỏ trên KPI tuyển mới và nghỉ việc để tạo cảm giác theo dõi xu hướng.

### 20.2. Bố cục và kiến trúc thông tin

Dashboard mới được chia theo 3 tầng:

- Hàng 1: KPI Cards gồm Tổng nhân sự, Đang làm việc, Đơn chờ duyệt, Tuyển mới, Nghỉ việc.
- Hàng 2: Chart phân tích gồm cơ cấu nhân sự và chuyên cần.
- Hàng 3: Widget hành động gồm Công việc cần làm, Cảnh báo nhân sự và Bàn giao lương.

Chi tiết UI:

- KPI card có icon, màu nền nhẹ và mô tả ngắn.
- Đã thiết kế lại KPI Cards theo kiểu executive summary:
  - Tổng nhân sự hiển thị phạm vi dữ liệu theo bộ lọc.
  - Đang làm việc có progress bar tỷ lệ active.
  - Đơn chờ duyệt có breakdown Nghỉ/Công/Điều chuyển.
  - Tuyển mới và Nghỉ việc bỏ sparkline mô phỏng để tránh hiểu nhầm dữ liệu xu hướng giả.
- Chart nằm trong Paper có border rõ ràng.
- Layout responsive: trên desktop chia cột, mobile tự xếp dọc.

### 20.3. Tương tác và bộ lọc

Đã thêm:

- Bộ lọc thời gian bằng `SegmentedControl`:
  - Tháng này
  - Quý này
  - Năm nay
  - Tùy chỉnh
- Tùy chỉnh thời gian có 2 input ngày.
- Bộ lọc theo đơn vị bằng `MultiSelect`.
- Nút reload dữ liệu Dashboard.
- Drill-down từ chart sang trang nhân sự.

Ghi chú:

- `useDashboardSummary` đã nhận tham số `period` và đưa vào query key/API params để gọi lại `/dashboard/summary`.
- Bộ lọc đơn vị vẫn đang áp dụng trực quan ở UI với dữ liệu đã có vì payload chart hiện chưa có id đơn vị đầy đủ.

### 20.4. Widget hành động

Đã thêm:

- Widget `Công việc cần làm` hiển thị các hàng chờ xử lý như đơn nghỉ, giải trình công, điều chuyển.
- Mỗi dòng có nút mở nhanh sang module tương ứng.
- Widget `Cảnh báo nhân sự` hiển thị thử việc, cảnh báo phép và hợp đồng.
- Nhóm Quick Actions trên PageHeader:
  - Thêm nhân viên
  - Tạo đơn nghỉ
  - Import Excel

### 20.5. UI polish và state

Đã thêm:

- Skeleton loading mô phỏng đúng bố cục KPI/chart/widget thay vì spinner đơn giản.
- Empty state có SVG illustration nhỏ cho trường hợp không có dữ liệu đi muộn hoặc không có dữ liệu chart.
- Dark mode styles cho card, chart, legend, bar và widget.
- Tooltip thân thiện, format số theo `vi-VN`.
- Chart tự viết bằng SVG/CSS, không thêm thư viện chart mới.
- Palette biểu đồ đã đổi sang hệ màu đơn giản, dễ nhìn hơn:
  - Blue, emerald, amber, rose, violet, cyan và slate.
  - Cột cảnh báo vẫn dùng đỏ nhưng dịu hơn.
  - Chart panel, donut segment, bar và stacked bar có hover/transition để khi lướt tới nhìn có phản hồi mềm.
  - Có hỗ trợ `prefers-reduced-motion` để giảm animation nếu người dùng tắt chuyển động.

### 20.6. Export báo cáo

Đã thêm nút:

```text
Xuất báo cáo
```

Chức năng:

- Tải Dashboard hiện tại thành file PNG bằng cơ chế SVG `foreignObject` + Canvas.
- Có thêm lựa chọn In / lưu PDF bằng `window.print()`.

### 20.7. Kiểm tra đã thực hiện

Đã chạy:

```bash
npm run typecheck
npm run lint
npm run build
```

Kết quả:

- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- Build còn warning bundle lớn chung của Vite, không chặn build.

### 20.8. Trạng thái sau nâng cấp Dashboard

- Thay đổi đang nằm ở local trên nhánh `Bactx`.
- Chưa push GitHub sau nâng cấp Dashboard.
- Web dev server vẫn đang chạy tại:

```text
http://127.0.0.1:5173/
```

### 20.9. Bổ sung micro-interaction, responsive và a11y cho Dashboard

Đã nâng cấp:

- Donut chart có transition `stroke-dasharray` để lát biểu đồ vào mượt hơn khi dữ liệu render.
- Bar chart ngang và cột dọc có transition theo `width`/`height`, giữ hiệu ứng hover mềm.
- Track nền của donut, bar và stacked bar đã chuyển sang CSS variable của Mantine:
  - Light mode: `var(--mantine-color-gray-1)`
  - Dark mode: `var(--mantine-color-dark-5)`
- Donut chart trên mobile dưới `768px` chuyển layout thành cột, legend rớt xuống dưới biểu đồ để tránh tràn lề.
- Lát donut có `tabIndex`, `role="button"`, `aria-label` và hỗ trợ phím `Enter`/`Space` để click bằng bàn phím.
- Widget `Nhân sự đi muộn nhiều nhất` có nút `Xem tất cả`, dẫn sang trang chấm công để HR xem danh sách đầy đủ thay vì chỉ 8 dòng preview.

### 20.10. Kết nối filter thời gian và skeleton theo từng chart

Đã nâng cấp:

- Đưa `SegmentedControl` thời gian lên góc phải `PageHeader` với 3 lựa chọn:
  - Tháng này
  - Quý này
  - Năm nay
- Truyền `period` vào `useDashboardSummary({ period })`, query key tách theo từng khoảng thời gian.
- API `/dashboard/summary` nhận query params để backend trả số liệu đúng kỳ.
- Donut chart khi click lát cắt sẽ điều hướng sang danh sách nhân sự với URL params `dashboardSlice=unit` và `search=<tên đơn vị>`.
- Bar trạng thái nhân sự điều hướng với URL params `dashboardSlice=employmentStatus` và `status=<trạng thái>`.
- Thêm `ChartSkeleton` dùng `styles.chartPanel` và Mantine `Skeleton` để giả lập layout chart khi dashboard đang tải.
