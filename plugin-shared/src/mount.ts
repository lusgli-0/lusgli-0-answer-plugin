/**
 * 在 #root 外面挂一棵独立 React 树。
 *
 * 为什么不能塞进 #root：
 *   那是主站 React 的地盘，手动插入的节点下次渲染会被删。
 *
 * 为什么挂出去之后没有 Router：
 *   RouterProvider 只包着 #root。这里 createRoot 得到另一棵树，
 *   站内跳转请用 spaNav.ts 的 spaGo，不要用 Link / useNavigate。
 *
 * React 根缓存在 window 上的共享 Map，按 hostId 复用，插件不必 declare global。
 * HMR 再执行时同一 hostId 会 render 新 node，不会叠两棵树。
 *
 * placement 只在第一次创建容器时生效：prepend 插到 body 最前（横幅），
 * append 加到最后。已有节点不会挪位置。
 *
 * 本函数按 hostId 复用 Root。若某插件需要「布尔标记 + 只 mount 一次、不复用 Root」，
 * 不要硬接到这里，保持它自己的挂载。
 */

import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';

const ROOTS_KEY = '__plugin_shared_react_roots__';

type Placement = 'prepend' | 'append';

type RootMap = Map<string, Root>;

function getRootMap(): RootMap {
  const w = window as Window & { [ROOTS_KEY]?: RootMap };
  if (!w[ROOTS_KEY]) {
    w[ROOTS_KEY] = new Map();
  }
  return w[ROOTS_KEY];
}
/**
 * 默认插到body最后面
 */
export function mountOutsideRoot(opts: {
  hostId: string;
  node: ReactNode;
  placement?: Placement;
}): void {
  if (typeof document === 'undefined') return;

  const { hostId, node, placement = 'append' } = opts;

  const mount = () => {
    if (!document.body) return;

    let host = document.getElementById(hostId);
    if (!host) {
      host = document.createElement('div');
      host.id = hostId;
      if (placement === 'prepend') {
        document.body.prepend(host);
      } else {
        document.body.append(host);
      }
    }

    const roots = getRootMap();
    let root = roots.get(hostId);
    if (!root) {
      root = createRoot(host);
      roots.set(hostId, root);
    }
    root.render(node);
  };

  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  }
}
