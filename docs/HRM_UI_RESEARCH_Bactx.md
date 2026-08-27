# TỔNG HỢP & BÁO CÁO NÂNG CẤP GIAO DIỆN HỆ THỐNG HRM

> **Người thực hiện:** Bactx (`Bxuan964@gmail.com`)  
> **Nhánh phát triển:** `Bactx` — Dự án `hr-web-client`  
> **Phạm vi hoàn thiện:** Tập trung tái cấu trúc và chuẩn hóa giao diện (UI/UX) cho **6 phân hệ và cấu trúc giao diện cốt lõi** trên nền tảng Mantine UI và định hướng Zalo Web Flat UI, giải quyết trực tiếp các bài toán thao tác hàng ngày của chuyên viên nhân sự (HR).

---

## I. TỔNG QUAN CÁC TRANG ĐÃ HOÀN THIỆN NÂNG CẤP

| STT | Trang / Phân hệ | Tệp nguồn chính (Source File) | Trọng tâm cải tiến UI / UX |
|:---:|---|---|---|
| **1** | **Bảng điều khiển Quản trị (Dashboard)** | `src/pages/DashboardPage.tsx` | Tinh gọn bố cục, thanh Quick Access theo Đơn vị thành viên, dải 5 KPI điều hành, biểu đồ tròn phân bổ nhân sự, biểu đồ cột trạng thái, hàng chờ duyệt yêu cầu & nhắc việc bàn giao lương. |
| **2** | **Quản lý Danh sách Nhân sự (Employees)** | `src/pages/employees/EmployeesPage.tsx` | Bộ lọc đa chiều (tìm kiếm chuẩn hóa an toàn IME, lọc theo đơn vị, phòng ban, trạng thái nhân sự), tùy biến ẩn/hiện cột, sắp xếp theo mã BioTime tăng dần, thanh thao tác hàng loạt (Bulk action bar), Drawer thêm/sửa nhân sự tự sinh mã. |
| **3** | **Hồ sơ Chi tiết Nhân sự (Employee Detail 360°)** | `src/pages/employees/EmployeeDetailPage.tsx` | Hero Header 360° tổng quan, hệ thống 8 tabs nghiệp vụ chuyên sâu, mini lịch chấm công tháng, thẻ tiến độ quỹ phép năm (quota), chỉnh sửa nhanh qua Drawer, ẩn/hiện & copy an toàn CCCD/SĐT, cập nhật mã BioTime inline. |
| **4** | **Trung tâm Cài đặt Hệ thống (Settings Center)** | `src/pages/settings/SettingsPage.tsx` | Cửa sổ cài đặt Modal 2 cột phong cách Zalo Web, lựa chọn theme Sáng/Tối/Tự động có card preview mô phỏng, bộ chọn cỡ chữ linh hoạt, đa ngôn ngữ (i18n), cấu hình ma trận thông báo, hiển thị thông tin phiên tài khoản & runtime. |
| **5** | **Điều chuyển Công tác (Movements)** | `src/pages/movements/MovementsPage.tsx` | Giao diện phẳng tinh gọn chuẩn Zalo Web, bộ lọc 3 trường (Nhân viên, Loại, Trạng thái), cột Thao tác hiển thị duy nhất nút "Chi tiết" chống lộn xộn, Drawer tạo quyết định trực quan (tự động xử lý Đơn vị/Phòng ban/Chức danh đích không cần JSON thô), Modal xét duyệt hồ sơ tích hợp các nút hành động (Gửi duyệt, Duyệt, Từ chối, Hủy). |
| **6** | **Bố cục Toàn hệ thống & Sidebar Full-Height** | `src/layouts/MainLayout.tsx` | Thanh bên chạy dài hết chiều cao (`100vh`), nút thu gọn/mở rộng Gemini toggle button, chế độ thu nhỏ Compact Icon Rail (64px) giữ icon module + popover menu con khi hover, loại bỏ tiêu đề trùng lặp trên PageHeader và ghim thanh thao tác góc trên bên phải. |

---

