import { Button, Group, Text } from '@mantine/core';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { StatusResult } from '../shared/components/StatusResult';

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Đã có lỗi khi tải trang.';
}

export function RouteErrorPage() {
  const error = useRouteError();
  const message = getErrorMessage(error);

  return (
    <StatusResult
      status="error"
      title="Không thể tải trang"
      subTitle="Ứng dụng gặp lỗi khi hiển thị màn hình hiện tại."
      extra={
        <Group justify="center" mt="xs">
          <Button onClick={() => window.location.reload()}>Tải lại</Button>
          <Button variant="default" onClick={() => window.location.assign('/')}>
            Về trang chính
          </Button>
        </Group>
      }
    >
      <Text c="dimmed" size="sm">
        {message}
      </Text>
    </StatusResult>
  );
}
