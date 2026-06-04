declare module 'write-excel-file/browser' {
  type ExcelCellStyle = {
    fontWeight?: 'bold';
    textColor?: string;
    backgroundColor?: string;
    align?: 'left' | 'center' | 'right';
    alignVertical?: 'top' | 'center' | 'bottom';
    wrap?: boolean;
    borderColor?: string;
    borderStyle?: 'thin';
  };

  type ExcelCell = ExcelCellStyle & { value: string | number | boolean | Date };

  interface SheetOptions {
    sheet?: string;
    stickyRowsCount?: number;
    columns?: Array<{ width?: number }>;
  }

  interface ReturnType {
    toBlob: () => Promise<Blob>;
    toFile: (fileName: string) => Promise<void>;
  }

  export default function writeXlsxFile(
    data: ExcelCell[][],
    options?: SheetOptions,
  ): ReturnType;
}
