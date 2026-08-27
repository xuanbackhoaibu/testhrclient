import assert from "node:assert/strict";
import { test } from "vitest";

import { getPermissionBusinessLabel } from "./mappers/permissionBusinessLabel.ts";

test("permission display mapper uses known metadata and a safe fallback", () => {
  assert.equal(
    getPermissionBusinessLabel("auth.role.manage").label,
    "Quản lý vai trò",
  );
  const fallback = getPermissionBusinessLabel("hr.employee.read");
  assert.equal(fallback.label, "Read Employee");
  assert.equal(fallback.isFallback, true);
});

test("annual leave permissions use the Công, ca và phép business group", () => {
  const metadata = getPermissionBusinessLabel("hr.leave_balance.import");

  assert.equal(metadata.label, "Đối chiếu bảng phép năm");
  assert.equal(metadata.moduleLabel, "Công, ca và phép");
  assert.equal(metadata.isFallback, false);
});
