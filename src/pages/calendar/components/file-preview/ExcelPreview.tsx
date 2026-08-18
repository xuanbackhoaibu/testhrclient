/**
 * @fileoverview Xem trước .xlsx/.xls ngay trong trình duyệt bằng SheetJS —
 * chuyển thể từ chat-web's ExcelPreview. Không cần Office Online / URL công
 * khai nên hoạt động cả với file chọn cục bộ (blob: URL) trước khi lưu.
 *
 * Zoom điều khiển từ component cha qua prop `scale` (thanh zoom nổi dùng
 * chung, giống Zalo web) — panel chỉ còn giữ lại thanh chọn sheet ở dưới
 * cùng, kiểu tab phẳng có gạch chân + mũi tên cuộn ngang khi nhiều sheet,
 * giống thanh sheet-tab thật của Excel/Zalo web (không dùng "pills" tròn của
 * Mantine như trước — trông giống nút bấm hơn là tab chọn sheet).
 *
 * Thêm số dòng (1, 2, 3...) và chữ cột (A, B, C...) giống lưới bảng tính
 * thật — `sheet_to_html` của SheetJS chỉ trả về bảng dữ liệu thuần, không có
 * 2 hàng/cột này, nên tự chèn thêm bằng DOMParser (giữ nguyên phần xử lý ô
 * gộp/merge có sẵn của SheetJS, không viết lại từ đầu). Hàng chữ cột dán
 * cố định phía trên (sticky), cột số dòng dán cố định bên trái, khi cuộn.
 *
 * CHƯA làm: đóng băng đúng các cột người dùng tự ghim trong file gốc (freeze
 * panes) như bản Zalo — cần đo độ rộng cột thực tế sau khi render rồi tự set
 * lại `left` từng cột, phức tạp hơn nhiều so với 1 cột số dòng cố định; để
 * dành cho lần sau nếu cần.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Loader, Text } from '@mantine/core';
import { IconAlertTriangle, IconChevronLeft, IconChevronRight, IconMenu2 } from '@tabler/icons-react';
import { sanitizeTableHtml } from './sanitizeTableHtml';
import styles from './PreviewPanel.module.css';

interface ExcelPreviewProps {
  url: string;
  fileName: string;
  /** Mức thu phóng do component cha điều khiển (mặc định 1 = 100%). */
  scale?: number;
}

interface ParsedWorkbook {
  sheetNames: string[];
  htmlBySheet: string[];
}

async function loadXlsx() {
  return import('xlsx');
}

let prototypeFrozen = false;
function freezeObjectPrototypeOnce(): void {
  if (prototypeFrozen) return;
  Object.freeze(Object.prototype);
  prototypeFrozen = true;
}

/** Độ rộng cột mặc định (px) khi file không khai báo — xấp xỉ 8.43 ký tự mặc định của Excel. */
const DEFAULT_COL_PX = 64;
/** Độ rộng tối thiểu 1 cột, tránh cột bị bóp quá hẹp khi file khai báo width rất nhỏ. */
const MIN_COL_PX = 40;
/** Độ rộng cột số dòng (1, 2, 3...) bên trái. */
const ROW_HEAD_COL_PX = 40;

/** Quy đổi độ rộng cột trong file Excel (ký tự hoặc px SheetJS trả về) sang px hiển thị. */
function resolveColPx(colInfo: { wpx?: number; wch?: number; width?: number } | undefined): number {
  if (!colInfo) return DEFAULT_COL_PX;
  if (typeof colInfo.wpx === 'number') return Math.max(MIN_COL_PX, Math.round(colInfo.wpx));
  const chars = typeof colInfo.wch === 'number' ? colInfo.wch : typeof colInfo.width === 'number' ? colInfo.width : null;
  if (chars == null) return DEFAULT_COL_PX;
  // Công thức quy đổi ký tự -> px dùng chung trong Excel/OOXML (font Calibri 11, digit width ~7px).
  return Math.max(MIN_COL_PX, Math.round(chars * 7 + 5));
}

/**
 * Chèn hàng chữ cột (A, B, C...) ở trên cùng, cột số dòng (1, 2, 3...) bên
 * trái, và <colgroup> khai báo đúng độ rộng từng cột lấy từ file gốc
 * (`ws['!cols']`) — dùng DOMParser để không phải viết lại logic xử lý ô gộp
 * (colspan/rowspan) mà `sheet_to_html` đã làm sẵn. Có colgroup + CSS
 * `table-layout: fixed` thì bảng mới gọn đúng độ rộng cột thật như file gốc
 * (giống Zalo web) thay vì tự giãn theo độ dài chữ trong ô.
 *
 * `range` là vùng dữ liệu thật của sheet (`ws['!ref']`), dùng để biết bắt
 * đầu từ cột/dòng thứ mấy — khớp đúng số dòng/chữ cột như Excel thật, kể cả
 * khi dữ liệu không bắt đầu từ ô A1.
 */
