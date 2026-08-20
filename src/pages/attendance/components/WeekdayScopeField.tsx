import { useState, type ReactNode } from "react";
import { Checkbox, Group, SegmentedControl, Stack, Text } from "@mantine/core";

import {
  ALL_ASSIGNMENT_WEEKDAYS,
  getAssignmentWeekdayPreset,
  type AssignmentWeekdayPreset,
  weekdaysForAssignmentPreset,
} from "../../../features/attendance/shiftAssignmentWeekdays";

/*
 * Chỉ giữ hai preset thật sự tiết kiệm thao tác: T2–T7 và T2–T6 là lịch của
 * gần hết công ty. "Thứ 7" và "Chủ nhật" chỉ chọn đúng MỘT ngày — bấm
 * "Tùy chọn" rồi tích một ô cũng nhanh y hệt, giữ lại chỉ làm dài dải nút.
 * `getAssignmentWeekdayPreset` vẫn hiểu hai giá trị cũ nên phân ca đã lưu
 * theo Thứ 7/Chủ nhật mở lên vẫn hiện đúng ở chế độ Tùy chọn.
 */
const presetOptions = [
  { value: "all", label: "T2–T7" },
  { value: "weekdays", label: "T2–T6" },
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
  const detected = getAssignmentWeekdayPreset(value);
  // Thứ 7 / Chủ nhật không còn là nút riêng: quy về "Tùy chọn" để dải nút
  // vẫn sáng đúng ô và các checkbox hiện ra với ngày đã lưu.
  const preset =
    customMode || detected === "saturday" || detected === "sunday"
      ? "custom"
      : detected;

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
