import { Button, Result, Typography } from 'antd';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Da co loi khi tai trang.';
}

export function RouteErrorPage() {
  const error = useRouteError();
  const message = getErrorMessage(error);

  return (
    <Result
      status="error"
      title="Khong the tai trang"
      subTitle="Ung dung gap loi khi hien thi man hinh hien tai."
      extra={[
        <Button type="primary" key="reload" onClick={() => window.location.reload()}>
          Tai lai
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