function addGridHeaders(
  html: string,
  encodeCol: (c: number) => string,
  range: { s: { r: number; c: number }; e: { r: number; c: number } },
  cols: Array<{ wpx?: number; wch?: number; width?: number } | undefined>,
): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return html;

  const rows = Array.from(table.querySelectorAll('tr'));

  // Khai báo độ rộng từng cột đúng như file gốc — bắt buộc phải có để
  // table-layout: fixed tôn trọng độ rộng thay vì để trình duyệt tự tính.
  const colgroup = doc.createElement('colgroup');
  const rowHeadCol = doc.createElement('col');
  rowHeadCol.style.width = `${ROW_HEAD_COL_PX}px`;
  colgroup.appendChild(rowHeadCol);
  let totalWidthPx = ROW_HEAD_COL_PX;
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const colPx = resolveColPx(cols[c]);
    totalWidthPx += colPx;
    const col = doc.createElement('col');
    col.style.width = `${colPx}px`;
    colgroup.appendChild(col);
  }
  table.insertBefore(colgroup, table.firstChild);
  // QUAN TRỌNG: với `table-layout: fixed`, nếu <table> không có `width` cụ
  // thể thì theo spec CSS, width 'auto' sẽ lấy bằng độ rộng CONTAINER chứa
  // nó (gần như width: 100%) — trình duyệt sẽ tự bóp toàn bộ cột đã khai báo
  // trong colgroup theo tỉ lệ cho vừa khung nhìn, thay vì giữ đúng px đã set.
  // Đây chính là lý do cột bị ép quá hẹp, chữ vỡ dòng liên tục dù đã có
  // colgroup — phải gán thẳng width = tổng độ rộng cột lên <table> thì
  // table-layout: fixed mới thật sự tôn trọng độ rộng từng cột.
  table.setAttribute('style', `width:${totalWidthPx}px`);

  // Hàng chữ cột trên cùng: 1 ô góc trống + 1 ô cho mỗi cột trong vùng dữ liệu.
  const headerRow = doc.createElement('tr');
  const cornerCell = doc.createElement('th');
  cornerCell.className = 'excel-grid-corner';
  headerRow.appendChild(cornerCell);
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const th = doc.createElement('th');
    th.className = 'excel-grid-colhead';
    th.textContent = encodeCol(c);
    headerRow.appendChild(th);
  }
  table.insertBefore(headerRow, colgroup.nextSibling);

  // Cột số dòng bên trái: chèn vào đầu mỗi hàng dữ liệu (bỏ qua hàng chữ cột vừa thêm).
  rows.forEach((tr, i) => {
    const th = doc.createElement('th');
    th.className = 'excel-grid-rowhead';
    th.textContent = String(range.s.r + i + 1);
    tr.insertBefore(th, tr.firstChild);
  });

  return table.outerHTML;
}

export function ExcelPreview({ url, scale = 1 }: ExcelPreviewProps) {
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setParsed(null);
      setError(null);
      setActiveSheet(0);
      try {
        const [XLSX, res] = await Promise.all([loadXlsx(), fetch(url)]);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        freezeObjectPrototypeOnce();
        const wb = XLSX.read(buf, { type: 'array' });
        const htmlBySheet = wb.SheetNames.map((name: string) => {
          const ws = wb.Sheets[name];
          const rawHtml = sanitizeTableHtml(XLSX.utils.sheet_to_html(ws, { editable: false }));
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
          return addGridHeaders(rawHtml, XLSX.utils.encode_col, range, ws['!cols'] || []);
        });
        if (cancelled) return;
        setParsed({ sheetNames: wb.SheetNames, htmlBySheet });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không đọc được file');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const activeHtml = useMemo(() => parsed?.htmlBySheet[activeSheet] ?? '', [parsed, activeSheet]);

  const scrollTabs = (dir: -1 | 1) => {
    tabListRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });
  };

  return (
    <div className={styles.panel}>
      {/* Không đệm/padding riêng — bảng tràn sát mép giống Excel/ảnh mẫu,
          khoảng cách với viền lightbox đã có sẵn từ modal cha. */}
      <div className={styles.panelBody} style={{ background: '#fff' }}>
        {error ? (
          <div className={styles.centerState}>
            <IconAlertTriangle size={32} />
            <Text size="sm">Không xem trước được: {error}</Text>
          </div>
        ) : !parsed ? (
          <div className={styles.centerState}>
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Đang tải bảng tính…</Text>
          </div>
        ) : (
          <div
            className={styles.excelTable}
            style={{ width: 'fit-content', transform: `scale(${scale})`, transformOrigin: 'top left' }}
            dangerouslySetInnerHTML={{ __html: activeHtml }}
          />
        )}
      </div>

      {parsed && parsed.sheetNames.length > 1 && (
        <div className={styles.sheetTabBar}>
          <IconMenu2 size={16} className={styles.sheetTabMenuIcon} />
          <ActionIcon variant="subtle" size="sm" className={styles.sheetTabScrollBtn} onClick={() => scrollTabs(-1)} aria-label="Cuộn trái">
            <IconChevronLeft size={16} />
          </ActionIcon>
          <div className={styles.sheetTabList} ref={tabListRef}>
            {parsed.sheetNames.map((name, i) => (
              <button
                key={name}
                type="button"
                className={styles.sheetTab}
                data-active={i === activeSheet ? 'true' : undefined}
                onClick={() => setActiveSheet(i)}
              >
                {name}
              </button>
            ))}
          </div>
          <ActionIcon variant="subtle" size="sm" className={styles.sheetTabScrollBtn} onClick={() => scrollTabs(1)} aria-label="Cuộn phải">
            <IconChevronRight size={16} />
          </ActionIcon>
        </div>
      )}
    </div>
  );
}

export default ExcelPreview;