## II. CHI TIẾT CẢI TIẾN TRÊN TỪNG TRANG NGHIỆP VỤ

### 1. Bảng điều khiển Quản trị (`DashboardPage.tsx`)
- **Header & Thanh Lối tắt Tích hợp (Quick Access Bar):**
  - Tinh giản các nút bấm thừa trên header, tập trung vào bộ lọc đơn vị thành viên theo thời gian thực.
  - Cho phép lãnh đạo/HR nắm bắt nhanh số liệu của từng công ty con hoặc toàn tập đoàn chỉ với 1 click.
- **Băng 5 Chỉ số Điều hành Cốt lõi (KPI Strip):**
  - Hiển thị trực quan 5 chỉ số quan trọng nhất: *Tổng nhân sự*, *Đi làm hôm nay*, *Đi muộn / Về sớm*, *Nghỉ phép hôm nay*, *Đơn chờ duyệt*.
  - Thiết kế số liệu dạng thẻ phẳng, dễ quét mắt (scannable), phân biệt rõ ràng bằng màu sắc trạng thái.
- **Trực quan hóa Dữ liệu (Data Visualization):**
  - **Biểu đồ Tròn (Vector Donut Chart):** Phân bổ cơ cấu nhân sự theo từng Đơn vị/Khối kinh doanh với chú giải rõ ràng.
  - **Biểu đồ Cột (Column Chart):** Theo dõi tỷ lệ nhân sự theo trạng thái làm việc (*Chính thức*, *Thử việc*, *Đã nghỉ việc*).
- **Hàng chờ Hành động & Nhắc việc (Actionable Widgets):**
  - Thẻ *Hàng chờ xử lý yêu cầu:* Tổng hợp nhanh các đơn từ cần phê duyệt (nghỉ phép, điều chuyển, cấp tài khoản).
  - Thẻ *Chuẩn bị bàn giao lương:* Cảnh báo tiến độ chốt công và chuẩn bị dữ liệu tính lương kỳ hiện tại.
  - Bảng *Nhân sự đi muộn cần lưu ý:* Danh sách nhân sự đi muộn nhiều lần trong tháng để HR có phương án hỗ trợ.
- **Đồng bộ Nền tối (Dark Mode) & Làm mới:**
  - Hỗ trợ Dark Mode chuẩn Mantine, độ tương phản cao, êm dịu cho mắt.
  - Tích hợp nút làm mới dữ liệu và hiển thị thời gian đồng bộ hệ thống.

---

### 2. Quản lý Danh sách Nhân sự (`EmployeesPage.tsx`)
- **Bộ lọc Đa chiều & Tìm kiếm Chuẩn hóa (Multi-Criteria Filters):**
  - Tìm kiếm an toàn với bộ gõ tiếng Việt IME (`NormalizedSearchInput`) theo mã nhân sự, họ tên, email công ty, số điện thoại.
  - Lọc theo *Trạng thái nhân sự* (Đang làm việc, Thử việc, Tạm dừng, Nghỉ việc).
  - Lọc theo *Đơn vị* và *Phòng ban* trực thuộc (tự động load danh sách phòng ban tương ứng khi chọn đơn vị).
  - Tùy chọn **Ẩn / Hiện cột hiển thị** linh hoạt (Mã chấm công, Email, SĐT, TT nhân sự, TT tài khoản, Phòng ban, Chức danh, Hành động tài khoản).
  - Tự động **Sắp xếp tăng dần theo Mã chấm công BioTime** (`sortByCode`) giúp HR đối soát dễ dàng với máy chấm công vật lý.
- **Thanh Thao tác Hàng loạt (Bulk Action Bar):**
  - Tự động xuất hiện khi tick chọn 1 hoặc nhiều nhân sự:
    - *Cấp tài khoản đăng nhập hàng loạt* (`BulkProvisionModal`).
    - *Hủy / Xóa mã chấm công hàng loạt* cho các nhân sự đã chọn.
    - *Xuất dữ liệu Excel* theo danh sách nhân sự đã chọn.
  - Tự động bỏ chọn khi thay đổi từ khóa tìm kiếm hoặc đổi bộ lọc để ngăn ngừa thao tác nhầm.
