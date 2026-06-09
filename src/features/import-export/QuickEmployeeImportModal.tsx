import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  FileInput,
  Group,
  Modal,
  Progress,
  ScrollArea,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconUpload } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import { listAllDepartments } from '../organization/departmentsApi';
import { listPositionsSelect } from '../organization/positionsApi';
import { createEmployee } from '../employees/employeesApi';
import { bulkProvisionFromEmployees } from '../auth-admin/authAdminApi';
import type { Employee } from '../employees/employeeTypes';
import type { Department, PositionSelectOption } from '../organization/organizationTypes';

type StyledCell = { value: string; fontWeight?: 'bold'; backgroundColor?: string; textColor?: string; align?: 'left' | 'center' | 'right' };
type SheetRows = StyledCell[][];
type SheetSpec = { data: SheetRows; sheet?: string; stickyRowsCount?: number; columns?: { width?: number }[] };
type MultiSheetFn = (sheets: SheetSpec[]) => { toFile: (name: string) => Promise<void> };

interface ParsedRow {
  rowNumber: number;
  employeeCode: string;
  biotimeCode: string;
  fullName: string;
  departmentCode: string;
  positionCode: string;
  departmentId: string;
  positionId: string;
  unitId: string;
  departmentName: string;
  positionName: string;
  errors: string[];
}

interface ImportResult {
  row: ParsedRow;
  employee: Employee | null;
  error?: string;
}

