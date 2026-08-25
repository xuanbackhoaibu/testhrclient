import assert from 'node:assert/strict';
import { test } from 'vitest';

import { isDefinitiveAuthRefreshFailure } from '../../shared/api/authRefreshFailure';

test('only explicit rejected refresh credentials end the stale browser session', () => {
  assert.equal(
    isDefinitiveAuthRefreshFailure({ reasonCode: 'REFRESH_TOKEN_MISSING' }),
    true,
  );
  assert.equal(
    isDefinitiveAuthRefreshFailure({
      isAxiosError: true,
      response: { status: 401, data: { details: { reasonCode: 'REFRESH_TOKEN_EXPIRED' } } },
    }),
    true,
  );
  assert.equal(
    isDefinitiveAuthRefreshFailure({
      isAxiosError: true,
      response: { status: 401, data: { details: { reasonCode: 'REFRESH_UNKNOWN_ERROR' } } },
    }),
    false,
  );
  assert.equal(
    isDefinitiveAuthRefreshFailure({
      isAxiosError: true,
      response: {
        status: 503,
        data: { details: { reasonCode: 'REFRESH_TRANSIENT_BACKEND_ERROR' } },
      },
    }),
    false,
  );
});
