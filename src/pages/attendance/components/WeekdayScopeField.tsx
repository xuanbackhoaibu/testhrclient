import { useState, type ReactNode } from "react";
import { Checkbox, Group, SegmentedControl, Stack, Text } from "@mantine/core";

import {
  ALL_ASSIGNMENT_WEEKDAYS,
  getAssignmentWeekdayPreset,
  type AssignmentWeekdayPreset,
  weekdaysForAssignmentPreset,
} from "../../../features/attendance/shiftAssignmentWeekdays";

const presetOptions = [
  { value: "all", label: "Tất cả ngày" },
  { value: "weekdays", label: "T2–T6" },
  { value: "saturday", label: "Thứ 7" },
  { value: "custom", label: "Tùy chọn" },
];

const weekdayOptions = ALL_ASSIGNMENT_WEEKDAYS.map((weekday) => ({
  value: String(weekday),
  label: weekday === 0 ? "CN" : "T" + (weekday + 1),
}));

interface WeekdayScopeFieldProps {
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
  error?: ReactNode;
  width?: number | string;
}

export function WeekdayScopeField({
  value,
  onChange,
  disabled = false,
  error,
  width,
}: WeekdayScopeFieldProps) {
  const [customMode, setCustomMode] = useState(false);
  const preset = customMode ? "custom" : getAssignmentWeekdayPreset(value);

  return (
    <Stack gap={4} style={width ? { width } : undefined}>
      <Text size="sm" fw={500}>
        Ngày áp dụng
      </Text>
      <SegmentedControl
        aria-label="Ngày áp dụng"
        data={presetOptions}
        disabled={disabled}
        fullWidth
        size="xs"
        value={preset}
        onChange={(next) => {
          const nextPreset = next as AssignmentWeekdayPreset;
          if (nextPreset === "custom") {
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          onChange(weekdaysForAssignmentPreset(nextPreset, value));
        }}
      />
      {preset === "custom" ? (
        <Checkbox.Group
          aria-label="Chọn ngày áp dụng"
          disabled={disabled}
          value={value.map(String)}
          onChange={(next) => {
            setCustomMode(true);
            onChange(next.map(Number));
          }}
        >
          <Group gap="xs" wrap="wrap">
            {weekdayOptions.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                size="xs"
                value={option.value}
              />
            ))}
          </Group>
        </Checkbox.Group>
      ) : null}
      {error ? (
        <Text size="xs" c="red">
          {error}
        </Text>
      ) : null}
    </Stack>
  );
}
