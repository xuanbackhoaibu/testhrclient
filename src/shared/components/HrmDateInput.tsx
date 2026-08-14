import {
  ActionIcon,
  Group,
  Popover,
  TextInput,
  type TextInputProps,
} from "@mantine/core";
import {
  DatePicker,
  DateTimePicker,
  type DatePickerProps,
  type DateTimePickerProps,
} from "@mantine/dates";
import { IconCalendar, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/vi";
import { useState, type ReactNode } from "react";

dayjs.extend(customParseFormat);

type DateOnlyValue = string | Date | null | undefined;
type DateDraft = {
  sourceValue: string | null;
  value: string;
  error: string | null;
};

type HrmDateInputProps = Omit<
  TextInputProps,
  | "value"
  | "defaultValue"
  | "onChange"
  | "type"
  | "inputMode"
  | "rightSection"
  | "rightSectionWidth"
  | "rightSectionPointerEvents"
> & {
  /** ISO date (`yyyy-mm-dd`) used by form state and API contracts. */
  value?: DateOnlyValue;
  defaultValue?: DateOnlyValue;
  onChange?: (value: string | null) => void;
  clearable?: boolean;
  minDate?: DatePickerProps["minDate"];
  maxDate?: DatePickerProps["maxDate"];
  rightSection?: ReactNode;
};

type HrmDateTimeInputProps = Omit<
  DateTimePickerProps,
  "locale" | "valueFormat"
>;

const DATE_PATTERNS = [
  "DD/MM/YYYY",
  "D/M/YYYY",
  "DD-MM-YYYY",
  "D-M-YYYY",
  "YYYY-MM-DD",
] as const;

function toIsoDate(value: DateOnlyValue): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
  }

  const raw = value.trim();
  if (!raw) return null;

  for (const pattern of DATE_PATTERNS) {
    const parsed = dayjs(raw, pattern, "vi", true);
    if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
  }

  return null;
}

function formatDisplayDate(value: DateOnlyValue): string {
  const isoDate = toIsoDate(value);
  return isoDate ? dayjs(isoDate).format("DD/MM/YYYY") : "";
}

function isWithinBounds(
  isoDate: string,
  minDate?: DatePickerProps["minDate"],
  maxDate?: DatePickerProps["maxDate"],
): boolean {
  const candidate = dayjs(isoDate);
  const minimum = toIsoDate(minDate);
  const maximum = toIsoDate(maxDate);

  return (
    (!minimum || !candidate.isBefore(minimum, "day")) &&
    (!maximum || !candidate.isAfter(maximum, "day"))
  );
}

/**
 * Date-only input for HRM screens.
 *
 * Users type `dd/mm/yyyy` without a calendar opening over the form. The
 * calendar remains available from its explicit icon, while API values stay ISO.
 */
