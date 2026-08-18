/** Gộp danh sách lỗi/cảnh báo của một dòng staging thành một chuỗi hiển thị. */
export function renderMessages(value: unknown): string {
  if (!Array.isArray(value)) {
    return '-';
  }

  return (
    value
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'message' in item) {
          return String((item as { message?: unknown }).message ?? '');
        }
        return String(item);
      })
      .filter(Boolean)
      .join('; ') || '-'
  );
}
