import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("../../shared/api/httpClient", () => ({ api: { get, post } }));

import {
  approveAttendanceExplanation,
  listPendingAttendanceExplanations,
  rejectAttendanceExplanation,
} from "./attendanceExplanationApi";

describe("attendance explanation approval API", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("reads pending explanations from the canonical HR endpoint", async () => {
    const item = { id: "explanation-1", employeeId: "employee-1", status: "SUBMITTED" };
    get.mockResolvedValue({ items: [item] });

    await expect(listPendingAttendanceExplanations()).resolves.toEqual([item]);
    expect(get).toHaveBeenCalledWith("/attendance/explanations/pending");
  });

  it("sends the optional review note for approve and reject", async () => {
    post.mockResolvedValue({ id: "explanation-1" });

    await approveAttendanceExplanation("explanation-1", "Đã đối chiếu");
    await rejectAttendanceExplanation("explanation-2", "Thiếu chứng từ");

    expect(post).toHaveBeenNthCalledWith(
      1,
      "/attendance/explanations/explanation-1/approve",
      { note: "Đã đối chiếu" },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      "/attendance/explanations/explanation-2/reject",
      { note: "Thiếu chứng từ" },
    );
  });
});
