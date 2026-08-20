import { useSearchParams } from "react-router-dom";
import { Stack } from "@mantine/core";

import { getActiveShiftPrefillId } from "../../features/attendance/shiftAssignmentNavigation";
import { useWorkShifts } from "../../features/attendance/useWorkSchedule";
import { PageHeader } from "../../shared/components/PageHeader";

import { MonthlyShiftAssignmentGrid } from "./MonthlyShiftAssignmentGrid";

/**
 * Phân ca theo tháng cho từng CBNV.
 *
 * Màn này trước đây ôm thêm "quy tắc phân ca theo phòng ban/đơn vị" — một
 * loại luật đứng lâu dài theo tổ chức, khác hẳn nhịp "gán ca cho từng người
 * theo tháng" ở đây. HR không dùng kiểu cả phòng chung một ca mặc định (mọi
 * người đều phân theo người hoặc theo mẫu Ca tuần), nên phần đó đã gỡ bỏ để
 * mỗi màn chỉ làm đúng một việc:
 *
 *   Ca làm việc  → khai báo mẫu giờ công
 *   Ca tuần      → mẫu tuần, mỗi thứ một ca
 *   Phân ca      → gán ca cho từng CBNV theo tháng  ← màn này
 */
export function ShiftAssignmentsPage() {
  const [searchParams] = useSearchParams();
  const shiftsQuery = useWorkShifts();
  // Mở từ "Ca làm việc → Phân ca này": chọn sẵn ca đó trong lưới. Ca đã ngừng
  // áp dụng thì bỏ qua — điền sẵn một ca không còn chọn được chỉ gây bối rối.
  const requestedShiftId = getActiveShiftPrefillId(
    shiftsQuery.data,
    searchParams.get("assignShiftId"),
  );

  return (
    <>
      <PageHeader
        title="Phân ca"
        subtitle="Tick CBNV, chọn ca và ngày áp dụng. BCC dùng đúng ca kế hoạch này sau khi được cập nhật lại."
      />

      <Stack gap="md">
        <MonthlyShiftAssignmentGrid requestedShiftId={requestedShiftId} />
      </Stack>
    </>
  );
}
