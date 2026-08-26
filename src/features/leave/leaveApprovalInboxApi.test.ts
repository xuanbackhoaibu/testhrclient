import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("../../shared/api/httpClient", () => ({ api: { get, post } }));

import {
  approveLeaveRequest,
  listPendingLeaveApprovals,
  rejectLeaveRequest,
} from "./leaveApi";

describe("leave approval inbox API", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("normalizes the reviewer-scoped paginated endpoint", async () => {
    const item = { id: "leave-1", employeeId: "employee-1", status: "SUBMITTED" };
    get.mockResolvedValue({
      data: [item],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const result = await listPendingLeaveApprovals({ page: 1, pageSize: 20 });

    expect(result.items).toEqual([item]);
    expect(result.pagination.total).toBe(1);
    expect(get).toHaveBeenCalledWith("/leave/requests/pending-approval", {
      params: { page: 1, pageSize: 20 },
    });
  });

  it("sends the optional note with both leave review actions", async () => {
    post.mockResolvedValue({ id: "leave-1" });

    await approveLeaveRequest("leave-1", "Đủ điều kiện");
    await rejectLeaveRequest("leave-2", "Cần bổ sung");

    expect(post).toHaveBeenNthCalledWith(
      1,
      "/leave/requests/leave-1/approve",
      { note: "Đủ điều kiện" },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      "/leave/requests/leave-2/reject",
      { note: "Cần bổ sung" },
    );
  });
});
