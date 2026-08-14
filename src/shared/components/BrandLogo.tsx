import { Group, Image, Stack, Text } from '@mantine/core';

interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <Group gap="sm" wrap="nowrap">
      <Image
        src="/logo.png"
        alt="HACOM Holdings"
        w={compact ? 34 : 42}
        h={compact ? 34 : 42}
        fit="contain"
        className="brand-logo-image"
      />
      <Stack gap={0}>
        <Text fw={600} lh={1.1} size={compact ? 'sm' : 'md'}>
          HACOM HRM
        </Text>
        {!compact ? (
          <Text c="dimmed" size="xs" lh={1.2}>
            Internal operations
          </Text>
        ) : null}
      </Stack>
    </Group>
  );
}
