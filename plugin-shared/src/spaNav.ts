/**
 * 站内跳转，不刷新整页。
 *
 * 为什么不能写 <Link to="..."> 或 useNavigate()：
 *   主站 App 用 createBrowserRouter + RouterProvider，路由上下文只包着 #root。
 *   插件若用 createRoot 挂到 body 上、#root 外面（见 mount.ts），是另一棵 React 树，
 *   树里没有 Router。Link / useNavigate 会报
 *   "used only in the context of a <Router>"。
 *
 * 为什么不能只靠 <a href="/questions/ask">：
 *   浏览器会整页加载，等于退出 SPA：JS 重跑、状态清空、顶部闪白。
 *   看起来像「跳到外部」，其实是同一站点被重新请求了一遍 HTML。
 *
 * 做法：
 *   1. history.pushState 只改地址栏，不向服务器要新文档
 *   2. 再派发 popstate。主站 RouterProvider 监听这个事件，按新路径渲染
 *
 * href 仍写在 <a> 上：中键、Ctrl+点击、右键「新标签打开」继续走浏览器默认行为。
 * 只有普通左键才 preventDefault 后走 spaGo。
 */

import { useSyncExternalStore, type MouseEvent } from 'react';

/** 把绝对地址、相对地址都收成「路径 + 查询 + hash」，给 pushState / navigate 用。 */
export function toPath(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url, location.origin);
    return u.pathname + u.search + u.hash;
  } catch {
    return url;
  }
}

/**
 * 站内跳转：改 URL，再发 popstate，让 React Router 自己换页。
 * 已经在目标页就什么都不做。
 */
export function spaGo(url: string): void {
  const path = toPath(url);
  if (!path) return;
  const now = location.pathname + location.search + location.hash;
  if (now === path) return;
  history.pushState({}, '', path);
  dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * <a> 的普通左键：拦截后 spaGo。
 * 点过之后给节点加 is-sent，调用方若有对应 CSS（例如按钮换文案）可以接着用；
 * 没有这段样式也无害。
 */
export function onInternalNavClick(event: MouseEvent<HTMLAnchorElement>): void {
  if (event.defaultPrevented) return;
  if (event.button !== 0) return;
  if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
    return;
  }
  const href = event.currentTarget.getAttribute('href');
  if (!href || href.startsWith('http://') || href.startsWith('https://')) {
    return;
  }
  event.preventDefault();
  event.currentTarget.classList.add('is-sent');
  spaGo(href);
}

/**
 * #root 外没有 Router。popstate 只管后退；主站换页是 pushState，没有原生事件。
 * 全页只包一层 history，多个插件一起订也不会套多层。无默认路径。
 */
const pathListeners = new Set<() => void>();
let historyWrapped = false;

function emitPathChange() {
  pathListeners.forEach((fn) => fn());
}

function wrapHistoryOnce() {
  if (historyWrapped || typeof history === 'undefined') return;
  historyWrapped = true;
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  history.pushState = ((...args: Parameters<History['pushState']>) => {
    push(...args);
    emitPathChange();
  }) as History['pushState'];
  history.replaceState = ((...args: Parameters<History['replaceState']>) => {
    replace(...args);
    emitPathChange();
  }) as History['replaceState'];
  window.addEventListener('popstate', emitPathChange);
}

export function subscribePath(onChange: () => void): () => void {
  wrapHistoryOnce();
  pathListeners.add(onChange);
  return () => {
    pathListeners.delete(onChange);
  };
}

export function getPathname(): string {
  return location.pathname;
}

/** 当前路径。地址变了才重渲，不要用定时器扫。 */
export function usePathname(): string {
  return useSyncExternalStore(subscribePath, getPathname);
}
