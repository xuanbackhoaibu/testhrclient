import type { ReactNode } from 'react';
import { Alert, Button, FileButton, Group, Modal, Stack, Tabs, Text } from '@mantine/core';
import { IconDownload, IconUpload } from '@tabler/icons-react';

import { isExcelFile } from '../../shared/utils/excel';
import { toast } from '../../shared/utils/toast';

export interface ImportPreviewStat {
  label: string;
  value: number | string;
}

interface ExcelImportModalProps {
  open: boolean;
  onClose: () => void;
  onDownloadTemplate: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  onCommit?: () => Promise<void>;
  onDownloadErrors?: () => Promise<void>;
  title?: string;
  description?: string;
  summary?: ImportPreviewStat[];
  previewContent?: ReactNode;
  errorsContent?: ReactNode;
  warningsContent?: ReactNode;
  hasPreview?: boolean;
  hasErrors?: boolean;
  hasWarnings?: boolean;
  canCommit?: boolean;
  isDownloadingTemplate?: boolean;
  isUploading?: boolean;
  isCommitting?: boolean;
  isDownloadingErrors?: boolean;
}

const EXCEL_ACCEPT =
  '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function ExcelImportModal({
  open,
  onClose,
  onDownloadTemplate,
  onUpload,
  onCommit,
  onDownloadErrors,
  title = 'Import dữ liệu từ Excel',
  description = 'Vui lòng tải mẫu Excel, điền dữ liệu và upload lại file đã hoàn thiện.',
  summary = [],
  previewContent,
  errorsContent,
  warningsContent,
  hasPreview = false,
  hasErrors = false,
  hasWarnings = false,
  canCommit = false,
  isDownloadingTemplate = false,
  isUploading = false,
  isCommitting = false,
  isDownloadingErrors = false,
}: ExcelImportModalProps) {
  function handleFile(file: File | null) {
    if (!file) {
      return;
    }
    if (!isExcelFile(file) || !file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Chỉ chấp nhận file Excel .xlsx.');
      return;
    }
    void onUpload(file);
  }

  return (
    <Modal opened={open} title={title} size={1080} onClose={onClose}>
      <Stack gap="md">
        <Alert color="blue" title="Quy trình import">
          {description}
        </Alert>

        <Group gap="xs" wrap="wrap">
          <Button
            variant="default"
            leftSection={<IconDownload size={16} />}
            loading={isDownloadingTemplate}
            onClick={() => void onDownloadTemplate()}
          >
            Tải mẫu Excel
          </Button>
          <FileButton onChange={handleFile} accept={EXCEL_ACCEPT}>
            {(props) => (
              <Button {...props} variant="default" leftSection={<IconUpload size={16} />} loading={isUploading}>
                Chọn file Excel
              </Button>
            )}
          </FileButton>
        </Group>

        {hasPreview ? (
          <Alert
            color={hasErrors ? 'red' : hasWarnings ? 'yellow' : 'green'}
            title={hasErrors ? 'Có lỗi cần xử lý' : 'Dữ liệu hợp lệ'}
          >
            {hasErrors
              ? 'Vui lòng tải file lỗi, sửa dữ liệu và upload lại trước khi import.'
              : hasWarnings
                ? 'Dữ liệu có cảnh báo. Hãy kiểm tra trước khi xác nhận import.'
                : 'Bạn có thể xác nhận import sau khi đã kiểm tra preview.'}
          </Alert>
        ) : null}

        {summary.length ? (
          <Group gap="xl" wrap="wrap">
            {summary.map((item) => (
              <Stack key={item.label} gap={2}>
                <Text size="xs" c="dimmed">
                  {item.label}
                </Text>
                <Text fw={600} size="lg">
                  {item.value}
                </Text>
              </Stack>
            ))}
          </Group>
        ) : null}

        {hasPreview ? (
          <Tabs defaultValue="preview">
            <Tabs.List>
              <Tabs.Tab value="preview">Preview</Tabs.Tab>
              <Tabs.Tab value="errors">Lỗi</Tabs.Tab>
              <Tabs.Tab value="warnings">Cảnh báo</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="preview" pt="md">
              {previewContent}
            </Tabs.Panel>
            <Tabs.Panel value="errors" pt="md">
              {errorsContent}
            </Tabs.Panel>
            <Tabs.Panel value="warnings" pt="md">
              {warningsContent}
            </Tabs.Panel>
          </Tabs>
        ) : null}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Đóng
          </Button>
          {onDownloadErrors ? (
            <Button
              variant="default"
              leftSection={<IconDownload size={16} />}
              disabled={!hasPreview || !hasErrors}
              loading={isDownloadingErrors}
              onClick={() => void onDownloadErrors()}
            >
              Tải file lỗi
            </Button>
          ) : null}
          {onCommit ? (
            <Button disabled={!canCommit || hasErrors} loading={isCommitting} onClick={() => void onCommit()}>
              Xác nhận import
            </Button>
          ) : null}
        </Group>
      </Stack>
    </Modal>
  );
}
