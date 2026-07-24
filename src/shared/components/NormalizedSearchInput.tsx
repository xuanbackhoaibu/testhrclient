import { ActionIcon, TextInput, type TextInputProps } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

interface NormalizedSearchInputProps extends Omit<TextInputProps, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Shared presentation for table search. Normalization remains server-side when
 * the API supports it; local callers use normalizeSearchText explicitly.
 */
export function NormalizedSearchInput({ value, onChange, ...props }: NormalizedSearchInputProps) {
  return (
    <TextInput
      {...props}
      value={value}
      leftSection={<IconSearch size={16} aria-hidden />}
      rightSection={value ? (
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label="Xóa từ khóa tìm kiếm"
          onClick={() => onChange('')}
        >
          <IconX size={15} aria-hidden />
        </ActionIcon>
      ) : undefined}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}
