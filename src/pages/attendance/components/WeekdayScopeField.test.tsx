// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, it } from "vitest";

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

function ScopeHarness({ initial = [1, 2, 3, 4, 5] }: { initial?: number[] }) {
  const [weekdays, setWeekdays] = useState(initial);
  return (
    <MantineProvider>
      <WeekdayScopeField value={weekdays} onChange={setWeekdays} />
    </MantineProvider>
  );
}

describe("WeekdayScopeField", () => {
  // Nhiều `it` cùng render component: không dọn thì DOM cộng dồn, query ra
  // nhiều phần tử trùng tên.
  afterEach(cleanup);

  it("opens exact day checkboxes when HR switches a preset to Tùy chọn", () => {
    render(<ScopeHarness />);

    fireEvent.click(screen.getByRole("radio", { name: "Tùy chọn" }));

    const sunday = screen.getByRole("checkbox", { name: "CN" }) as HTMLInputElement;
    const monday = screen.getByRole("checkbox", { name: "T2" }) as HTMLInputElement;
    expect(sunday.checked).toBe(false);
    expect(monday.checked).toBe(true);
  });

  it("chỉ còn hai preset gọn; Thứ 7 và Chủ nhật gom vào Tùy chọn", () => {
    render(<ScopeHarness />);

    expect(screen.getByRole("radio", { name: "T2–T7" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "T2–T6" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Tùy chọn" })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Thứ 7" })).toBeNull();
    expect(screen.queryByRole("radio", { name: "Chủ nhật" })).toBeNull();
  });

  it("phân ca cũ chỉ Thứ 7 mở lên vẫn hiện đúng ngày đã lưu", () => {
    // Dữ liệu lưu trước đây theo preset `saturday` — không được mất khi bỏ nút.
    render(<ScopeHarness initial={[6]} />);

    const custom = screen.getByRole("radio", {
      name: "Tùy chọn",
    }) as HTMLInputElement;
    expect(custom.checked).toBe(true);
    const saturday = screen.getByRole("checkbox", {
      name: "T7",
    }) as HTMLInputElement;
    expect(saturday.checked).toBe(true);
  });

  it("phân ca cũ chỉ Chủ nhật cũng giữ nguyên ngày", () => {
    render(<ScopeHarness initial={[0]} />);

    const sunday = screen.getByRole("checkbox", {
      name: "CN",
    }) as HTMLInputElement;
    expect(sunday.checked).toBe(true);
  });
});