- **Drawer Thao tác Hồ sơ Nhân sự:**
  - Drawer trượt thêm mới / cập nhật hồ sơ với cơ chế tự động gợi ý mã nhân sự tiếp theo (`getNextEmployeeCode`) theo đơn vị đã chọn.
  - Hỗ trợ nhập và cập nhật đồng bộ mã máy chấm công BioTime trực tiếp trên form.
- **Lưu trạng thái vào URL:** Tự động đồng bộ từ khóa, bộ lọc và phân trang vào URL params để giữ nguyên trạng thái khi tải lại trang hoặc chia sẻ link.

---

### 3. Hồ sơ Chi tiết Nhân sự 360° (`EmployeeDetailPage.tsx`)
- **Hero Header Tổng quan:**
  - Hiển thị Avatar, trạng thái làm việc (Active, Probation, Terminated), trạng thái tài khoản (Đã liên kết / Chưa cấp).
  - Mã nhân sự, Họ tên, Chức danh, Phòng ban, Đơn vị.
  - Nhóm nút thao tác nhanh: *Sửa hồ sơ* (mở Drawer), *Gửi email*, *Xem bảng công*.
- **Hệ thống 8 Tabs Nghiệp vụ Chuyên sâu:**
  1. **Thông tin cá nhân:** Xem thông tin cá nhân; hỗ trợ ẩn/hiện và copy an toàn CCCD, SĐT; sửa trực tiếp mã chấm công BioTime inline.
  2. **Phân công:** Đơn vị, phòng ban, chức danh, Job title, người quản lý và Timeline lịch sử phân công công việc.
  3. **Hợp đồng:** Danh sách hợp đồng, thời hạn hiệu lực, gắn badge cảnh báo hợp đồng sắp hết hạn (*còn dưới 15 ngày, 30 ngày*), nút gia hạn nhanh.
  4. **Chấm công:** Thẻ thống kê tổng công / đi muộn / nghỉ phép cùng **Mini calendar chấm công tháng** trực quan theo mã màu.
  5. **Nghỉ phép:** Thẻ tiến độ quỹ phép năm (Quota Progress Bar) tính toán số ngày đã dùng/còn lại và bảng đơn nghỉ gần nhất.
  6. **Điều chuyển:** Timeline theo dõi lịch sử điều chuyển công tác, thay đổi vị trí, phòng ban.
  7. **Tài khoản & Phân quyền:** Tích hợp `AccountTab` và `AccessTab` cho phép tạo tài khoản, đổi mật khẩu, xem vai trò và quyền hạn chi tiết.
  8. **Lịch sử thay đổi (Audit):** Timeline ghi nhận nhật ký cập nhật hồ sơ với chi tiết thay đổi từng trường dữ liệu.

---

### 4. Trung tâm Cài đặt Hệ thống (`SettingsPage.tsx`)
- **Kiến trúc Cửa sổ Modal 2 Cột Phong cách Zalo Web:**
  - Cột trái: Menu danh mục cài đặt phân nhóm khoa học.
  - Cột phải: Khung nội dung cấu hình chi tiết có nút đóng quay lại.
- **Các Module Cấu hình Chi tiết:**
  - **Giao diện (Appearance):**
    - Lựa chọn Theme *Sáng / Tối / Tự động* với card mô phỏng giao diện mẫu (bong bóng chat, avatar minh họa).
    - Bộ chọn *Cỡ chữ* (Nhỏ / Vừa / Lớn) áp dụng tức thì toàn hệ thống.
  - **Ngôn ngữ (i18n):** Chuyển đổi linh hoạt giữa *Tiếng Việt*, *English* và *Theo hệ thống trình duyệt*.
  - **Tài khoản & Bảo mật (Account & Security):** Hiển thị thẻ thông tin user hiện tại, Auth user ID, vai trò, phạm vi dữ liệu (data scopes).
  - **Quản lý dữ liệu (Data & Runtime):** Xem thông số môi trường hệ thống, API endpoint, Auth service base URL, Mock mode.
  - **Thông báo (Notifications):** Bật/tắt âm thanh và cấu hình ma trận nhận thông báo theo từng loại sự kiện HRM.

