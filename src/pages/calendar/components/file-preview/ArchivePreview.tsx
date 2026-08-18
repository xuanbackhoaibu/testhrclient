/**
 * @fileoverview Thẻ dự phòng cho file nén (.zip/.rar/.7z) — không giải nén,
 * chỉ tải về. Chuyển thể từ chat-web's ArchivePreview.
 */
import { Alert, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconDownload, IconExternalLink, IconFileZip } from '@tabler/icons-react';
import { ARCHIVE_LARGE_SIZE_THRESHOLD, formatFileSize, getFileExtension } from './filePreviewUtils';
import { truncateFilename } from './truncateFilename';
import { downloadResourceWithName, openResourceInNewTab } from './downloadFile';
import styles from './PreviewPanel.module.css';

interface ArchivePreviewProps {
  url: string;
  fileName: string;
  fileSize?: number;
}

export function ArchivePreview({ url, fileName, fileSize }: ArchivePreviewProps) {
  const extension = getFileExtension(fileName);
  const isLarge = (fileSize ?? 0) > ARCHIVE_LARGE_SIZE_THRESHOLD;

  return (
    <div className={styles.card}>
      <Group align="flex-start" gap="md" wrap="nowrap">
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--mantine-color-yellow-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconFileZip size={24} color="var(--mantine-color-yellow-8)" />
        </div>
        <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" fw={500} truncate title={fileName}>
            {truncateFilename(fileName, 48)}
          </Text>
          <Group gap={6}>
            {extension && <Badge size="xs" variant="outline">{extension}</Badge>}
            <Text size="xs" c="dimmed">{formatFileSize(fileSize)}</Text>
          </Group>
        </Stack>
      </Group>

      {isLarge && (
        <Alert mt="sm" color="orange" icon={<IconAlertTriangle size={16} />} title="File nén dung lượng lớn">
          Việc tải về có thể mất thời gian tùy tốc độ mạng.
        </Alert>
      )}

      <Text size="sm" c="dimmed" mt="sm">
        Không thể xem trước nội dung file nén vì lý do bảo mật. Tải về và giải nén bằng công cụ bạn quen dùng.
      </Text>

      <Group mt="md" gap="xs">
        <Button size="xs" leftSection={<IconDownload size={14} />} onClick={() => void downloadResourceWithName(url, fileName || 'archive')}>
          Tải về
        </Button>
        <Button size="xs" variant="default" leftSection={<IconExternalLink size={14} />} onClick={() => openResourceInNewTab(url, fileName, false)}>
          Mở tab mới
        </Button>
      </Group>
    </div>
  );
}

export default ArchivePreview;
