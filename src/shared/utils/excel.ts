type CellValue = string | number | boolean | Date | null | undefined;
type ExcelCellValue = string | number | boolean | Date;
type ExcelCell = {
  value: ExcelCellValue;
  fontWeight?: 'bold';
  textColor?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
  alignVertical?: 'top' | 'center' | 'bottom';
  wrap?: boolean;
  borderColor?: string;
  borderStyle?: 'thin';
};
type ExcelRow = ExcelCell[];

export interface ExcelExportColumn<T> {
  header: string;
  key: string;
  width?: number;
  value?: (record: T) => CellValue;
}

interface ExportRowsOptions<T> {
  fileName: string;
  sheetName: string;
  columns: Array<ExcelExportColumn<T>>;
  rows: T[];
}

const EXCEL_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

function normalizeSheetName(sheetName: string): string {
  const cleaned = sheetName.replace(/[\\/*?:[\]]/g, ' ').trim();
  return (cleaned || 'Sheet1').slice(0, 31);
}

function normalizeCellValue(value: CellValue): ExcelCellValue {
  if (value === undefined || value === null) {
    return '';
  }
  return value;
}

export function isExcelFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return (
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    EXCEL_MIME_TYPES.has(file.type)
  );
}

export async function exportRowsToExcel<T>({
  fileName,
  sheetName,
  columns,
  rows,
}: ExportRowsOptions<T>): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const headerRow: ExcelRow = columns.map((column) => ({
    value: column.header,
    fontWeight: 'bold',
    textColor: '#FFFFFF',
    backgroundColor: '#2563EB',
    align: 'center',
    alignVertical: 'center',
  }));

  const dataRows: ExcelRow[] = rows.map((record) =>
    columns.map((column) => ({
      value: normalizeCellValue(column.value ? column.value(record) : null),
      alignVertical: 'top',
      wrap: true,
      borderColor: '#E5E7EB',
      borderStyle: 'thin',
    })),
  );

  await writeXlsxFile([headerRow, ...dataRows], {
    sheet: normalizeSheetName(sheetName),
    stickyRowsCount: 1,
    columns: columns.map((column) => ({ width: column.width ?? 18 })),
  }).toFile(fileName);
}
