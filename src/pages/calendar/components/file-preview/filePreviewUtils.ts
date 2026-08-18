/**
 * @fileoverview Helper cho phần xem trước file đính kèm lịch — chuyển thể từ
 * `chat-web-client/src/utils/filePreviewUtils.ts`.
 */

import type { PreviewType } from './mimeRegistry';

export const MAX_TEXT_PREVIEW_SIZE = 2 * 1024 * 1024; // 2MB
export const MAX_TEXT_PREVIEW_LINES = 500;
export const MAX_CSV_PREVIEW_ROWS = 100;
export const ARCHIVE_LARGE_SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB

export type FileIconType =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'spreadsheet'
  | 'presentation'
  | 'document'
  | 'archive'
  | 'generic';

export function getIconTypeFromPreviewType(previewType: PreviewType): FileIconType {
  switch (previewType) {
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
    case 'pdf':
      return 'pdf';
    case 'csv':
    case 'spreadsheet':
      return 'spreadsheet';
    case 'presentation':
      return 'presentation';
    case 'document':
      return 'document';
    case 'archive':
      return 'archive';
    default:
      return 'generic';
  }
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()?.toUpperCase() || '' : '';
}

export function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `${bytes} ${units[i]}`;
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}
