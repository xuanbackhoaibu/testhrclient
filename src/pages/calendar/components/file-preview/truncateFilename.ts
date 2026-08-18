/**
 * @fileoverview Rút gọn tên file dài, giữ đuôi mở rộng — chuyển thể từ
 * `chat-web-client/src/utils/truncateFilename.ts`.
 */
export function truncateFilename(name: string, maxLen = 35): string {
  if (!name || name.length <= maxLen) return name;

  const lastDotIndex = name.lastIndexOf('.');
  const hasExtension =
    lastDotIndex > 0 && lastDotIndex < name.length - 1 && name.length - lastDotIndex <= 8;

  let base: string;
  let ext: string;
  if (hasExtension) {
    base = name.slice(0, lastDotIndex);
    ext = name.slice(lastDotIndex);
  } else {
    base = name;
    ext = '';
  }

  const keepLen = maxLen - ext.length - 3;
  if (keepLen <= 0) return name.slice(0, maxLen - 3) + '...';

  const frontLen = Math.ceil(keepLen * 0.6);
  const backLen = Math.floor(keepLen * 0.4);
  const front = base.slice(0, frontLen);
  const back = base.slice(-backLen);

  return `${front}...${back}${ext}`;
}
