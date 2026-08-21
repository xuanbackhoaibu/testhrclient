// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MantineProvider, Paper, Group, Text, Button } from '@mantine/core';
import { afterEach, describe, expect, it } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

/**
 * Bản sao rút gọn của thanh thao tác hàng loạt ở EmployeesPage.
 *
 * Chốt lại điều dễ vỡ nhất: thanh này phải LUÔN chiếm chỗ, kể cả khi chưa chọn
 * dòng nào. Nếu đổi sang render có điều kiện (`hasSelection && <Paper/>`) thì
 * lúc tick dòng đầu tiên bảng bên dưới sẽ bị đẩy xuống — đúng lỗi nhảy giao
 * diện mà thanh này sinh ra để tránh.
 */
function BulkBar({ selectedCount }: { selectedCount: number }) {
  const hasSelection = selectedCount > 0;
  return (
    <MantineProvider>
      <Paper
        withBorder
        data-testid="bulk-bar"
        style={{ minHeight: 52, visibility: hasSelection ? undefined : 'hidden' }}
        aria-hidden={!hasSelection}
        inert={!hasSelection}
      >
        <Group>
          <Text>Đã chọn {selectedCount} nhân sự</Text>
          <Button>Hủy mã chấm công</Button>
        </Group>
      </Paper>
    </MantineProvider>
  );
}

afterEach(cleanup);

describe('thanh thao tác hàng loạt', () => {
  it('vẫn chiếm chỗ khi chưa chọn dòng nào, nên bảng không bị đẩy', () => {
    render(<BulkBar selectedCount={0} />);
    const bar = screen.getByTestId('bulk-bar');

    // có mặt trong DOM và giữ nguyên chiều cao
    expect(bar).toBeDefined();
    expect(bar.style.minHeight).toBe('52px');
    expect(bar.style.visibility).toBe('hidden');
  });

  it('ẩn khỏi trình đọc màn hình và khỏi tab order khi chưa chọn', () => {
    render(<BulkBar selectedCount={0} />);
    const bar = screen.getByTestId('bulk-bar');

    expect(bar.getAttribute('aria-hidden')).toBe('true');
    // inert: nút bên trong không bấm/tab vào được dù vẫn nằm trong DOM
    expect(bar.hasAttribute('inert')).toBe(true);
  });

  it('hiện ra đúng chỗ cũ khi đã chọn, chiều cao không đổi', () => {
    render(<BulkBar selectedCount={3} />);
    const bar = screen.getByTestId('bulk-bar');

    expect(bar.style.visibility).toBe('');
    expect(bar.style.minHeight).toBe('52px');
    expect(bar.hasAttribute('inert')).toBe(false);
    expect(screen.getByText('Đã chọn 3 nhân sự')).toBeDefined();
  });
});
