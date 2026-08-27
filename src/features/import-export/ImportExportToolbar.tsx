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
    <Group gap="xs" wrap="nowrap" aria-label={title ?? 'Thao tác Excel'}>
      {showTemplate ? (
        <Button
          variant="default"
          leftSection={<IconDownload size={16} />}
          loading={isDownloadingTemplate}
          onClick={() => void onDownloadTemplate?.()}
        >
          Tải mẫu Excel
        </Button>
      ) : null}
      {showImport ? (
        <Button variant="default" leftSection={<IconUpload size={16} />} onClick={onImport}>
          Import Excel
        </Button>
      ) : null}
      {showExport ? (
        <Button
          variant="default"
          leftSection={<IconFileSpreadsheet size={16} />}
          loading={isExporting}
          onClick={() => void onExport?.()}
        >
          Xuất Excel
        </Button>
      ) : null}
    </Group>
  );
}
