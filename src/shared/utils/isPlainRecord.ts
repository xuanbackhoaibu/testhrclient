/**
 * Kiểm tra một giá trị lạ (payload API, lỗi bắt được) có phải object thường
 * để đọc field theo tên hay không.
 *
 * Loại mảng ra vì `typeof [] === 'object'`: nếu không chặn, một mảng sẽ lọt
 * qua guard rồi đọc field cho ra `undefined` một cách im lặng.
 */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
