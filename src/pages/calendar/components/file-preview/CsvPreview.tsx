/**
 * @fileoverview Xem trước file .csv dạng bảng — chuyển thể từ chat-web's CsvPreview.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Loader, Table, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconTable } from '@tabler/icons-react';
import { MAX_CSV_PREVIEW_ROWS, formatFileSize } from './filePreviewUtils';
import { truncateFilename } from './truncateFilename';
import styles from './PreviewPanel.module.css';

interface CsvPreviewProps {
  url: string;
  fileName: string;
  fileSize?: number;
}

interface CsvData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  truncated: boolean;
  error?: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function parseCsvContent(url: string, signal?: AbortSignal): Promise<CsvData> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return { headers: [], rows: [], totalRows: 0, truncated: false };
    const headers = parseCsvLine(lines[0]);
    const dataRows = lines.slice(1);
    if (dataRows.length > MAX_CSV_PREVIEW_ROWS) {
      return {
        headers,
        rows: dataRows.slice(0, MAX_CSV_PREVIEW_ROWS).map(parseCsvLine),
        totalRows: dataRows.length,
        truncated: true,
      };
    }
    return { headers, rows: dataRows.map(parseCsvLine), totalRows: dataRows.length, truncated: false };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return { headers: [], rows: [], totalRows: 0, truncated: false, error: 'cancelled' };
    return { headers: [], rows: [], totalRows: 0, truncated: false, error: 'Không đọc được CSV' };
  }
}

const PAGE_SIZE = 50;

export function CsvPreview({ url, fileName, fileSize }: CsvPreviewProps) {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset trạng thái loading trước khi parse file mới
    setIsLoading(true);
    setCsvData(null);
    setPage(0);
    void parseCsvContent(url, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setCsvData(result);
        setIsLoading(false);
      }
    });
    return () => controller.abort();
  }, [url]);

  const paginatedRows = useMemo(() => {
    if (!csvData) return [];
    const start = page * PAGE_SIZE;
    return csvData.rows.slice(start, start + PAGE_SIZE);
  }, [csvData, page]);

  const totalPages = csvData ? Math.ceil(csvData.rows.length / PAGE_SIZE) : 0;
  const extension = fileName.split('.').pop()?.toUpperCase() || '';

  return (
    <div className={styles.panel} style={{ width: 'min(80rem, calc(100vw - 2rem))' }}>
      <div className={styles.panelHeader}>
        <div style={{ minWidth: 0 }}>
          <Text size="sm" fw={500} truncate title={fileName}>
            {truncateFilename(fileName, 48)}
          </Text>
          <Text size="xs" c="dimmed">
            {formatFileSize(fileSize)} · {extension}
            {csvData && ` · ${csvData.totalRows.toLocaleString()} dòng`}
          </Text>
        </div>
      </div>
      <div className={styles.panelBody}>
        {isLoading ? (
          <div className={styles.centerState}>
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Đang tải xem trước…</Text>
          </div>
        ) : csvData?.error && csvData.error !== 'cancelled' ? (
          <div className={styles.centerState}>
            <IconTable size={40} />
            <Text size="sm">{csvData.error}</Text>
          </div>
        ) : csvData && csvData.headers.length > 0 ? (
          <Table striped withTableBorder withColumnBorders stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={48}>#</Table.Th>
                {csvData.headers.map((h, i) => (
                  <Table.Th key={i}>{h || `Cột ${i + 1}`}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedRows.map((row, rowIndex) => (
                <Table.Tr key={rowIndex}>
                  <Table.Td c="dimmed">{page * PAGE_SIZE + rowIndex + 1}</Table.Td>
                  {row.map((cell, cellIndex) => (
                    <Table.Td key={cellIndex} title={cell} style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cell}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <div className={styles.centerState}>
            <IconTable size={40} />
            <Text size="sm">File CSV rỗng</Text>
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <div className={styles.toolbar}>
          <Text size="xs" c="dimmed">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, csvData?.rows.length ?? 0)} / {csvData?.rows.length ?? 0}
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ActionIcon variant="subtle" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <IconChevronLeft size={16} />
            </ActionIcon>
            <Text size="xs" c="dimmed">{page + 1} / {totalPages}</Text>
            <ActionIcon variant="subtle" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
              <IconChevronRight size={16} />
            </ActionIcon>
          </div>
        </div>
      )}
      {csvData?.truncated && (
        <div className={styles.toolbar}>
          <Text size="xs" c="dimmed" ta="center" style={{ width: '100%' }}>
            Chỉ hiển thị {MAX_CSV_PREVIEW_ROWS} dòng đầu. Tải về để xem toàn bộ.
          </Text>
        </div>
      )}
    </div>
  );
}

export default CsvPreview;
