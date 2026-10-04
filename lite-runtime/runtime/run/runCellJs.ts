/**
 * 执行 cell 自己的 JavaScript。
 *
 * cell 的 JS 会在运行时提供的上下文里执行，
 * 可以直接使用 panel、overlay、api，不污染全局脚本作用域。
 * 失败只打日志：坏脚本不该让整页白屏，遮罩仍能关上。
 */
import * as capabilities from './capabilities';
import type { CellHost, CellLifecycleHooks } from '../lifecycle';

export interface CellScriptApi extends CellLifecycleHooks {
  capabilities: typeof capabilities;
}

export function runCellJs(
  js: string,
  host: CellHost,
  lifecycle: CellLifecycleHooks,
): void {
  const code = String(js).trim();
  if (!code) return;

  const api: CellScriptApi = {
    capabilities,
    onOpen: lifecycle.onOpen,
    onClose: lifecycle.onClose,
  };

  try {
    const run = new Function('panel', 'overlay', 'api', code);
    run(host.panel, host.overlay, api);
  } catch (error) {
    console.error('[lite-runtime] cell js failed', error);
  }
}