import { Alert, Button, Stack, Text } from '@mantine/core';

export function WorkReportAuthorizationSummary({ authUserId }: { authUserId: string }) {
  return (
    <Stack gap="sm">
      <Alert color="hacomRed" title="Quyền báo cáo công việc">
        <Text size="sm">Báo cáo cá nhân và công việc tuần được xác định theo trạng thái tài khoản và liên kết nhân sự.</Text>
        <Text size="sm" mt="xs">Các quyền tổng hợp theo phòng ban, đơn vị và Tổng công ty được quản lý tập trung.</Text>
      </Alert>
      <Button component="a" href={`/administration/work-report-authorizations?subject=${encodeURIComponent(authUserId)}`}>
        Mở trang quản lý phân quyền
      </Button>
    </Stack>
  );
}
