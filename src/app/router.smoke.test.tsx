// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { Suspense, lazy } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { LoadingState } from '../shared/components/LoadingState';
import { StatusResult } from '../shared/components/StatusResult';

// Mantine reads both at mount; jsdom ships neither.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: '',
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  }),
});

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

afterEach(cleanup);

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('StatusResult', () => {
  it('hiển thị title, subTitle và extra', () => {
    renderWithMantine(
      <StatusResult
        status="403"
        title="Không có quyền"
        subTitle="Chi tiết lỗi"
        extra={<button type="button">Thử lại</button>}
      />,
    );

    expect(screen.getByText('Không có quyền')).toBeTruthy();
    expect(screen.getByText('Chi tiết lỗi')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy();
  });
});

describe('lazy route + Suspense', () => {
  it('render được màn hình nạp bằng React.lazy phía sau Suspense', async () => {
    const LazyScreen = lazy(async () => ({
      default: () => <div>Nội dung màn hình</div>,
    }));

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <Suspense fallback={<LoadingState tip="Đang tải màn hình..." />}>
              <LazyScreen />
            </Suspense>
          ),
        },
      ],
      { initialEntries: ['/'] },
    );

    renderWithMantine(<RouterProvider router={router} />);

    expect(await screen.findByText('Nội dung màn hình')).toBeTruthy();
  });
});
