import assert from "node:assert/strict";
import { test } from "vitest";

import {
  describeAccessScopes,
  roleBusinessLabel,
  summarizeEffectiveAccess,
} from "./accessPresentation";

test("groups personnel and every attendance action into business modules", () => {
  const modules = summarizeEffectiveAccess([
    "hr.employee.create",
    "hr.employee.delete",
    "hr.attendance.read",
    "hr.attendance.sync",
    "hr.leave.approve",
    "hr.leave_balance.import",
  ]);

  assert.deepEqual(
    modules.map((module) => module.key),
    ["personnel", "attendance"],
  );
  assert.deepEqual(
    modules.find((module) => module.key === "attendance")?.actions,
    ["Duyệt", "Đồng bộ", "Import", "Xem"],
  );
  assert.equal(
    modules.find((module) => module.key === "attendance")?.label,
    "Công, ca và phép",
  );
});

test("keeps account operations separate from account authorization", () => {
  const modules = summarizeEffectiveAccess([
    "hr.account.reset_password",
    "auth.user.revoke_sessions",
    "auth.user.assign_role",
  ]);

  assert.deepEqual(
    modules.map((module) => module.key),
    ["employee-accounts", "account-authorization"],
  );
});

test("wildcard previews every known module as full access", () => {
  const modules = summarizeEffectiveAccess(["*"]);
  assert.ok(modules.length >= 8);
  assert.ok(modules.every((module) => module.actions[0] === "Toàn quyền"));
});

test("describes canonical and projected scopes without leaking resource ids", () => {
  assert.deepEqual(
    describeAccessScopes([
      { type: "ALL" },
      { scopeType: "DEPARTMENT", departmentIds: ["dep-a", "dep-b"] },
    ]),
    ["Toàn Tổng công ty", "2 phòng ban được phân"],
  );
  assert.equal(roleBusinessLabel("HR-ADMIN"), "Quản trị HRM");
});
