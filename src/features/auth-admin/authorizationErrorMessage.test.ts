import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuthorizationErrorMessage } from './authorizationErrorMessage.ts';

test('authorization errors are mapped to business-safe Vietnamese messages', () => {
  assert.equal(
    getAuthorizationErrorMessage('SELF_ESCALATION_FORBIDDEN'),
    'Bạn không thể tự nâng quyền cho chính mình.',
  );
  assert.equal(
    getAuthorizationErrorMessage('WORK_REPORT_PERMISSION_MANAGED_BY_HRM'),
    'Quyền Báo cáo công việc phải được cấu hình trong trình quản lý chuyên biệt.',
  );
});

test('unknown authorization errors keep the API message path intact', () => {
  assert.equal(getAuthorizationErrorMessage('UNKNOWN_ERROR'), null);
  assert.equal(getAuthorizationErrorMessage(null), null);
});
