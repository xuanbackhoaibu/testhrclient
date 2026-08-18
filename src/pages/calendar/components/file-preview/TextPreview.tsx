/**
 * @fileoverview Xem trước file .txt/.md — chuyển thể từ chat-web's TextPreview.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader, Text } from '@mantine/core';
import { IconFileText } from '@tabler/icons-react';
import { MAX_TEXT_PREVIEW_SIZE, MAX_TEXT_PREVIEW_LINES, formatFileSize } from './filePreviewUtils';
import { truncateFilename } from './truncateFilename';
import styles from './PreviewPanel.module.css';

interface TextPreviewProps {
  url: string;
  fileName: string;
  fileSize?: number;
}

interface TextContent {
  content: string;
  truncated: boolean;
  error?: string;
}

async function parseTextContent(url: string, signal?: AbortSignal): Promise<TextContent> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.split('\n');
    if (text.length > MAX_TEXT_PREVIEW_SIZE || lines.length > MAX_TEXT_PREVIEW_LINES) {
      return { content: lines.slice(0, MAX_TEXT_PREVIEW_LINES).join('\n'), truncated: true };
    }
    return { content: text, truncated: false };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return { content: '', truncated: false, error: 'cancelled' };
    return { content: '', truncated: false, error: 'Không đọc được file' };
  }
}

export function TextPreview({ url, fileName, fileSize }: TextPreviewProps) {
  const [content, setContent] = useState<TextContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset trạng thái loading trước khi parse file mới
    setIsLoading(true);
    setContent(null);
    void parseTextContent(url, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setContent(result);
        setIsLoading(false);
      }
    });
    return () => controller.abort();
  }, [url]);

  const extension = fileName.split('.').pop()?.toUpperCase() || '';

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div style={{ minWidth: 0 }}>
          <Text size="sm" fw={500} truncate title={fileName}>
            {truncateFilename(fileName, 48)}
          </Text>
          <Text size="xs" c="dimmed">
            {formatFileSize(fileSize)} · {extension}
            {content?.truncated && ' · Đã rút gọn'}
          </Text>
        </div>
      </div>
      <div className={styles.panelBody}>
        {isLoading ? (
          <div className={styles.centerState}>
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Đang tải xem trước…</Text>
          </div>
        ) : content?.error && content.error !== 'cancelled' ? (
          <div className={styles.centerState}>
            <IconFileText size={40} />
            <Text size="sm">{content.error}</Text>
          </div>
        ) : (
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 16, fontSize: 13, fontFamily: 'monospace', margin: 0 }}>
            {content?.content}
          </pre>
        )}
      </div>
      {content?.truncated && (
        <div className={styles.toolbar}>
          <Text size="xs" c="dimmed" ta="center" style={{ width: '100%' }}>
            Chỉ hiển thị {MAX_TEXT_PREVIEW_LINES} dòng đầu. Tải về để xem toàn bộ.
          </Text>
        </div>
      )}
    </div>
  );
}

export default TextPreview;