type Phase = 'idle' | 'preview' | 'importing' | 'done';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickEmployeeImportModal({ open, onClose, onSuccess }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [provisionAccounts, setProvisionAccounts] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const deptQuery = useQuery({
    queryKey: ['departments', 'all', { status: 'ACTIVE' }],
    queryFn: () => listAllDepartments({ status: 'ACTIVE' }),
    enabled: open,
  });

  const posQuery = useQuery({
    queryKey: ['positions', 'select'],
    queryFn: listPositionsSelect,
    enabled: open,
  });

  const isDataLoading = deptQuery.isLoading || posQuery.isLoading;

  async function downloadTemplate() {
    const depts = deptQuery.data ?? [];
    const positions = posQuery.data ?? [];
    const { default: writeXlsxFile } = await import('write-excel-file/browser');

    const headerStyle = { fontWeight: 'bold' as const, backgroundColor: '#2563EB', textColor: '#FFFFFF', align: 'center' as const };
    const deptHeaderStyle = { fontWeight: 'bold' as const, backgroundColor: '#059669', textColor: '#FFFFFF', align: 'center' as const };
    const posHeaderStyle = { fontWeight: 'bold' as const, backgroundColor: '#7C3AED', textColor: '#FFFFFF', align: 'center' as const };

    const exampleDeptCode = depts[0]?.code ?? 'DV001_01';
    const examplePosCode = positions[0]?.code ?? 'CV001';

    const importRows: SheetRows = [
      [
        { value: 'Mã NS', ...headerStyle },
        { value: 'Mã chấm công', ...headerStyle },
        { value: 'Họ tên (*)', ...headerStyle },
        { value: 'Mã phòng ban (*)', ...headerStyle },
        { value: 'Mã chức vụ (*)', ...headerStyle },
      ],
      [
        { value: '(tự sinh nếu trống)' },
        { value: '108' },
        { value: 'Nguyễn Văn A' },
        { value: exampleDeptCode },
        { value: examplePosCode },
      ],
    ];

    const deptRows: SheetRows = [
      [
        { value: 'Mã phòng ban', ...deptHeaderStyle },
        { value: 'Tên phòng ban', ...deptHeaderStyle },
        { value: 'Đơn vị', ...deptHeaderStyle },
      ],
      ...depts.map((d) => [
        { value: d.code },
        { value: d.name },
        { value: d.unit?.name ?? '' },
      ]),
    ];

    const posRows: SheetRows = [
      [
        { value: 'Mã chức vụ', ...posHeaderStyle },
        { value: 'Tên chức vụ', ...posHeaderStyle },
      ],
      ...positions.map((p) => [
        { value: p.code },
        { value: p.name },
      ]),
    ];

    await (writeXlsxFile as unknown as MultiSheetFn)([
      { data: importRows, sheet: 'Mẫu import', stickyRowsCount: 1, columns: [{ width: 22 }, { width: 16 }, { width: 30 }, { width: 22 }, { width: 22 }] },
      { data: deptRows, sheet: 'Danh sách phòng ban', stickyRowsCount: 1, columns: [{ width: 22 }, { width: 34 }, { width: 30 }] },
      { data: posRows, sheet: 'Danh sách chức vụ', stickyRowsCount: 1, columns: [{ width: 22 }, { width: 34 }] },
    ]).toFile('Mau_import_nhanh_nhan_su.xlsx');
  }

  function parseAndValidate(rawRows: unknown[][], depts: Department[], positions: PositionSelectOption[]): ParsedRow[] {
    const deptMap = new Map(depts.map((d) => [d.code.toUpperCase(), d]));
    const posMap = new Map(positions.map((p) => [p.code.toUpperCase(), p]));

    return rawRows
      .slice(1) // skip header
      .filter((row) => row.some((cell) => cell !== null && String(cell ?? '').trim() !== ''))
      .map((row, i): ParsedRow => {
        const employeeCode = String(row[0] ?? '').trim();
        const biotimeCode = String(row[1] ?? '').trim();
        const fullName = String(row[2] ?? '').trim();
        const deptCode = String(row[3] ?? '').trim().toUpperCase();
        const posCode = String(row[4] ?? '').trim().toUpperCase();

        const errors: string[] = [];
        if (!fullName) errors.push('Thiếu họ tên');
        if (!deptCode) errors.push('Thiếu mã phòng ban');
        if (!posCode) errors.push('Thiếu mã chức vụ');

        const dept = deptCode ? deptMap.get(deptCode) : undefined;
        const pos = posCode ? posMap.get(posCode) : undefined;

        if (deptCode && !dept) errors.push(`Mã phòng ban "${deptCode}" không tồn tại`);
        if (posCode && !pos) errors.push(`Mã chức vụ "${posCode}" không tồn tại`);

        return {
          rowNumber: i + 2,
          employeeCode,
          biotimeCode,
          fullName,
          departmentCode: deptCode,
          positionCode: posCode,
          departmentId: dept?.id ?? '',
          positionId: pos?.id ?? '',
          unitId: dept?.unitId ?? '',
          departmentName: dept?.name ?? deptCode,
          positionName: pos?.name ?? posCode,
          errors,
        };
      });
  }

  async function handleFileChange(file: File | null) {
    if (!file || !deptQuery.data || !posQuery.data) return;
    try {
      const { default: readXlsxFile } = await import('read-excel-file/browser');
      const rawRows = (await readXlsxFile(file)) as unknown as unknown[][];
      const parsed = parseAndValidate(rawRows, deptQuery.data, posQuery.data);
      if (parsed.length === 0) {
        notifications.show({ color: 'yellow', message: 'File không có dữ liệu.' });
        return;
      }
      setParsedRows(parsed);
      setPhase('preview');
    } catch {
      notifications.show({ color: 'red', title: 'Lỗi đọc file', message: 'File không đúng định dạng Excel.' });
    }
  }

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  async function startImport() {
    setPhase('importing');
    setImportProgress(0);
    const importResults: ImportResult[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const employee = await createEmployee({
          employeeCode: row.employeeCode || undefined,
          biotimeEmployeeCode: row.biotimeCode || null,
          fullName: row.fullName,
          phone: '',
          hireDate: today,
          employmentStatus: 'ACTIVE',
          unitId: row.unitId,
          departmentId: row.departmentId,
          positionId: row.positionId,
        });
        importResults.push({ row, employee });
      } catch (err) {
        importResults.push({
          row,
          employee: null,
          error: (err as { message?: string })?.message ?? 'Lỗi không xác định',
        });
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setResults(importResults);
    setPhase('done');
    onSuccess();
  }

  const createdResults = results.filter((r) => r.employee !== null);
  const failedResults = results.filter((r) => r.employee === null);

  async function handleFinish() {
    if (!provisionAccounts || createdResults.length === 0) {
      handleClose();
      return;
    }

    setIsProvisioning(true);
    try {
      const employees = createdResults.map((r) => ({
        employeeId: r.employee!.id,
        employeeCode: r.employee!.employeeCode,
        fullName: r.employee!.fullName,
        email: r.employee!.companyEmail ?? r.employee!.personalEmail ?? null,
        departmentName: r.employee!.departmentName ?? undefined,
        positionName: r.employee!.positionName ?? undefined,
      }));

      const result = await bulkProvisionFromEmployees({
        employees,
        sendOtp: sendEmail,
        skipExisting: true,
      });

      notifications.show({
        color: 'green',
        title: 'Cấp tài khoản hoàn tất',
        message: `Đã tạo ${result.created}/${result.total} tài khoản.`,
      });
      handleClose();
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 501) {
        notifications.show({
          color: 'yellow',
          title: 'Tính năng chưa hỗ trợ',
          message: 'Cấp tài khoản hàng loạt chưa được hỗ trợ. Vui lòng tạo từng tài khoản trong tab Tài khoản.',
          autoClose: false,
        });
      } else {
        notifications.show({
          color: 'red',
          title: 'Cấp tài khoản thất bại',
          message: (err as { message?: string })?.message ?? 'Đã xảy ra lỗi.',
        });
      }
    } finally {
      setIsProvisioning(false);
    }
  }

  function handleClose() {
    if (phase === 'importing') return;
    setPhase('idle');
    setParsedRows([]);
    setResults([]);
    setImportProgress(0);
    setProvisionAccounts(false);
    setSendEmail(false);
    onClose();
  }

  return (
    <Modal
      title="Import nhanh nhân sự"
      opened={open}
      onClose={handleClose}
      size="xl"
      closeOnClickOutside={phase !== 'importing'}
      closeOnEscape={phase !== 'importing'}
    >
      <Stack gap="md">
        {phase === 'idle' && (
          <>
            <Text size="sm" c="dimmed">
              Chỉ cần 3 trường bắt buộc: <strong>Họ tên</strong>, <strong>Mã phòng ban</strong>,{' '}
              <strong>Mã chức vụ</strong>. Mã NS và Mã chấm công là tùy chọn. Các thông tin khác
              (SĐT, ngày sinh, email...) có thể bổ sung sau.
            </Text>
            <Button
              variant="light"
              w="fit-content"
              leftSection={<IconDownload size={16} />}
              disabled={isDataLoading}
              loading={isDataLoading}
              onClick={() => void downloadTemplate()}
            >
              {isDataLoading ? 'Đang tải danh mục...' : 'Tải file mẫu (kèm danh sách mã)'}
            </Button>
            <FileInput
              label="Chọn file Excel (.xlsx)"
              placeholder="Chọn file..."
              accept=".xlsx,.xls"
              disabled={isDataLoading}
              description={
                isDataLoading
                  ? 'Đang tải danh mục phòng ban và chức vụ...'
                  : 'Điền dữ liệu vào file mẫu rồi upload lên đây.'
              }
              leftSection={<IconUpload size={16} />}
              onChange={(file) => void handleFileChange(file)}
            />
          </>
        )}

        {phase === 'preview' && (
          <>
            <Group gap="xs">
              <Badge color="blue">Tổng: {parsedRows.length} dòng</Badge>
              <Badge color="green">Hợp lệ: {validRows.length}</Badge>
              {invalidRows.length > 0 && <Badge color="red">Lỗi: {invalidRows.length}</Badge>}
            </Group>

            <ScrollArea h={300}>
              <Table withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Dòng</Table.Th>
                    <Table.Th>Mã NS</Table.Th>
                    <Table.Th>Mã CC</Table.Th>
                    <Table.Th>Họ tên</Table.Th>
                    <Table.Th>Phòng ban</Table.Th>
                    <Table.Th>Chức vụ</Table.Th>
                    <Table.Th>Trạng thái</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {parsedRows.map((row) => (
                    <Table.Tr
                      key={row.rowNumber}
                      style={row.errors.length ? { backgroundColor: 'var(--mantine-color-red-0)' } : undefined}
                    >
                      <Table.Td>{row.rowNumber}</Table.Td>
                      <Table.Td>{row.employeeCode || '—'}</Table.Td>
                      <Table.Td>{row.biotimeCode || '—'}</Table.Td>
                      <Table.Td>{row.fullName || '—'}</Table.Td>
                      <Table.Td>{row.departmentName}</Table.Td>
                      <Table.Td>{row.positionName}</Table.Td>
                      <Table.Td>
                        {row.errors.length > 0 ? (
                          <Text size="xs" c="red">{row.errors.join('; ')}</Text>
                        ) : (
                          <Badge color="green" size="sm">OK</Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            <Group justify="space-between">
              <Button variant="default" onClick={() => setPhase('idle')}>
                Chọn lại
              </Button>
              <Button
                disabled={validRows.length === 0}
                onClick={() => void startImport()}
              >
                Import {validRows.length} nhân sự
              </Button>
            </Group>
          </>
        )}

        {phase === 'importing' && (
          <Stack gap="sm" py="md">
            <Text ta="center">Đang tạo nhân sự, vui lòng chờ...</Text>
            <Progress value={importProgress} animated size="lg" />
            <Text ta="center" size="sm" c="dimmed">
              {importProgress}% — Không đóng cửa sổ này.
            </Text>
          </Stack>
        )}

        {phase === 'done' && (
          <>
            <Alert color={failedResults.length > 0 ? 'yellow' : 'green'}>
              Đã tạo <strong>{createdResults.length}</strong> nhân sự thành công.
              {failedResults.length > 0 && (
                <> Thất bại: <strong>{failedResults.length}</strong>.</>
              )}
            </Alert>

            {failedResults.length > 0 && (
              <ScrollArea h={120}>
                <Table>
                  <Table.Tbody>
                    {failedResults.map((r) => (
                      <Table.Tr key={r.row.rowNumber}>
                        <Table.Td c="dimmed">Dòng {r.row.rowNumber}</Table.Td>
                        <Table.Td>{r.row.fullName}</Table.Td>
                        <Table.Td c="red">{r.error}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}

            {createdResults.length > 0 && (
              <Stack gap="xs">
                <Checkbox
                  label="Tạo tài khoản đăng nhập cho nhân sự vừa import"
                  checked={provisionAccounts}
                  onChange={(e) => setProvisionAccounts(e.currentTarget.checked)}
                />
                {provisionAccounts && (
                  <Checkbox
                    pl="md"
                    label="Gửi email kích hoạt"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.currentTarget.checked)}
                  />
                )}
                {provisionAccounts && (
                  <Text size="xs" c="dimmed" pl="md">
                    Tài khoản sẽ ở trạng thái <strong>Hoạt động</strong>. Nhân sự đã có tài khoản sẽ bị bỏ qua.
                  </Text>
                )}
              </Stack>
            )}

            <Group justify="flex-end">
              <Button
                loading={isProvisioning}
                onClick={() => void handleFinish()}
              >
                {provisionAccounts ? 'Tạo tài khoản' : 'Đóng'}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
