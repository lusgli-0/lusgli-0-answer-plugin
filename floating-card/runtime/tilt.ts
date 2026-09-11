/*
 * 本文件：性能版鼠标倾斜，从 yemie.js bindTilt 原样迁出。
 * 移动中关掉 transition 直接跟手；只有 mouseleave 才用 0.5s 缓动回正。
 * 不在 React 里做：tilt 每帧改 transform，走 DOM 比 setState 便宜。
 */

/**
 * 给面板绑 tilt。
 * @param panel 带 data-ans-panel 的那块（guide/rune 面板），不是 .ans-ov 全屏层
 */
export function bindTilt(panel: HTMLElement | null): void {
  if (!panel) return;
  let moving = false;
  panel.addEventListener('mousemove', (e: MouseEvent) => {
    const r = panel.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    if (!moving) {
      moving = true;
      panel.style.transition = 'none';
    }
    panel.style.transform =
      'rotateX(' + (-py * 8).toFixed(2) + 'deg) rotateY(' + (px * 8).toFixed(2) + 'deg)';
  });
  panel.addEventListener('mouseleave', () => {
    moving = false;
    panel.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1)';
    panel.style.transform = 'rotateX(0deg) rotateY(0deg)';
  });
}
