/**
 * @fileoverview Tải / mở file đính kèm giữ đúng tên gốc — chuyển thể từ
 * `chat-web-client/src/utils/downloadFile.ts`.
 */
const DEFAULT_NAME = 'download';

const triggerAnchorDownload = (
  href: string,
  fileName: string,
  { newTab = false }: { newTab?: boolean } = {},
): void => {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  if (newTab) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const downloadResourceWithName = async (
  url: string,
  fileName?: string | null,
): Promise<void> => {
  const safeName = (fileName ?? '').trim() || DEFAULT_NAME;
  if (!url) return;

  // blob: URL (file chọn cục bộ, chưa upload) đã cùng-origin — tải thẳng.
  if (url.startsWith('blob:')) {
    triggerAnchorDownload(url, safeName);
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    triggerAnchorDownload(blobUrl, safeName);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    triggerAnchorDownload(url, safeName, { newTab: true });
  }
};

export const openResourceInNewTab = (
  url: string,
  fileName: string | null | undefined,
  inlineViewable: boolean,
): void => {
  if (!url) return;
  if (inlineViewable) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void downloadResourceWithName(url, fileName);
};
