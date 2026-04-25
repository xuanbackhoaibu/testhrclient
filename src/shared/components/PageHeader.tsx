import { Breadcrumb, Flex, Typography } from 'antd';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: string[];
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <Flex align="flex-start" justify="space-between" gap={16} wrap="wrap" style={{ marginBottom: 20 }}>
      <Flex vertical gap={6}>
        {breadcrumbs?.length ? (
          <Breadcrumb items={breadcrumbs.map((item) => ({ title: item }))} />
        ) : null}
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {subtitle ? <Typography.Text type="secondary">{subtitle}</Typography.Text> : null}
      </Flex>
      {actions}
    </Flex>
  );
}

