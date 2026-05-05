import { Flex, Spin, Typography } from 'antd';

interface LoadingStateProps {
  tip?: string;
  compact?: boolean;
}

export function LoadingState({ tip = 'Đang tải dữ liệu...', compact = false }: LoadingStateProps) {
  return (
    <Flex
      align="center"
      justify="center"
      vertical
      gap={12}
      style={{ minHeight: compact ? 120 : 320, width: '100%' }}
    >
      <Spin size="large" />
      <Typography.Text type="secondary">{tip}</Typography.Text>
    </Flex>
  );
}

