import { Button, Group } from '@mantine/core';
import { IconDownload, IconFileSpreadsheet, IconUpload } from '@tabler/icons-react';

interface ImportExportToolbarProps {
  title?: string;
  onDownloadTemplate?: () => Promise<void>;
  onImport?: () => void;
  onExport?: () => Promise<void>;
  canImport?: boolean;
  canExport?: boolean;
  isDownloadingTemplate?: boolean;
  isExporting?: boolean;
}

export function ImportExportToolbar({
  title,
  onDownloadTemplate,
  onImport,
  onExport,
  canImport = Boolean(onImport),
  canExport = Boolean(onExport),
  isDownloadingTemplate = false,
  isExporting = false,
}: ImportExportToolbarProps) {
  if (import.meta.env.DEV && onImport && !onDownloadTemplate) {
    console.warn('[ImportExportToolbar] Import Excel requires a template download handler.');
  }

  const showImport = canImport && Boolean(onImport && onDownloadTemplate);
  const showTemplate = Boolean(onDownloadTemplate);
  const showExport = canExport && Boolean(onExport);

  return (
    <Group gap="xs" wrap="wrap" aria-label={title ?? 'Thao tác Excel'}>
      {showTemplate ? (
        <Button
          size="xs"
          leftSection={<IconDownload size={14} />}
          loading={isDownloadingTemplate}
          onClick={() => void onDownloadTemplate?.()}
          variant="default"
        >
          Tải mẫu Excel
        </Button>
      ) : null}
      {showImport ? (
        <Button size="xs" leftSection={<IconUpload size={14} />} onClick={onImport} variant="default">
          Import Excel
        </Button>
      ) : null}
      {showExport ? (
        <Button
          size="xs"
          leftSection={<IconFileSpreadsheet size={14} />}
          loading={isExporting}
          onClick={() => void onExport?.()}
          variant="default"
        >
          Xuất Excel
        </Button>
      ) : null}
    </Group>
  );
}
