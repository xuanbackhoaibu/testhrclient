import type { ReactNode } from 'react';
import { Breadcrumbs, Group, Stack, Text, Title } from '@mantine/core';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: string[];
  /** Use on dense operational screens such as monthly timesheets. */
  compact?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  compact = false,
}: PageHeaderProps) {
  return (
    <Group
      justify="space-between"
      align="flex-start"
      gap={compact ? "sm" : "md"}
      mb={compact ? "md" : "lg"}
      wrap="wrap"
    >
      <Stack gap={compact ? 2 : 4}>
        {breadcrumbs?.length ? (
          <Breadcrumbs fz={compact ? "xs" : "sm"}>
            {breadcrumbs.map((item) => (
              <Text key={item} c="dimmed" inherit>
                {item}
              </Text>
            ))}
          </Breadcrumbs>
        ) : null}
        <Title order={2} size={compact ? "h4" : "h3"}>
          {title}
        </Title>
        {subtitle ? (
          <Text c="dimmed" size={compact ? "xs" : "sm"} maw={720}>
            {subtitle}
          </Text>
        ) : null}
      </Stack>
      {actions ? <Group gap="xs">{actions}</Group> : null}
    </Group>
  );
}
