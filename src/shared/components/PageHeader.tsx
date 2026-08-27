import type { ReactNode } from 'react';
import { Breadcrumbs, Group, Stack, Text } from '@mantine/core';

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
      align="center"
      gap="md"
      mb={compact ? "xs" : "sm"}
      wrap="nowrap"
      style={{ width: "100%" }}
    >
      <Stack gap={2} style={{ minWidth: 0, flex: "1 1 auto" }}>
        {breadcrumbs?.length ? (
          <Breadcrumbs fz="xs">
            {breadcrumbs.map((item) => (
              <Text key={item} c="dimmed" inherit>
                {item}
              </Text>
            ))}
          </Breadcrumbs>
        ) : null}
        {subtitle ? (
          <Text c="dimmed" size="xs" truncate="end">
            {subtitle}
          </Text>
        ) : (
          <Text c="dimmed" size="xs" fw={500} truncate="end">
            {title}
          </Text>
        )}
      </Stack>
      {actions ? (
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0, marginLeft: "auto" }}>
          {actions}
        </Group>
      ) : null}
    </Group>
  );
}
