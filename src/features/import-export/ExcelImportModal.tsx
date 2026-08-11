import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Group, Progress, TextInput } from '@mantine/core';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Modal,
  Row,
  Space,
  Statistic,
  Steps,
  Tabs,
  Typography,
  Upload,
  message,
} from 'antd';
import { DownloadOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';

import { isExcelFile } from '../../shared/utils/excel';
import { BaseTable } from '../../shared/ui';

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
  onResetPreview?: () => void;
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

interface LocalExcelCellIssue {
  columnIndex: number;
  message: string;
}

interface LocalExcelRow {
  id: string;
  rowNumber: number;
  values: string[];
  issues: LocalExcelCellIssue[];
}

function readSummaryNumber(summary: ImportPreviewStat[], label: string): number {
  const item = summary.find((stat) => stat.label === label);
  const value = Number(item?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function stringifyCell(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value == null ? '' : String(value);
}

function looksLikeDateHeader(header: string) {
  const normalized = header.toLowerCase();
  return normalized.includes('date') || normalized.includes('ngay') || normalized.includes('ngày');
}

function isValidDateValue(value: string) {
  if (!value.trim()) {
    return true;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function validateLocalRows(headers: string[], rows: LocalExcelRow[]) {
  return rows.map((row) => {
    const issues: LocalExcelCellIssue[] = [];
    row.values.forEach((value, columnIndex) => {
      const header = headers[columnIndex] ?? `Cột ${columnIndex + 1}`;
      if (!value.trim()) {
        issues.push({ columnIndex, message: `${header}: không được để trống.` });
      }
      if (looksLikeDateHeader(header) && !isValidDateValue(value)) {
        issues.push({ columnIndex, message: `${header}: sai định dạng ngày.` });
      }
    });
    return { ...row, issues };
  });
}

async function createExcelFileFromRows(fileName: string, headers: string[], rows: LocalExcelRow[]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const data = [
    headers.map((value) => ({ value, fontWeight: 'bold' as const })),
    ...rows.map((row) => row.values.map((value) => ({ value }))),
  ];
  const blob = await writeXlsxFile(data, {
    stickyRowsCount: 1,
    columns: headers.map(() => ({ width: 22 })),
  }).toBlob();

  return new File([blob], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function ExcelImportModal({
  open,
  onClose,
  onDownloadTemplate,
  onUpload,
  onCommit,
  onDownloadErrors,
  onResetPreview,
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
  const [localFileName, setLocalFileName] = useState('');
  const [localHeaders, setLocalHeaders] = useState<string[]>([]);
  const [localRows, setLocalRows] = useState<LocalExcelRow[]>([]);
  const [parseProgress, setParseProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [isPreparingUpload, setIsPreparingUpload] = useState(false);

  const localIssueCount = useMemo(
    () => localRows.reduce((total, row) => total + row.issues.length, 0),
    [localRows],
  );
  const hasLocalPreview = localHeaders.length > 0;
  const currentStep = hasPreview ? (hasErrors ? 1 : 2) : 0;
  const errorCount = readSummaryNumber(summary, 'Lỗi');
  const warningCount = readSummaryNumber(summary, 'Cảnh báo');
  const resultMessage = hasErrors
    ? 'Có lỗi cần xử lý'
    : hasWarnings
      ? 'Có cảnh báo cần kiểm tra'
      : 'Dữ liệu hợp lệ';
  const resultDescription = hasErrors
    ? 'Tải file lỗi hoặc mở tab Lỗi để xem chi tiết, sau đó sửa file và upload lại.'
    : hasWarnings
      ? 'Kiểm tra tab Cảnh báo trước khi xác nhận import.'
      : 'Bạn có thể xác nhận import sau khi đã kiểm tra preview.';

  function resetLocalPreview() {
    setLocalFileName('');
    setLocalHeaders([]);
    setLocalRows([]);
    setParseProgress(0);
    setIsParsing(false);
    setIsPreparingUpload(false);
  }

  async function parseLocalExcel(file: File) {
    setLocalFileName(file.name);
    setIsParsing(true);
    setParseProgress(8);

    try {
      const { default: readXlsxFile } = await import('read-excel-file/browser');
      const progressTimer = window.setInterval(() => {
        setParseProgress((current) => Math.min(current + 12, 86));
      }, 120);
      const parsed = await readXlsxFile(file);
      window.clearInterval(progressTimer);
      setParseProgress(92);

      const matrix = Array.isArray(parsed) ? parsed as unknown[][] : [];
      const headers = (matrix[0] ?? []).map((cell, index) => stringifyCell(cell).trim() || `Cột ${index + 1}`);
      const rows = matrix.slice(1).map<LocalExcelRow>((row, index) => ({
        id: `local-row-${index + 2}`,
        rowNumber: index + 2,
        values: headers.map((_, columnIndex) => stringifyCell(row[columnIndex])),
        issues: [],
      }));

      setLocalHeaders(headers);
      setLocalRows(validateLocalRows(headers, rows));
      setParseProgress(100);
    } catch {
      message.error('Không đọc được file Excel. Vui lòng kiểm tra lại file .xlsx.');
      resetLocalPreview();
    } finally {
      setIsParsing(false);
    }
  }

  const updateLocalCell = useCallback((rowId: string, columnIndex: number, value: string) => {
    setLocalRows((current) => {
      const next = current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              values: row.values.map((cellValue, index) => index === columnIndex ? value : cellValue),
            }
          : row,
      );
      return validateLocalRows(localHeaders, next);
    });
  }, [localHeaders]);

  async function uploadLocalPreview() {
    if (!hasLocalPreview || localIssueCount > 0) {
      message.error('Vui lòng sửa hết lỗi trong bảng preview trước khi kiểm tra file.');
      return;
    }

    setIsPreparingUpload(true);
    try {
      const correctedFile = await createExcelFileFromRows(localFileName, localHeaders, localRows);
      await onUpload(correctedFile);
    } finally {
      setIsPreparingUpload(false);
    }
  }

  const localPreviewColumns = useMemo(
    () => [
      { title: 'Dòng', dataIndex: 'rowNumber', width: 72, fixed: 'left' as const },
      ...localHeaders.map((header, columnIndex) => ({
        title: header,
        render: (_: unknown, row: LocalExcelRow) => {
          const hasIssue = row.issues.some((issue) => issue.columnIndex === columnIndex);
          return (
            <TextInput
              value={row.values[columnIndex] ?? ''}
              size="xs"
              error={hasIssue}
              onChange={(event) => updateLocalCell(row.id, columnIndex, event.currentTarget.value)}
            />
          );
        },
      })),
      {
        title: 'Lỗi',
        width: 240,
        render: (_: unknown, row: LocalExcelRow) =>
          row.issues.length ? row.issues.map((issue) => issue.message).join('; ') : 'Hợp lệ',
      },
    ],
    [localHeaders, updateLocalCell],
  );

  return (
    <Modal
      open={open}
      title={title}
      width={1080}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        hasLocalPreview && !hasPreview ? (
          <Button
            key="reset-local"
            icon={<ReloadOutlined />}
            disabled={isUploading || isParsing || isPreparingUpload}
            onClick={resetLocalPreview}
          >
            Chọn file khác
          </Button>
        ) : null,
        hasPreview && onResetPreview ? (
          <Button
            key="reset"
            icon={<ReloadOutlined />}
            disabled={isUploading || isCommitting}
            onClick={() => {
              resetLocalPreview();
              onResetPreview();
            }}
          >
            Chọn file khác
          </Button>
        ) : null,
        onDownloadErrors ? (
          <Button
            key="errors"
            icon={<DownloadOutlined />}
            disabled={!hasPreview || !hasErrors}
            loading={isDownloadingErrors}
            onClick={() => void onDownloadErrors()}
          >
            Tải file lỗi
          </Button>
        ) : null,
        onCommit ? (
          <Button
            key="commit"
            type="primary"
            disabled={!canCommit || hasErrors}
            loading={isCommitting}
            onClick={() => void onCommit()}
          >
            Xác nhận import
          </Button>
        ) : null,
        hasLocalPreview && !hasPreview ? (
          <Button
            key="server-preview"
            type="primary"
            disabled={localIssueCount > 0 || isParsing}
            loading={isUploading || isPreparingUpload}
            onClick={() => void uploadLocalPreview()}
          >
            Kiểm tra file
          </Button>
        ) : null,
      ]}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }} className="excel-import-modal">
        <Card size="small" className="excel-import-guide">
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <Steps
              size="small"
              current={currentStep}
              items={[
                { title: 'Tải mẫu' },
                { title: 'Kiểm tra file' },
                { title: 'Xác nhận' },
              ]}
            />
            <Alert
              type="info"
              showIcon
              message="Quy trình import"
              description={description}
            />
            <Space wrap>
              <Button
                icon={<DownloadOutlined />}
                loading={isDownloadingTemplate}
                disabled={isDownloadingTemplate}
                onClick={() => void onDownloadTemplate()}
              >
                Tải mẫu Excel
              </Button>
            </Space>
          </Space>
        </Card>

        {isParsing || parseProgress > 0 && !hasPreview ? (
          <Card size="small">
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              <Typography.Text strong>Đang parse file Excel</Typography.Text>
              <Progress value={parseProgress} animated={isParsing} />
              <Typography.Text type="secondary">
                File lớn có thể mất vài giây; tiến trình này chạy trên trình duyệt trước khi gửi lên server.
              </Typography.Text>
            </Space>
          </Card>
        ) : null}

        {!hasPreview && !hasLocalPreview ? (
          <Upload.Dragger
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            showUploadList={false}
            disabled={isUploading || isParsing}
            beforeUpload={(file) => {
              if (!isExcelFile(file) || !file.name.toLowerCase().endsWith('.xlsx')) {
                message.error('Chỉ chấp nhận file Excel .xlsx.');
                return Upload.LIST_IGNORE;
              }
              void parseLocalExcel(file);
              return false;
            }}
            className="excel-import-dropzone"
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <Typography.Text strong>
              {isUploading ? 'Đang kiểm tra file...' : 'Kéo thả hoặc chọn file Excel'}
            </Typography.Text>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Chỉ nhận file .xlsx theo mẫu của hệ thống.
            </Typography.Paragraph>
          </Upload.Dragger>
        ) : null}

        {hasLocalPreview && !hasPreview ? (
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type={localIssueCount ? 'error' : 'success'}
              showIcon
              message={localIssueCount ? `Còn ${localIssueCount} lỗi cần sửa trước khi gửi kiểm tra` : 'Preflight Excel hợp lệ'}
              description="HR có thể sửa trực tiếp các ô trong bảng này. File đã chỉnh sẽ được tạo lại rồi mới gửi lên bước preview của server."
            />
            <Group justify="space-between">
              <Typography.Text strong>{localRows.length} dòng dữ liệu</Typography.Text>
              <Typography.Text type={localIssueCount ? 'danger' : 'success'}>
                {localIssueCount ? `${localIssueCount} lỗi` : 'Không có lỗi client-side'}
              </Typography.Text>
            </Group>
            <BaseTable
              rowKey="id"
              size="small"
              dataSource={localRows}
              columns={localPreviewColumns}
              pagination={{ pageSize: 8 }}
              rowClassName={(row) => row.issues.length ? 'excel-import-row-error' : ''}
              scroll={{ x: Math.max(960, localHeaders.length * 180) }}
            />
          </Space>
        ) : null}

        {hasPreview ? (
          <Alert
            type={hasErrors ? 'error' : hasWarnings ? 'warning' : 'success'}
            showIcon
            message={resultMessage}
            description={resultDescription}
            action={
              hasErrors || onResetPreview ? (
                <Space wrap>
                  {hasErrors && onDownloadErrors ? (
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      loading={isDownloadingErrors}
                      onClick={() => void onDownloadErrors()}
                    >
                      Tải file lỗi
                    </Button>
                  ) : null}
                  {onResetPreview ? (
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      disabled={isUploading || isCommitting}
                      onClick={onResetPreview}
                    >
                      Chọn file khác
                    </Button>
                  ) : null}
                </Space>
              ) : undefined
            }
          />
        ) : null}

        {summary.length ? (
          <Row gutter={[12, 12]}>
            {summary.map((item) => (
              <Col key={item.label} xs={12} sm={8} md={6}>
                <Card size="small" className="excel-import-stat">
                  <Statistic title={item.label} value={item.value} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : null}

        {hasPreview ? (
          <Tabs
            items={[
              { key: 'preview', label: 'Preview', children: previewContent },
              {
                key: 'errors',
                label: <Badge count={errorCount} size="small">Lỗi</Badge>,
                children: errorsContent,
              },
              {
                key: 'warnings',
                label: <Badge count={warningCount} size="small">Cảnh báo</Badge>,
                children: warningsContent,
              },
            ]}
          />
        ) : null}
      </Space>
    </Modal>
  );
}
