# Hacom HRM

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Nhân sự và cán bộ theo dõi công, ca, phép làm việc hằng ngày trên máy tính.
- Trưởng bộ phận và lãnh đạo xem dữ liệu trong phạm vi được phân quyền.
- Nhân viên tự xem số dư và gửi đơn nghỉ qua Chat.

## Product Purpose

Hacom HRM là nguồn quản trị nhân sự, tổ chức, chấm công, phân ca và nghỉ phép. Thành công là dữ liệu cùng một nhân viên phải khớp giữa hồ sơ nhân sự, Bảng công tháng, Bảng phép năm và Chat mà không cần nhập lại.

## Positioning

Hệ thống tính theo dữ liệu ca, bảng công và ledger do HR API sở hữu; các giao diện chỉ hiển thị kết quả và thao tác theo quyền, không giữ công thức nghiệp vụ riêng.

## Operating Context

- Nghiệp vụ công, ca, phép được vận hành theo kỳ tháng và đối chiếu bằng Excel trong giai đoạn chuyển đổi.
- MCB BioTime là khóa nối dữ liệu máy chấm công với nhân viên HRM.
- HR cần bảng rộng, lọc theo năm/đơn vị/phòng ban và xuất/nhập Excel có preview.
- Đơn nghỉ được tạo và duyệt trên Chat; HRM quản trị cấu hình, đối chiếu và báo cáo.

## Capabilities and Constraints

- `Employee.hireDate` là ngày bắt đầu làm việc duy nhất.
- `Employee.biotimeEmployeeCode` là MCB hiển thị giống Bảng công tháng.
- Chỉ ký hiệu `P` trừ phép năm.
- Server là nơi duy nhất tính ngày nghỉ, thâm niên và số dư.
- Import không được ghi đè dữ liệu derived từ BCC; mọi thay đổi quỹ phép phải có ledger và audit.
- Phân quyền và nhóm quyền do `chat-auth-service` sở hữu.
- Chưa bật số dư thật cho nhân viên khi dữ liệu chưa được HR đối chiếu.

## Brand Commitments

- Giữ tên và nhận diện HACOM HRM đang có.
- Màn mới kế thừa app shell, Mantine components, spacing, màu sắc và cách tổ chức bảng/filter của các màn công hiện hành.
- Ngôn ngữ giao diện là tiếng Việt, rõ nghĩa nghiệp vụ.

## Evidence on Hand

- Quy trình gốc: `../ztai lieu cong ca phep/Visio-2026_Quy trình Nghỉ phép.pdf`.
- Quy tắc chốt: `../ztai lieu cong ca phep/05-QUY-TAC-NGHIEP-VU-CHOT.md`.
- Đặc tả triển khai: `../ztai lieu cong ca phep/03-05A-PHASE-4A-BANG-PHEP-NAM-HRM.md`.
- Màn hình chuẩn để kế thừa: Phân ca và Bảng công tháng trong repository này.

## Product Principles

1. Một nghiệp vụ chỉ có một nguồn chuẩn.
2. Sai lệch phải hiện rõ và chặn go-live, không được tự làm tròn hoặc che số âm.
3. Import luôn preview trước khi commit và chạy lại không nhân đôi dữ liệu.
4. Quyền backend và scope dữ liệu quan trọng hơn việc ẩn nút ở frontend.
5. Ưu tiên khả năng rà soát nhanh của HR trên bảng dữ liệu lớn.

## Accessibility & Inclusion

Các trạng thái không chỉ phân biệt bằng màu; bảng, filter, modal và thao tác import phải dùng được bằng bàn phím, có focus rõ và giữ nội dung đọc được ở màn hình hẹp bằng cuộn ngang.
