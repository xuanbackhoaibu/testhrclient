import { Button, Result, Typography } from 'antd';
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
        <Button type="primary" key="reload" onClick={() => window.location.reload()}>
          Tải lại
        </Button>,
        <Button key="home" onClick={() => window.location.assign('/')}>
          Ve trang chinh
        </Button>,
      ]}
    >
      <Typography.Text type="secondary">{message}</Typography.Text>
    </Result>
  );
}
