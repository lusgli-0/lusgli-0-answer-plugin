/*
 * 本文件：把 CSS 塞进 document.head，id 对上才注入，HMR / 重复 mount 不会堆一堆 <style>。
 * 共用层沿用 yemie 的 ans-ov-styles，和旧自定义页脚脚本可以共存一份。
 */
const STYLE_ID_SHARED = 'ans-ov-styles';

function upsertStyle(id: string, css: string): void {
  if (typeof document === 'undefined' || !css) return;
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) {
    el.textContent = css;
  }
}

/** 注入遮罩共用 CSS。已有同 id 就覆盖内容，不新建节点 */
export function injectSharedStyles(css: string): void {
  upsertStyle(STYLE_ID_SHARED, css);
}

/** 每张卡自己的面板 CSS，id 带 card_id，两张卡同时存在也不互相覆盖 */
export function injectCardStyles(cardId: string, css: string): void {
  upsertStyle('ans-ov-styles-' + cardId, css);
}
