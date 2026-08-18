/**
 * @fileoverview Kho lưu file đính kèm lịch TRONG BỘ NHỚ khi chạy mock
 * (`VITE_USE_MOCKS=true`) — không có chat-api-service thật để reserve/PUT/
 * complete, nên `uploadCalendarAttachment` (xem `calendarAttachmentUpload.ts`)
 * chuyển sang lưu thẳng `File` ở đây, sinh `fileId` giả và trả về `blob:` URL
 * qua `URL.createObjectURL` để xem trước/tải về hoạt động y như thật.
 *
 * Vòng đời: chỉ tồn tại trong phiên trình duyệt hiện tại (mất khi reload),
 * giống hệt `mockCalendarEvents` (mảng in-memory) — đúng bản chất của mock
 * mode, không cần bền vững qua session.
 */
export interface MockCalendarAttachmentRecord {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** blob: URL — chỉ dùng được trong tab trình duyệt hiện tại. */
  url: string;
}

const registry = new Map<string, MockCalendarAttachmentRecord>();

let counter = 0;

export function storeMockCalendarAttachment(file: File): MockCalendarAttachmentRecord {
  counter += 1;
  const fileId = `mock-cal-file-${Date.now()}-${counter}`;
  const record: MockCalendarAttachmentRecord = {
    fileId,
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    url: URL.createObjectURL(file),
  };
  registry.set(fileId, record);
  return record;
}

export function getMockCalendarAttachment(fileId: string): MockCalendarAttachmentRecord | undefined {
  return registry.get(fileId);
}

/** Map nhiều fileId cùng lúc, bỏ qua id không tìm thấy (vd. đã bị xoá / khác phiên). */
export function getMockCalendarAttachments(fileIds: string[]): MockCalendarAttachmentRecord[] {
  return fileIds
    .map((id) => registry.get(id))
    .filter((record): record is MockCalendarAttachmentRecord => Boolean(record));
}
