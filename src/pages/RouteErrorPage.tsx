import { Button, Text } from '@mantine/core';
import { Result } from 'antd';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

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
    <Result
      status="error"
      title="Không thể tải trang"
      subTitle="Ung dung gap loi khi hien thi man hinh hien tai."
      extra={[
        <Button key="reload" onClick={() => window.location.reload()}>
          Tải lại
        </Button>,
        <Button key="home" variant="default" onClick={() => window.location.assign('/')}>
          Ve trang chinh
        </Button>,
      ]}
    >
      <Text c="dimmed">{message}</Text>
    </Result>
  );
}
