import { Text } from '@mantine/core';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { AuthStatePage, type AuthStateVariant } from '../shared/components/AuthStatePage';
import { ROUTES } from '../shared/constants/routes';

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Đã có lỗi khi tải trang.';
}

function getErrorVariant(error: unknown): AuthStateVariant {
  if (!isRouteErrorResponse(error)) return 'error';
  if (error.status === 403) return '403';
  if (error.status === 404) return '404';
  if (error.status === 401) return 'session';
  return 'error';
}

function getErrorTitle(error: unknown) {
  if (!isRouteErrorResponse(error)) return 'Ứng dụng gặp lỗi khi hiển thị màn hình';
  if (error.status === 403) return 'Bạn không có quyền truy cập';
  if (error.status === 404) return 'Không tìm thấy màn hình';
  if (error.status === 401) return 'Phiên đăng nhập đã hết hạn';
  return 'Không thể tải trang';
}

export function RouteErrorPage() {
  const error = useRouteError();
  const message = getErrorMessage(error);
  const variant = getErrorVariant(error);

  return (
    <AuthStatePage
      variant={variant}
      title={getErrorTitle(error)}
      description={
        variant === 'session'
          ? 'Phiên đăng nhập không còn hiệu lực. Đăng nhập lại để tiếp tục đúng màn hình đang xem.'
          : 'Màn hình hiện tại không thể hiển thị đúng. Bạn có thể tải lại trang hoặc quay về dashboard.'
      }
      primaryLabel={variant === 'session' ? 'Đăng nhập lại' : 'Về dashboard'}
      secondaryLabel={variant === 'error' ? 'Tải lại' : 'Liên hệ admin'}
      onPrimary={() =>
        window.location.assign(
          variant === 'session'
            ? `${ROUTES.login}?next=${encodeURIComponent(window.location.pathname)}`
            : ROUTES.root,
        )
      }
      onSecondary={() => {
        if (variant === 'error') {
          window.location.reload();
          return;
        }
        window.location.assign('mailto:admin@hacom.vn');
      }}
      details={<Text size="sm" c="dimmed">{message}</Text>}
    />
  );
}
