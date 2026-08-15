// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it } from "vitest";

import { WeekdayScopeField } from "./WeekdayScopeField";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: () => ({
    matches: false,
    media: "",
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

function ScopeHarness() {
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]);
  return (
    <MantineProvider>
      <WeekdayScopeField value={weekdays} onChange={setWeekdays} />
    </MantineProvider>
  );
}

describe("WeekdayScopeField", () => {
  it("opens exact day checkboxes when HR switches a preset to Tùy chọn", () => {
    render(<ScopeHarness />);

    fireEvent.click(screen.getByRole("radio", { name: "Tùy chọn" }));

    const sunday = screen.getByRole("checkbox", { name: "CN" }) as HTMLInputElement;
    const monday = screen.getByRole("checkbox", { name: "T2" }) as HTMLInputElement;
    expect(sunday.checked).toBe(false);
    expect(monday.checked).toBe(true);
  });
});
