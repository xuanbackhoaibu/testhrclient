/**
 * @fileoverview MIME Type Registry — bảng tra loại file để quyết định cách xem
 * trước. Chuyển thể từ `chat-web-client/src/utils/mimeRegistry.ts`, bỏ phụ
 * thuộc `@hacom/chat-shared-types` (không có ở hr-web) — dùng FileCategory
 * cục bộ thay vì FileType của backend chat.
 */

export type PreviewType =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'csv'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'unknown';

export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'generic';

export type BrowserPreviewCapability = 'full' | 'partial' | 'none';

export interface MimeTypeDefinition {
  mimeType: string;
  extensions: readonly string[];
  previewType: PreviewType;
  category: FileCategory;
  browserPreview: BrowserPreviewCapability;
  description: string;
}

export const MIME_REGISTRY: ReadonlyMap<string, MimeTypeDefinition> = new Map([
  ['image/jpeg', { mimeType: 'image/jpeg', extensions: ['.jpg', '.jpeg'], previewType: 'image', category: 'image', browserPreview: 'full', description: 'JPEG Image' }],
  ['image/png', { mimeType: 'image/png', extensions: ['.png'], previewType: 'image', category: 'image', browserPreview: 'full', description: 'PNG Image' }],
  ['image/gif', { mimeType: 'image/gif', extensions: ['.gif'], previewType: 'image', category: 'image', browserPreview: 'full', description: 'GIF Image' }],
  ['image/webp', { mimeType: 'image/webp', extensions: ['.webp'], previewType: 'image', category: 'image', browserPreview: 'full', description: 'WebP Image' }],
  ['image/bmp', { mimeType: 'image/bmp', extensions: ['.bmp'], previewType: 'image', category: 'image', browserPreview: 'full', description: 'BMP Image' }],
  ['image/svg+xml', { mimeType: 'image/svg+xml', extensions: ['.svg'], previewType: 'image', category: 'image', browserPreview: 'full', description: 'SVG Image' }],

  ['video/mp4', { mimeType: 'video/mp4', extensions: ['.mp4'], previewType: 'video', category: 'video', browserPreview: 'full', description: 'MP4 Video' }],
  ['video/webm', { mimeType: 'video/webm', extensions: ['.webm'], previewType: 'video', category: 'video', browserPreview: 'full', description: 'WebM Video' }],
  ['video/quicktime', { mimeType: 'video/quicktime', extensions: ['.mov'], previewType: 'video', category: 'video', browserPreview: 'partial', description: 'QuickTime Video' }],
  ['video/x-msvideo', { mimeType: 'video/x-msvideo', extensions: ['.avi'], previewType: 'video', category: 'video', browserPreview: 'partial', description: 'AVI Video' }],

  ['audio/mpeg', { mimeType: 'audio/mpeg', extensions: ['.mp3'], previewType: 'audio', category: 'audio', browserPreview: 'full', description: 'MP3 Audio' }],
  ['audio/wav', { mimeType: 'audio/wav', extensions: ['.wav'], previewType: 'audio', category: 'audio', browserPreview: 'full', description: 'WAV Audio' }],
  ['audio/ogg', { mimeType: 'audio/ogg', extensions: ['.ogg'], previewType: 'audio', category: 'audio', browserPreview: 'full', description: 'OGG Audio' }],
  ['audio/mp4', { mimeType: 'audio/mp4', extensions: ['.m4a'], previewType: 'audio', category: 'audio', browserPreview: 'full', description: 'MP4 Audio' }],

  ['application/pdf', { mimeType: 'application/pdf', extensions: ['.pdf'], previewType: 'pdf', category: 'document', browserPreview: 'partial', description: 'PDF Document' }],

  ['text/plain', { mimeType: 'text/plain', extensions: ['.txt'], previewType: 'text', category: 'document', browserPreview: 'full', description: 'Text File' }],
  ['text/markdown', { mimeType: 'text/markdown', extensions: ['.md'], previewType: 'text', category: 'document', browserPreview: 'full', description: 'Markdown File' }],
  ['text/csv', { mimeType: 'text/csv', extensions: ['.csv'], previewType: 'csv', category: 'document', browserPreview: 'full', description: 'CSV File' }],
  ['application/csv', { mimeType: 'application/csv', extensions: ['.csv'], previewType: 'csv', category: 'document', browserPreview: 'full', description: 'CSV File' }],

  ['application/msword', { mimeType: 'application/msword', extensions: ['.doc'], previewType: 'document', category: 'document', browserPreview: 'none', description: 'Word Document' }],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['.docx'], previewType: 'document', category: 'document', browserPreview: 'none', description: 'Word Document' }],

  ['application/vnd.ms-excel', { mimeType: 'application/vnd.ms-excel', extensions: ['.xls'], previewType: 'spreadsheet', category: 'document', browserPreview: 'none', description: 'Excel Spreadsheet' }],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extensions: ['.xlsx'], previewType: 'spreadsheet', category: 'document', browserPreview: 'none', description: 'Excel Spreadsheet' }],

  ['application/vnd.ms-powerpoint', { mimeType: 'application/vnd.ms-powerpoint', extensions: ['.ppt'], previewType: 'presentation', category: 'document', browserPreview: 'none', description: 'PowerPoint Presentation' }],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extensions: ['.pptx'], previewType: 'presentation', category: 'document', browserPreview: 'none', description: 'PowerPoint Presentation' }],

  ['application/vnd.oasis.opendocument.text', { mimeType: 'application/vnd.oasis.opendocument.text', extensions: ['.odt'], previewType: 'document', category: 'document', browserPreview: 'none', description: 'OpenDocument Text' }],
  ['application/vnd.oasis.opendocument.spreadsheet', { mimeType: 'application/vnd.oasis.opendocument.spreadsheet', extensions: ['.ods'], previewType: 'spreadsheet', category: 'document', browserPreview: 'none', description: 'OpenDocument Spreadsheet' }],
  ['application/vnd.oasis.opendocument.presentation', { mimeType: 'application/vnd.oasis.opendocument.presentation', extensions: ['.odp'], previewType: 'presentation', category: 'document', browserPreview: 'none', description: 'OpenDocument Presentation' }],

  ['application/zip', { mimeType: 'application/zip', extensions: ['.zip'], previewType: 'archive', category: 'archive', browserPreview: 'none', description: 'ZIP Archive' }],
  ['application/x-zip-compressed', { mimeType: 'application/x-zip-compressed', extensions: ['.zip'], previewType: 'archive', category: 'archive', browserPreview: 'none', description: 'ZIP Archive' }],
  ['application/x-7z-compressed', { mimeType: 'application/x-7z-compressed', extensions: ['.7z'], previewType: 'archive', category: 'archive', browserPreview: 'none', description: '7-Zip Archive' }],
  ['application/vnd.rar', { mimeType: 'application/vnd.rar', extensions: ['.rar'], previewType: 'archive', category: 'archive', browserPreview: 'none', description: 'RAR Archive' }],
  ['application/x-rar-compressed', { mimeType: 'application/x-rar-compressed', extensions: ['.rar'], previewType: 'archive', category: 'archive', browserPreview: 'none', description: 'RAR Archive' }],
]);

const EXTENSION_TO_MIME: ReadonlyMap<string, string> = new Map(
  Array.from(MIME_REGISTRY.entries()).flatMap(([mime, def]) =>
    def.extensions.map((ext) => [ext.toLowerCase(), mime] as const),
  ),
);

export function getMimeDefinitionByExtension(extension: string): MimeTypeDefinition | undefined {
  const normalized = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  const mimeType = EXTENSION_TO_MIME.get(normalized);
  return mimeType ? MIME_REGISTRY.get(mimeType) : undefined;
}

/** Xác định loại xem trước từ MIME type, dự phòng bằng đuôi file. */
export function getMimePreviewType(mimeType: string | undefined, fileName?: string): PreviewType {
  if (mimeType) {
    const def = MIME_REGISTRY.get(mimeType.toLowerCase());
    if (def) return def.previewType;
  }
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const def = getMimeDefinitionByExtension(ext);
    if (def) return def.previewType;
  }
  return 'unknown';
}

export function isImageMimeType(mimeType: string | undefined): boolean {
  return mimeType?.toLowerCase().startsWith('image/') ?? false;
}
