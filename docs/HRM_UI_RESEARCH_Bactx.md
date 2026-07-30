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

- Các thay đổi hiện tại chỉ nằm local, chưa commit và chưa push lên Git.

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
http://127.0.0.1:5176/
```

Kết quả HTTP:

```text
HTTP/1.1 200 OK
```

## 14. File đã thay đổi

Các file hiện đang thay đổi:

```text
src/features/import-export/ExcelImportModal.tsx
src/features/import-export/DomainExcelImportModal.tsx
src/features/import-export/HrmCoreExcelImportModal.tsx
src/shared/components/DataTable.tsx
src/features/auth/postLoginDestination.ts
src/features/auth/AuthorizationLanding.tsx
src/features/auth/ProtectedRoute.tsx
src/features/auth/routePolicies.ts
src/pages/AuthCallbackPage.tsx
src/pages/LoginPage.tsx
src/pages/employees/EmployeesPage.tsx
src/pages/employees/EmployeeDetailPage.tsx
src/styles.css
docs/HRM_UI_RESEARCH_Bactx.md
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
- Các thay đổi vẫn ở local.
- Chưa commit.
- Chưa push lên GitHub.
- App chạy được tại:

```text
http://127.0.0.1:5176/
```

## 17. Hướng nâng cấp tiếp theo

Các hướng nên làm tiếp sau phần hiện tại:

1. Rà lại import Excel sau khi có backend thật để đồng bộ message lỗi/cảnh báo theo dữ liệu backend trả về.
2. Kiểm tra UI thực tế trên trình duyệt ở mobile/desktop trước khi commit.
3. Chuẩn bị commit nội bộ trên nhánh `Bactx` sau khi tự kiểm tra đủ các role.

Không ưu tiên nâng cấp dashboard trong phạm vi này vì phần dashboard/tổng quan đã có ở khu vực super admin.

Ưu tiên gần nhất nên là:

```text
Kiểm tra UI thực tế trên trình duyệt ở mobile/desktop.
```
