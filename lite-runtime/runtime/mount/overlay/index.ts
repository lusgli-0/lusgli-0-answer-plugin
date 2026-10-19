import overlayCss from './overlay.css?raw';

export { overlayCss };

/**
 * runCellJs.ts 执行 cell 脚本时会把 panel 和 overlay 作为参数传进去，
 * 所以 cell JS 可以直接操作它们，也能用 document.createElement() 改页面 DOM。
 */
export const ROOT_ID = 'lite-runtime-root';
const BODY_LOCK_CLASS = 'ans-ov-open';

export function createOverlayShell(cellId: string): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = 'ans-ov-' + cellId;
  overlay.className = 'ans-ov';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-hidden', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'ans-ov-backdrop';
  const blur = document.createElement('div');
  blur.className = 'ans-ov-backdrop-blur';
  const tint = document.createElement('div');
  tint.className = 'ans-ov-backdrop-tint';
  backdrop.append(blur, tint);
  overlay.appendChild(backdrop);
  document.body.appendChild(overlay);

  return overlay;
}

export function setOverlayOpen(overlay: HTMLElement, open: boolean): void {
  overlay.classList.toggle('is-open', open);
  overlay.setAttribute('aria-hidden', String(!open));
}

export function lockBody(locked: boolean): void {
  if (!document.body) return;
  document.body.classList.toggle(BODY_LOCK_CLASS, locked);
}