import { api } from "../../shared/api/httpClient";
import { generateId, mockDelay } from "../../shared/mocks/mockHelpers";

import type {
  LeaveApprovalAssignment,
  LeaveApprovalReviewer,
  LeaveApprovalStepCode,
  UpsertLeaveApprovalAssignmentPayload,
} from "./leaveApprovalTypes";

const mockReviewers: LeaveApprovalReviewer[] = [
  { id: "mock-leave-tracker", fullName: "Người theo dõi công", email: "tracker@example.test" },
  { id: "mock-department-manager", fullName: "Trưởng bộ phận", email: "manager@example.test" },
  { id: "mock-office-chief", fullName: "Chánh văn phòng", email: "office-chief@example.test" },
  { id: "mock-board", fullName: "Ban Tổng giám đốc", email: "board@example.test" },
];

const mockAssignments: LeaveApprovalAssignment[] = [];

function getMockReviewer(userId: string) {
  const reviewer = mockReviewers.find((item) => item.id === userId);
  if (!reviewer) {
    throw new Error("Người duyệt mock không tồn tại");
  }
  return reviewer;
}

function cloneMockAssignment(item: LeaveApprovalAssignment): LeaveApprovalAssignment {
  return {
    ...item,
    reviewer: { ...item.reviewer },
    department: item.department ? { ...item.department } : null,
  };
}

const isMockMode = import.meta.env.VITE_USE_MOCKS === "true";

export async function listLeaveApprovalAssignments(): Promise<
  LeaveApprovalAssignment[]
> {
  if (isMockMode) {
    await mockDelay();
    return mockAssignments.map(cloneMockAssignment);
  }
  return api.get<LeaveApprovalAssignment[]>("/leave/approval-assignments");
}

export async function listLeaveApprovalReviewers(): Promise<
  LeaveApprovalReviewer[]
> {
  if (isMockMode) {
    await mockDelay();
    return mockReviewers.map((item) => ({ ...item }));
  }
  return api.get<LeaveApprovalReviewer[]>("/leave/approval-reviewers");
}

export async function upsertLeaveApprovalAssignment(
  stepCode: LeaveApprovalStepCode,
  payload: UpsertLeaveApprovalAssignmentPayload,
): Promise<LeaveApprovalAssignment> {
  if (isMockMode) {
    await mockDelay();
    const reviewer = getMockReviewer(payload.reviewerUserId);
    const scopeType = payload.departmentId ? "DEPARTMENT" : "GLOBAL";
    const scopeKey = payload.departmentId ? `DEPARTMENT:${payload.departmentId}` : "GLOBAL";
    const assignment: LeaveApprovalAssignment = {
      id: generateId("leave-approval"),
      stepCode,
      scopeType,
      scopeKey,
      departmentId: payload.departmentId ?? null,
      reviewerUserId: payload.reviewerUserId,
      reviewer: {
        id: reviewer.id,
        fullName: reviewer.fullName,
        status: "ACTIVE",
      },
      department: null,
    };
    const existingIndex = mockAssignments.findIndex((item) => item.stepCode === stepCode && item.scopeKey === scopeKey);
    if (existingIndex >= 0) {
      assignment.id = mockAssignments[existingIndex].id;
      mockAssignments.splice(existingIndex, 1, assignment);
    } else {
      mockAssignments.unshift(assignment);
    }
    return cloneMockAssignment(assignment);
  }
  return api.put<LeaveApprovalAssignment>(
    `/leave/approval-assignments/${stepCode}`,
    payload,
  );
}

export async function deleteLeaveApprovalAssignment(
  stepCode: LeaveApprovalStepCode,
  departmentId?: string,
): Promise<{ id: string }> {
  if (isMockMode) {
    await mockDelay();
    const scopeKey = departmentId ? `DEPARTMENT:${departmentId}` : "GLOBAL";
    const existingIndex = mockAssignments.findIndex((item) => item.stepCode === stepCode && item.scopeKey === scopeKey);
    if (existingIndex < 0) {
      throw new Error("Cấu hình mock không tồn tại");
    }
    const [removed] = mockAssignments.splice(existingIndex, 1);
    return { id: removed.id };
  }
  return api.delete<{ id: string }>(`/leave/approval-assignments/${stepCode}`, {
    params: departmentId ? { departmentId } : undefined,
  });
}
