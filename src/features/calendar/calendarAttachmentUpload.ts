/**
 * @fileoverview Upload file đính kèm lịch THẬT lên `chat-api-service`, theo
 * đúng flow `reserve → PUT (nhị phân) → complete` mà chat-api đã hỗ trợ sẵn
 * cho purpose `calendar_attachment` (không cần `conversationId`). Xem hợp
 * đồng kỹ thuật gốc:
 * `chat-api-service/docs/requests/FE__calendar-attachments__contract__01-07-26.md`.
 *
 * File tải lên xong trả về `fileId` — đây là giá trị FE gửi cho hr-api trong
 * `attachmentFileIds` khi tạo/sửa sự kiện (xem `calendarApi.ts`). hr-api lưu
 * nguyên `fileId`, tự resolve metadata + URL tải qua chat-api khi trả về chi
 * tiết sự kiện — FE KHÔNG cần tự lưu URL.
 *
 * QUAN TRỌNG VỀ HOST: chat-api-service chạy trên một host RIÊNG, khác hẳn
 * host của hr-api-service (nơi phần lớn request của app này gọi tới) và cũng
 * khác host chat-auth-service (nơi đăng nhập). Ba service này CÙNG chấp nhận
 * chung một access token (JWT) do chat-auth-service phát hành, nên gọi thẳng
 * từ trình duyệt sang chat-api bằng đúng access token hiện có là hợp lệ, MIỄN
 * LÀ:
 *   1. `VITE_CHAT_API_BASE_URL` được cấu hình đúng (xem vite-env.d.ts).
 *   2. chat-api-service đã whitelist origin của hr-web-client trong
 *      `CORS_ORIGIN` (cấu hình phía server, không phải code FE).
 * Thiếu 1 trong 2 điều trên sẽ khiến upload thất bại — hàm dưới đây NÉM LỖI
 * rõ ràng thay vì âm thầm rơi về lưu tạm (đúng loại lỗi từng khiến tính năng
 * này "chỉ người tạo thấy file" ở các service khác trước đây).
 */

import { getAccessToken } from '../auth/authClient';
import { mockDelay } from '../../shared/mocks/mockHelpers';
import { storeMockCalendarAttachment } from '../../shared/mocks/mockCalendarAttachments';

// Cùng cờ mock với calendarApi.ts — trong mock mode không có chat-api-service
// thật để reserve/PUT/complete, nên lưu thẳng File vào bộ nhớ (xem
// mockCalendarAttachments.ts) và trả về ngay, không gọi mạng.
const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export class CalendarAttachmentUploadError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NOT_CONFIGURED'
      | 'NOT_AUTHENTICATED'
      | 'RESERVE_FAILED'
      | 'PUT_FAILED'
      | 'COMPLETE_FAILED' = 'RESERVE_FAILED',
  ) {
    super(message);
    this.name = 'CalendarAttachmentUploadError';
  }
}

function resolveChatApiBaseUrl(): string {
  const configured = import.meta.env.VITE_CHAT_API_BASE_URL?.trim();
  if (!configured) {
    throw new CalendarAttachmentUploadError(
      'Chưa cấu hình VITE_CHAT_API_BASE_URL (host của chat-api-service) — ' +
        'không thể tải file đính kèm lên server. Liên hệ quản trị hệ thống ' +
        'để thêm biến môi trường này khi deploy.',
      'NOT_CONFIGURED',
    );
  }
  return configured.replace(/\/+$/, '');
}

interface ReserveResponse {
  uploadId: string;
  uploadUrl: string;
  uploadMethod?: string;
  uploadHeaders?: Record<string, string>;
  objectKey?: string;
}

interface CompleteResponse {
  fileId: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  errorCode?: string;
  data: T;
}

async function chatApiFetch<T>(path: string, init: RequestInit): Promise<T> {
  const baseUrl = resolveChatApiBaseUrl();
  const token = getAccessToken();
  if (!token) {
    throw new CalendarAttachmentUploadError(
      'Phiên đăng nhập không hợp lệ — vui lòng đăng nhập lại trước khi đính kèm file.',
      'NOT_AUTHENTICATED',
    );
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const envelope = body as ApiEnvelope<unknown> | null;
    throw new CalendarAttachmentUploadError(
      envelope?.message || `chat-api trả lỗi HTTP ${response.status} khi upload file đính kèm.`,
    );
  }

  const envelope = body as ApiEnvelope<T> | null;
  if (!envelope || envelope.success === false) {
    throw new CalendarAttachmentUploadError(
      envelope?.message || 'chat-api trả phản hồi không hợp lệ khi upload file đính kèm.',
    );
  }
  return envelope.data;
}

/** Kết quả 1 file đã upload xong — dùng để gộp vào `attachmentFileIds`. */
export interface UploadedCalendarAttachment {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Upload một file đính kèm lịch: reserve chữ ký PUT → đẩy nhị phân → complete.
 * Ném `CalendarAttachmentUploadError` nếu bất kỳ bước nào thất bại — gọi nơi
 * dùng hàm này nên báo lỗi rõ cho người dùng (không lưu tạm âm thầm nữa).
 */
export async function uploadCalendarAttachment(file: File): Promise<UploadedCalendarAttachment> {
  if (isMockMode) {
    await mockDelay();
    const record = storeMockCalendarAttachment(file);
    return {
      fileId: record.fileId,
      filename: record.filename,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
    };
  }

  let reserved: ReserveResponse;
  try {
    reserved = await chatApiFetch<ReserveResponse>('/files/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purpose: 'calendar_attachment',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }),
    });
  } catch (error) {
    if (error instanceof CalendarAttachmentUploadError) throw error;
    throw new CalendarAttachmentUploadError(
      `Không thể xin URL tải lên cho "${file.name}": ${(error as Error).message}`,
      'RESERVE_FAILED',
    );
  }

  try {
    const putResponse = await fetch(reserved.uploadUrl, {
      method: reserved.uploadMethod || 'PUT',
      headers: {
        ...(reserved.uploadHeaders ?? {}),
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    if (!putResponse.ok) {
      throw new Error(`HTTP ${putResponse.status}`);
    }
  } catch (error) {
    throw new CalendarAttachmentUploadError(
      `Tải nội dung file "${file.name}" lên storage thất bại: ${(error as Error).message}`,
      'PUT_FAILED',
    );
  }

  try {
    const completed = await chatApiFetch<CompleteResponse>('/files/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId: reserved.uploadId,
        objectKey: reserved.objectKey,
      }),
    });
    return {
      fileId: completed.fileId,
      filename: completed.filename ?? file.name,
      mimeType: completed.mimeType ?? file.type,
      sizeBytes: completed.sizeBytes ?? file.size,
    };
  } catch (error) {
    if (error instanceof CalendarAttachmentUploadError) throw error;
    throw new CalendarAttachmentUploadError(
      `Hoàn tất upload "${file.name}" thất bại: ${(error as Error).message}`,
      'COMPLETE_FAILED',
    );
  }
}

/**
 * Upload nhiều file tuần tự (đơn giản, tránh làm nghẽn upload-url rate
 * limiter phía chat-api). Dừng ngay khi có file lỗi — ném lỗi kèm tên file.
 */
export async function uploadCalendarAttachments(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<UploadedCalendarAttachment[]> {
  const results: UploadedCalendarAttachment[] = [];
  for (const file of files) {
    results.push(await uploadCalendarAttachment(file));
    onProgress?.(results.length, files.length);
  }
  return results;
}
