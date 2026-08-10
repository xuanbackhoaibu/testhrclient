import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const output = path.resolve('artifacts/hr-web-client-text-inventory.md');
const extensions = new Set(['.ts', '.tsx', '.css']);
const checks = [
  { type: 'Mojibake', pattern: /(?:Ã.|Â.|Ä.|�)/g, suggestion: 'Lưu lại chuỗi UTF-8 và dùng tiếng Việt có dấu.' },
  { type: 'Tiếng Việt không dấu', pattern: /\b(?:Nhan vien|Phong ban|Don vi|Quan ly|Phan quyen|Bao cao|Khong the|Khong co|Vui long|Cap nhat|Da cap nhat|Ban khong co|Tai khoan cua ban|Nguoi dung|Lan dang nhap|Chua dang nhap)\b/gi, suggestion: 'Chuẩn hóa thành nhãn tiếng Việt có dấu.' },
  { type: 'Nhãn tiếng Anh', pattern: /\b(?:Leave workflow|Create leave request|Audit Logs|Search entity type|Entity type|Start date|End date|Total days|Actions|Detail)\b/g, suggestion: 'Dùng nhãn tiếng Việt theo ngữ cảnh.' },
];

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return files(full);
    return extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

function shouldSkip(file) {
  return /(?:^|[\\/])(?:__tests__|test|tests)[\\/]/i.test(file) || /\.test\.[cm]?[tj]sx?$/i.test(file);
}

const sourceFiles = files(root).filter((file) => !shouldSkip(file));
const rows = [];
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const [offset, line] of lines.entries()) {
    for (const check of checks) {
      for (const match of line.matchAll(check.pattern)) {
        rows.push({ file: path.relative(process.cwd(), file).replaceAll('\\', '/'), line: offset + 1, text: match[0], type: check.type, suggestion: check.suggestion });
      }
    }
  }
}
fs.mkdirSync(path.dirname(output), { recursive: true });
const markdown = [
  '# HR web client text inventory',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Files scanned: ${sourceFiles.length}`,
  `Findings: ${rows.length}`,
  '',
  '| File | Dòng | Text hiện tại | Text đề xuất | Loại lỗi | Trạng thái |',
  '| --- | ---: | --- | --- | --- | --- |',
  ...rows.map((row) => `| ${row.file} | ${row.line} | ${row.text.replaceAll('|', '\\|')} | ${row.suggestion} | ${row.type} | Cần xử lý |`),
  '',
  'Các mã quyền, enum API, route, URL và object key không nằm trong phạm vi thay thế tự động.',
].join('\n');
fs.writeFileSync(output, `${markdown}\n`);
console.log(JSON.stringify({ filesScanned: sourceFiles.length, findings: rows.length, output: path.relative(process.cwd(), output) }, null, 2));
