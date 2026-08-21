import type { ReactNode } from 'react';
import { Group, Text } from '@mantine/core';

interface InfoRowProps {
  label: string;
  children: ReactNode;
  /**
   * Bề rộng cột nhãn. Các màn khác nhau có nhãn dài ngắn khác nhau nên cần
   * chỉnh, nhưng trong cùng một khối thông tin phải dùng chung một giá trị
   * thì các dòng mới thẳng cột với nhau.
   */
  labelWidth?: number;
  /**
   * Bật cho giá trị dài không có khoảng trắng (token, email, mã máy) để chuỗi
   * tự xuống dòng thay vì đẩy giãn cả hàng.
   */
  breakAll?: boolean;
  /**
   * Hiện dấu "—" mờ khi giá trị rỗng/null, thay vì để trống trơn. Dùng cho các
   * khối "xem thông tin" để người đọc phân biệt được "chưa có dữ liệu" với
   * "dòng bị lỗi không render".
   */
  dashWhenEmpty?: boolean;
}

/** Một dòng "nhãn — giá trị" trong khối xem thông tin (drawer, tab, trang chi tiết). */
export function InfoRow({
  label,
  children,
  labelWidth = 160,
  breakAll = false,
  dashWhenEmpty = false,
}: InfoRowProps) {
  const isEmpty = children === null || children === undefined || children === '';
  const content =
    dashWhenEmpty && isEmpty ? (
      <Text span c="dimmed">
        —
      </Text>
    ) : (
      children
    );
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed" w={labelWidth} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text size="sm" style={breakAll ? { wordBreak: 'break-all' } : undefined}>
        {content}
      </Text>
    </Group>
  );
}
