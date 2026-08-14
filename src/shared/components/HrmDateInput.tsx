import {
  DateInput,
  DateTimePicker,
  type DateInputProps,
  type DateTimePickerProps,
} from "@mantine/dates";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/vi";

dayjs.extend(customParseFormat);

type HrmDateInputProps = Omit<
  DateInputProps,
  "dateParser" | "locale" | "valueFormat"
>;
type HrmDateTimeInputProps = Omit<
  DateTimePickerProps,
  "locale" | "valueFormat"
>;

/**
 * Date-only input for HRM screens.
 *
 * The user sees and can type `dd/mm/yyyy`; its value remains the ISO
 * `yyyy-mm-dd` string used by the existing form state and API contracts.
 */
export function HrmDateInput({ clearable = true, ...props }: HrmDateInputProps) {
  return (
    <DateInput
      {...props}
      clearable={clearable}
      dateParser={(value) => {
        const parsed = dayjs(value, "DD/MM/YYYY", "vi", true);
        return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
      }}
      firstDayOfWeek={1}
      locale="vi"
      valueFormat="DD/MM/YYYY"
    />
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
