/**
 * @fileoverview Lọc HTML bảng do SheetJS `sheet_to_html` sinh ra trước khi
 * render bằng dangerouslySetInnerHTML — chuyển thể từ chat-web's
 * sanitizeTableHtml.ts. SheetJS không escape nội dung ô, nên phải lọc để
 * tránh XSS khi ô chứa HTML/script.
 */
const TABLE_TAGS = ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'br'];

/**
 * `colspan`/`rowspan` là 2 thuộc tính duy nhất được giữ lại trên `td`/`th` —
 * cần thiết để hiển thị đúng các ô đã gộp (merge cells) mà `sheet_to_html`
 * sinh ra. Không phải vector XSS (chỉ nhận số nguyên) nên an toàn để giữ lại;
 * trước đây bị xoá theo cùng lượt xoá style/on*, khiến ô gộp (ví dụ hàng tiêu
 * đề gộp nhiều cột) bị vỡ thành ô đơn — làm lệch hàng so với hàng chữ cột
 * A, B, C phía trên, trông như bảng không được chia ô rõ ràng.
 */
const KEEP_ATTRS = ['colspan', 'rowspan'];

export function sanitizeTableHtml(html: string): string {
  if (typeof window === 'undefined') return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');

  for (const el of Array.from(doc.body.querySelectorAll('*')).reverse()) {
    if (!TABLE_TAGS.includes(el.tagName.toLowerCase())) {
      const parent = el.parentNode;
      if (!parent) continue;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      if (KEEP_ATTRS.includes(attr.name.toLowerCase())) continue;
      el.removeAttribute(attr.name);
    }
  }
  return doc.body.innerHTML;
}
