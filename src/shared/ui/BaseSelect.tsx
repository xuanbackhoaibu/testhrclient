import { Select } from '@mantine/core';
import type { SelectProps } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

export type BaseSelectProps = SelectProps;

export function BaseSelect({ searchable = true, leftSection, ...props }: BaseSelectProps) {
  return (
    <Select
      searchable={searchable}
      leftSection={leftSection ?? <IconSearch size={16} stroke={1.8} />}
      comboboxProps={{ withinPortal: true, ...props.comboboxProps }}
      {...props}
    />
  );
}
