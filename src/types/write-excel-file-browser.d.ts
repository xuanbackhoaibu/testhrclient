declare module 'write-excel-file/browser' {
  interface SheetOptions {
    fileName: string;
    sheet?: string;
    stickyRowsCount?: number;
    columns?: Array<{ width?: number }>;
  }

  export default function writeXlsxFile(
    data: unknown[][],
    options: SheetOptions,
  ): Promise<void>;
}
