import { Alert, Button, Flex } from 'antd';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Không tải được dữ liệu',
  description = 'Vui lòng thử lại hoặc kiểm tra cấu hình API.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Flex vertical gap={16} style={{ width: '100%' }}>
      <Alert type="error" message={title} description={description} showIcon />
      {onRetry ? <Button onClick={onRetry}>Thử lại</Button> : null}
    </Flex>
  );
}

