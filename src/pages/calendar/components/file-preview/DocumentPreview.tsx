/**
 * @fileoverview Xem trước tài liệu Office qua Microsoft Office Online (cần URL
 * công khai http/https) — chuyển thể từ chat-web's DocumentPreview. Với file
 * chọn cục bộ (blob: URL) sẽ không công khai được nên tự rơi về thẻ tải về;
 * component cha (CalendarFilePreviewModal) đã ưu tiên WordPreview/ExcelPreview
 * (tự dựng lại trong trình duyệt) trước khi rơi xuống đây.
 */
import { useCallback, useMemo, useState } from 'react';
import { Badge, Button, Group, Stack, Text } from '@mantine/core';
import { IconDownload, IconExternalLink } from '@tabler/icons-react';
import type { PreviewType } from './mimeRegistry';
import { formatFileSize, getFileExtension } from './filePreviewUtils';
import { truncateFilename } from './truncateFilename';
import { downloadResourceWithName, openResourceInNewTab } from './downloadFile';
import { FileTypeIcon } from './FileTypeIcon';
import styles from './PreviewPanel.module.css';

interface DocumentPreviewProps {
  url: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  previewType: PreviewType;
}

function getDocDescription(mimeType?: string): string {
  if (!mimeType) return '';
  if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) return 'Microsoft Word';
  if (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')) return 'Microsoft Excel';
  if (mimeType.includes('presentationml') || mimeType.includes('mspowerpoint')) return 'Microsoft PowerPoint';
  return '';
}

/** URL mà Office Online có thể fetch được: phải là http(s) công khai, không phải blob:/localhost. */
function isPubliclyViewableUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}

const buildOfficeViewerUrl = (fileUrl: string): string =>
  `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;

export function DocumentPreview({ url, fileName, fileSize, mimeType, previewType }: DocumentPreviewProps) {
  const [iframeFailed, setIframeFailed] = useState(false);
  const iconType = previewType === 'spreadsheet' ? 'spreadsheet' : previewType === 'presentation' ? 'presentation' : 'document';
  const extension = getFileExtension(fileName);
  const docDescription = getDocDescription(mimeType);

  const handleDownload = useCallback(async () => {
    await downloadResourceWithName(url, fileName || 'document');
  }, [fileName, url]);
  const handleOpenInNewTab = useCallback(() => openResourceInNewTab(url, fileName, false), [fileName, url]);

  const canEmbed = useMemo(() => Boolean(url) && isPubliclyViewableUrl(url), [url]);
  const viewerUrl = useMemo(() => (canEmbed ? buildOfficeViewerUrl(url) : null), [canEmbed, url]);

  if (viewerUrl && !iframeFailed) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <FileTypeIcon type={iconType} fileName={fileName} size={24} />
            <div style={{ minWidth: 0 }}>
              <Text size="sm" fw={500} truncate title={fileName}>
                {truncateFilename(fileName, 48)}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {[extension, formatFileSize(fileSize), docDescription].filter(Boolean).join(' · ')}
              </Text>
            </div>
          </Group>
          <Group gap={6}>
            <Button size="xs" variant="default" leftSection={<IconDownload size={14} />} onClick={() => void handleDownload()}>
              Tải về
            </Button>
            <Button size="xs" variant="default" leftSection={<IconExternalLink size={14} />} onClick={handleOpenInNewTab}>
              Mở tab mới
            </Button>
          </Group>
        </div>
        <iframe
          src={viewerUrl}
          title={fileName || 'document preview'}
          className={styles.iframe}
          style={{ flex: 1, minHeight: 0 }}
          onError={() => setIframeFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <Group align="flex-start" gap="md" wrap="nowrap">
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--mantine-color-blue-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileTypeIcon type={iconType} fileName={fileName} size={26} />
        </div>
        <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" fw={500} truncate title={fileName}>
            {truncateFilename(fileName, 48)}
          </Text>
          <Group gap={6}>
            {extension && <Badge size="xs" variant="outline">{extension}</Badge>}
            <Text size="xs" c="dimmed">{formatFileSize(fileSize)}</Text>
            {docDescription && <Text size="xs" c="dimmed">{docDescription}</Text>}
          </Group>
        </Stack>
      </Group>

      <Text size="sm" c="dimmed" mt="sm">
        Không có bản xem trước cho định dạng này. Tải file về để mở bằng phần mềm phù hợp.
      </Text>

      <Group mt="md" gap="xs">
        <Button size="xs" leftSection={<IconDownload size={14} />} onClick={() => void handleDownload()}>
          Tải về
        </Button>
        <Button size="xs" variant="default" leftSection={<IconExternalLink size={14} />} onClick={handleOpenInNewTab}>
          Mở tab mới
        </Button>
      </Group>
    </div>
  );
}

export default DocumentPreview;
