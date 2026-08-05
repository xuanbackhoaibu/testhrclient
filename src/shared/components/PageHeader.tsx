import type { ReactNode } from 'react';
import { Breadcrumbs, Group, Stack, Text, Title } from '@mantine/core';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: string[];
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <Group justify="space-between" align="flex-start" gap="md" mb="lg" wrap="wrap" className="page-header">
      <Stack gap={4}>
        {breadcrumbs?.length ? (
          <Breadcrumbs fz="sm">
            {breadcrumbs.map((item) => (
              <Text key={item} c="dimmed" inherit>
                {item}
              </Text>
            ))}
          </Breadcrumbs>
        ) : null}
        <Title order={2} size="h3">
          {title}
        </Title>
        {subtitle ? (
          <Text c="dimmed" size="sm" maw={720}>
            {subtitle}
          </Text>
        ) : null}
      </Stack>
      {actions ? <Group gap="xs" className="page-header-actions">{actions}</Group> : null}
    </Group>
  );
}
