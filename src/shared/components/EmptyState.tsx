import { Empty, Flex } from 'antd';

interface EmptyStateProps {
  description?: string;
}

export function EmptyState({ description = 'Chưa có dữ liệu phù hợp.' }: EmptyStateProps) {
  return (
    <Flex align="center" justify="center" style={{ minHeight: 220, width: '100%' }}>
      <Empty description={description} />
    </Flex>
  );
}

