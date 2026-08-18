import { useRef, useState } from 'react';
import { Group, Stack, Text } from '@mantine/core';
import { IconPaperclip } from '@tabler/icons-react';
import { CalendarAttachmentItem } from './file-preview';
import type { CalendarAttachmentDto } from '../../../features/calendar/calendarSharedTypes';

interface CalendarAttachmentDropzoneProps {
  /** File vừa chọn ở form này, CHƯA upload — sẽ được upload thật lúc bấm Lưu. */
  localFiles: File[];
  onLocalFilesChange: (files: File[]) => void;
  /** Khi sửa lịch: file đã lưu thật trên server từ trước (đọc từ `event.attachments`). */
  remoteAttachments?: CalendarAttachmentDto[];
  /** Bỏ 1 file đã lưu khỏi danh sách — server sẽ xoá đính kèm này lúc lưu (reconcile theo full set). */
  onRemoveRemote?: (fileId: string) => void;
  maxFiles?: number;
  maxSizeMb?: number;
}

/**
 * Khu vực kéo-thả/chọn file đính kèm cho lịch.
 *
 * File chọn ở đây được upload THẬT lên chat-api-service (purpose
 * `calendar_attachment`) ngay khi form submit — xem
 * `features/calendar/calendarAttachmentUpload.ts` — rồi gửi `fileId` cho
 * hr-api qua `attachmentFileIds`. Vì vậy file đính kèm được lưu trên server,
 * xem được trên MỌI máy/trình duyệt, không còn giới hạn "chỉ máy đã tạo mới
 * thấy" như trước.
 *
 * Danh sách hiển thị gồm 2 nhóm:
 *  - `localFiles`: vừa chọn ở form này, CHƯA upload (bấm xoá = bỏ chọn).
 *  - `remoteAttachments`: đã lưu thật trên server từ lần lưu trước (chỉ có
 *    khi sửa lịch); bấm xoá = đánh dấu gỡ khỏi lịch, server xoá khi lưu.
 */
export function CalendarAttachmentDropzone({
  localFiles,
  onLocalFilesChange,
  remoteAttachments = [],
  onRemoveRemote,
  maxFiles = 10,
  maxSizeMb = 50,
}: CalendarAttachmentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const totalCount = localFiles.length + remoteAttachments.length;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const remainingSlots = Math.max(0, maxFiles - totalCount);
    const next = [...localFiles, ...Array.from(list).slice(0, remainingSlots)];
    onLocalFilesChange(next);
  };

  const removeLocalFile = (index: number) => {
    onLocalFilesChange(localFiles.filter((_, i) => i !== index));
  };

  return (
    <Stack gap={6}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        style={{
          border: `1px dashed ${isDragOver ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-4)'}`,
          borderRadius: 'var(--mantine-radius-sm)',
          padding: 'var(--mantine-spacing-lg)',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragOver ? 'var(--mantine-color-blue-0)' : undefined,
        }}
      >
        <IconPaperclip size={20} style={{ color: 'var(--mantine-color-gray-5)' }} />
        <Text size="sm" mt={4}>
          Kéo thả file / ảnh vào đây, hoặc{' '}
          <Text component="span" c="blue" fw={500}>
            bấm để chọn
          </Text>
        </Text>
        <Text size="xs" c="dimmed" mt={2}>
          Tối đa {maxFiles} file · mỗi file ≤ {maxSizeMb} MB
        </Text>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.currentTarget.files);
            e.currentTarget.value = '';
          }}
        />
      </div>

      {totalCount > 0 && (
        <Group gap={6}>
          {remoteAttachments.map((att) => (
            <CalendarAttachmentItem
              key={att.fileId}
              file={{ name: att.filename ?? 'Tệp đính kèm', size: att.sizeBytes, mimeType: att.mimeType }}
              isSaved
              onRemove={onRemoveRemote ? () => onRemoveRemote(att.fileId) : undefined}
            />
          ))}
          {localFiles.map((file, index) => (
            <CalendarAttachmentItem
              key={`${file.name}-${index}`}
              file={{ name: file.name, size: file.size, mimeType: file.type }}
              onRemove={() => removeLocalFile(index)}
            />
          ))}
        </Group>
      )}
    </Stack>
  );
}