---

### 5. Điều chuyển Công tác (`MovementsPage.tsx`)
- **Bảng Dữ liệu Tinh gọn & Phẳng:**
  - Giữ cấu trúc các cột chuẩn nghiệp vụ: `NHÂN VIÊN`, `LOẠI`, `NGÀY HIỆU LỰC`, `LÝ DO`, `TRẠNG THÁI`, `THAO TÁC`.
  - Hiển thị văn bản sạch sẽ, không dùng avatar/hình tròn và màu chữ rườm rà tại cột Loại.
  - Cột **THAO TÁC** hiển thị duy nhất nút bấm `Chi tiết` (`size="xs"`, `variant="light"`), giữ hàng dữ liệu luôn ngay ngắn trên 1 dòng, loại bỏ tình trạng nhiều nút bấm chen chúc gây lộn xộn.
- **Bộ lọc 3 Tiêu chí Chuẩn mực:**
  - Lọc theo *Nhân viên* (tìm kiếm nhanh theo tên/mã).
  - Lọc theo *Loại điều chuyển* (`TRANSFER`, `PROMOTION`, `STATUS_CHANGE`, `TERMINATION`).
  - Lọc theo *Trạng thái phê duyệt* (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`).
- **Drawer Tạo mới Điều chuyển Thông minh:**
  - Form chọn *Đơn vị đích*, *Phòng ban đích*, *Chức danh đích* thông qua dropdown liên kết dữ liệu tự động.
  - Hệ thống tự động đóng gói `afterJson` gửi lên API backend, HR hoàn toàn không phải gõ mã JSON thô.
- **Modal Chi tiết & Xét duyệt Hồ sơ:**
  - Bố cục 2 khối so sánh rõ ràng: *Thông tin nhân sự* và *Đích đến sau điều chuyển* kèm lý do.
  - Tích hợp các nút xét duyệt theo đúng phân quyền và trạng thái đơn: *Gửi duyệt* (nếu Nháp), *Duyệt* / *Từ chối* (nếu Đang trình duyệt), *Hủy quyết định* và nút *Đóng*.

---

### 6. Khung Bố cục Toàn hệ thống & Thanh Điều hướng Trái (`MainLayout.tsx`)
- **Bố cục Thanh bên Toàn chiều cao (Full-Height Sidebar Layout):**
  - Cấu hình `layout="alt"` trên nền Mantine AppShell, giúp thanh bên (Navbar) chạy suốt chiều cao viewport (`100vh`) từ đỉnh đến đáy màn hình, tách biệt với Header chính như phong cách Zalo Web / Google Workspace.
  - Tích hợp Logo thương hiệu HACOM compact ngay trên đỉnh thanh bên.
- **Nút Thu gọn / Mở rộng Thanh bên Phong cách Google Gemini (`gemini-sidebar-toggle-btn`):**
  - Đặt nút bấm dạng icon `IconLayoutSidebarLeftCollapse` ngay cạnh Logo HACOM.
  - Khi rê chuột vào nút, hiển thị Tooltip *"Đóng thanh bên"* mượt mà (`openDelay={200}`).
- **Chế độ Thanh bên Thu nhỏ (Compact Icon Rail — Mini Sidebar 64px):**
  - Khi đóng thanh bên, hệ thống không ẩn biến mất mà tự động chuyển sang chế độ **Icon Rail 64px** tinh gọn.
  - Hiển thị đầy đủ icon nhận diện của tất cả các phân hệ nghiệp vụ (*Dashboard, Nhân sự, Tổ chức, Phân quyền, Chấm công, v.v.*) kèm Tooltip tên module khi hover.
  - Các nhóm menu đa cấp (*Tổ chức, Phân quyền, Chấm công & Ca*) tự động chuyển sang dạng **Floating Popover Menu** (`position="right-start"`), giúp người dùng truy cập ngay vào menu con chỉ bằng 1 thao tác di chuột mà không cần mở rộng thanh bên.
  - Đặt nút mở rộng `IconLayoutSidebarLeftExpand` phong cách Gemini cùng biểu tượng HACOM trên đỉnh thanh mini sidebar với Tooltip *"Mở rộng thanh bên"*.
- **Chuẩn hóa Header Trang & Loại bỏ Trùng lặp Tiêu đề (`PageHeader.tsx`):**
  - Loại bỏ thẻ tiêu đề lớn (`Title order={2}`) trong nội dung trang vì thanh Header trên cùng (`AppShell.Header`) đã hiển thị tên trang chữ to nổi bật.
  - Tiêu đề phụ (subtitle) được chuẩn hóa thành văn bản nhỏ tinh tế (`size="xs"`, `c="dimmed"`), mang lại không gian làm việc rộng rãi, hiện đại.
  - Ví dụ trang Nhân sự: Hiển thị dòng mô tả nhỏ gọn *"Quản lý hồ sơ nhân sự, trạng thái làm việc và phân công hiện tại."*.
- **Ghim Thanh Công cụ Hành động lên Góc Trên Bên Phải (Top-Right Action Toolbar):**
  - Tại trang Nhân sự và các trang danh mục, nhóm nút hành động (*Tải mẫu Excel*, *Import Excel*, *Xuất Excel*, *Cột hiển thị*, *Tạo nhân sự*) được cố định trên cùng một hàng ngang (`wrap="nowrap"`, `flexShrink: 0`) ở góc trên bên phải, ngang hàng với dòng mô tả, giải quyết triệt để lỗi bị rớt dòng.

---

## III. CHUẨN HÓA HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM) & DARK MODE

1. **Bảng màu Nhận diện Thương hiệu HACOM:**
   - Màu chủ đạo: `HACOM Red` (`#e02424` / `#c81e1e`) kết hợp điểm nhấn `HACOM Blue` (`#0b64d8`).
   - Token màu bề mặt: Phân tách rõ ràng giữa màu nền trang (`var(--bg-app)`), màu thẻ (`var(--hrm-surface)`) và màu nền phụ (`var(--hrm-surface-subtle)`).
2. **Chuẩn hóa Chế độ Nền tối (Dark Mode 100%):**
   - Ứng dụng hàm `light-dark()` của Mantine kết hợp biến CSS theme chuẩn.
   - Toàn bộ các bảng biểu dữ liệu, thanh cuộn, modal, drawer, thanh sidebar thu nhỏ (Icon rail) và tooltip đều hiển thị sắc nét, tương phản cao, không bị chói mắt.
3. **Bộ Thành phần Giao diện Dùng chung (Shared UI Kit):**
   - `PageHeader`: Thanh đầu trang tinh gọn, không trùng lặp tiêu đề, tự căn phải các nút thao tác.
   - `ImportExportToolbar`: Nhóm nút thao tác Excel đồng bộ, chống vỡ dòng.
   - `EmptyState`: Trạng thái rỗng với icon minh họa và nút gợi ý hành động.
   - `LoadingState` & `LayoutSkeletons`: Khung chờ tải dữ liệu đồng bộ theo từng loại layout.
   - `ConfirmActionModal`: Hộp thoại xác nhận thao tác quan trọng/nguy hiểm.
   - `TableActionsMenu`: Menu hành động gọn gàng trên từng dòng bảng dữ liệu.

---

## IV. TỔNG KẾT & KẾ HOẠCH TIẾP THEO

- **Trạng thái Kỹ thuật:** Mã nguồn đã vượt qua kiểm thử kiểu dữ liệu TypeScript (`npm run typecheck`) và Vite build hoàn toàn sạch lỗi (`0 errors`).
- **Kế hoạch tiếp theo:** Các phân hệ còn lại (Quản lý Nghỉ phép nâng cao, Chấm công, Cơ cấu Tổ chức, Hợp đồng, Phân quyền ma trận, Imports...) sẽ tiếp tục được triển khai theo chuẩn thiết kế module mới.
