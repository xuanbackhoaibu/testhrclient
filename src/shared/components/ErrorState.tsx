import { Alert, Button, Paper, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

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
    <Paper p="md" radius="md" className="error-state-surface">
      <Stack align="flex-start" gap="sm">
      <Alert color="yellow" title={title} icon={<IconAlertTriangle size={18} />} className="error-state-alert">
        {description}
      </Alert>
      {onRetry ? (
        <Button color="yellow" variant="light" onClick={onRetry}>
          Thử lại
        </Button>
      ) : null}
      </Stack>
    </Paper>
  );
}
