// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { listAllEmployees, listEmployees } = vi.hoisted(() => ({
  listAllEmployees: vi.fn(),
  listEmployees: vi.fn(),
}));

vi.mock('./employeesApi', () => ({
  listAllEmployees,
  listEmployees,
}));

import { useAllEmployees } from './useEmployees';

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useAllEmployees', () => {
  afterEach(() => {
    cleanup();
    listAllEmployees.mockReset();
    listEmployees.mockReset();
  });

  it('does not request all employees until the employee target is selected', async () => {
    listAllEmployees.mockResolvedValue([]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useAllEmployees({}, { enabled }),
      {
        initialProps: { enabled: false },
        wrapper: createWrapper(queryClient),
      },
    );

    expect(listAllEmployees).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(listAllEmployees).toHaveBeenCalledOnce();
    });
    expect(listAllEmployees).toHaveBeenCalledWith({});
  });
});
