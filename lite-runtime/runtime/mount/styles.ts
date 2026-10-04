/*
 * 将 runtime 和 cell 的 CSS 注入 document.head。
 * 通过固定 id 更新已有 style，避免重复注入。
 */
const STYLE_ID_SHARED = 'ans-ov-styles';

function upsertStyle(id: string, css: string): void {
  if (typeof document === 'undefined' || !css) return;
  let element = document.getElementById(id) as HTMLStyleElement | null;
  if (!element) {
    element = document.createElement('style');
    element.id = id;
    document.head.appendChild(element);
  }
  if (element.textContent !== css) {
    element.textContent = css;
  }
}

export function injectSharedStyles(css: string): void {
  upsertStyle(STYLE_ID_SHARED, css);
}

export function injectCellStyles(cellId: string, css: string): void {
  upsertStyle('ans-ov-styles-' + cellId, css);
}