export function HrmDateInput({
  clearable = true,
  value,
  defaultValue,
  onChange,
  minDate,
  maxDate,
  rightSection,
  onBlur,
  onFocus,
  onKeyDown,
  error,
  disabled,
  readOnly,
  placeholder,
  ...inputProps
}: HrmDateInputProps) {
  const isControlled = value !== undefined;
  const normalizedControlledValue = toIsoDate(value);
  const [uncontrolledValue, setUncontrolledValue] = useState<string | null>(
    () => toIsoDate(defaultValue),
  );
  const selectedValue = isControlled
    ? normalizedControlledValue
    : uncontrolledValue;
  const [draft, setDraft] = useState<DateDraft | null>(null);
  const activeDraft = draft?.sourceValue === selectedValue ? draft : null;
  const inputValue = activeDraft?.value ?? formatDisplayDate(selectedValue);
  const inputError = activeDraft?.error ?? null;
  const [calendarOpened, setCalendarOpened] = useState(false);

  const setDraftValue = (
    nextValue: string,
    nextError: string | null = null,
  ) => {
    setDraft({
      sourceValue: selectedValue,
      value: nextValue,
      error: nextError,
    });
  };

  const commitValue = (nextValue: string | null) => {
    if (!isControlled) setUncontrolledValue(nextValue);
    onChange?.(nextValue);
  };

  const commitTypedValue = (rawValue: string) => {
    const trimmedValue = rawValue.trim();
    if (!trimmedValue) {
      setDraftValue("");
      commitValue(null);
      return;
    }

    const isoDate = toIsoDate(trimmedValue);
    if (!isoDate) {
      setDraftValue(trimmedValue, "Nhập ngày theo dạng dd/mm/yyyy.");
      return;
    }

    if (!isWithinBounds(isoDate, minDate, maxDate)) {
      setDraftValue(trimmedValue, "Ngày nằm ngoài khoảng được phép.");
      return;
    }

    setDraftValue(formatDisplayDate(isoDate));
    commitValue(isoDate);
  };

  const hasValue = Boolean(selectedValue || inputValue.trim());
  const inputRightSection = (
    <Group gap={2} wrap="nowrap">
      {clearable && hasValue && !disabled && !readOnly && (
        <ActionIcon
          aria-label="Xóa ngày"
          color="gray"
          size="sm"
          variant="subtle"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setDraftValue("");
            setCalendarOpened(false);
            commitValue(null);
          }}
        >
          <IconX aria-hidden size={16} />
        </ActionIcon>
      )}
      <ActionIcon
        aria-label={calendarOpened ? "Đóng lịch" : "Mở lịch"}
        color="gray"
        disabled={disabled || readOnly}
        size="sm"
        variant="subtle"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setCalendarOpened((opened) => !opened)}
      >
        {rightSection ?? <IconCalendar aria-hidden size={17} />}
      </ActionIcon>
    </Group>
  );

  return (
    <Popover
      closeOnClickOutside
      onChange={setCalendarOpened}
      onDismiss={() => setCalendarOpened(false)}
      opened={calendarOpened}
      position="bottom-start"
      shadow="md"
      trapFocus={false}
      withinPortal
    >
      <Popover.Target>
        <TextInput
          {...inputProps}
          autoComplete={inputProps.autoComplete ?? "off"}
          disabled={disabled}
          error={error || inputError}
          inputMode="text"
          placeholder={placeholder ?? "dd/mm/yyyy"}
          readOnly={readOnly}
          rightSection={inputRightSection}
          rightSectionPointerEvents="all"
          rightSectionWidth={clearable && hasValue ? 66 : 36}
          value={inputValue}
          onBlur={(event) => {
            onBlur?.(event);
            setCalendarOpened(false);
            commitTypedValue(event.currentTarget.value);
          }}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            setDraftValue(nextValue);

            if (!nextValue.trim()) {
              commitValue(null);
              return;
            }

            const isoDate = toIsoDate(nextValue);
            if (isoDate && isWithinBounds(isoDate, minDate, maxDate)) {
              commitValue(isoDate);
            }
          }}
          onFocus={(event) => onFocus?.(event)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setCalendarOpened(false);
            if (event.altKey && event.key === "ArrowDown") {
              event.preventDefault();
              setCalendarOpened(true);
            }
            if (event.key === "Enter")
              commitTypedValue(event.currentTarget.value);
            onKeyDown?.(event);
          }}
        />
      </Popover.Target>
      <Popover.Dropdown data-testid="hrm-date-calendar" p="xs">
        <DatePicker
          defaultDate={
            selectedValue ??
            toIsoDate(inputValue) ??
            dayjs().format("YYYY-MM-DD")
          }
          firstDayOfWeek={1}
          locale="vi"
          maxDate={maxDate}
          minDate={minDate}
          value={selectedValue}
          weekendDays={[0]}
          onChange={(nextValue) => {
            const isoDate = toIsoDate(nextValue);
            if (!isoDate) return;
            setDraftValue(formatDisplayDate(isoDate));
            commitValue(isoDate);
            setCalendarOpened(false);
          }}
        />
      </Popover.Dropdown>
    </Popover>
  );
}

/**
 * Date-time input for HRM screens. It displays `dd/mm/yyyy HH:mm` while the
 * controlled value stays compatible with the local ISO-like value used before.
 */
export function HrmDateTimeInput(props: HrmDateTimeInputProps) {
  return (
    <DateTimePicker
      {...props}
      firstDayOfWeek={1}
      locale="vi"
      valueFormat="DD/MM/YYYY HH:mm"
    />
  );
}
