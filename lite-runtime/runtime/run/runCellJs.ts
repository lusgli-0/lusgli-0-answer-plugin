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

interface CellScriptContext {
  panel: HTMLElement | null;
  overlay: HTMLElement;
  api: CellScriptApi;
}

export interface CellScriptModule {
  html: string;
  css: string;
  default: (panel: HTMLElement | null, overlay: HTMLElement, api: CellScriptApi) => void;
}

const CELL_SCRIPT_API_PATH = '/answer/api/v1/lite-runtime/cell.js';

export async function loadCellModule(cellId: string): Promise<CellScriptModule> {
  const url = new URL(CELL_SCRIPT_API_PATH, window.location.origin);
  url.searchParams.set('cell_id', cellId);
  return (await import(/* webpackIgnore: true */ /* @vite-ignore */ url.href)) as CellScriptModule;
}

export function runCellJs(
  cellModule: CellScriptModule,
  host: CellHost,
  lifecycle: CellLifecycleHooks,
): void {
  const api: CellScriptApi = {
    capabilities,
    onOpen: lifecycle.onOpen,
    onClose: lifecycle.onClose,
  };

  const context: CellScriptContext = {
    ...host,
    api,
  };

  try {
    cellModule.default(context.panel, context.overlay, context.api);
  } catch (error) {
    console.error('[lite-runtime] cell js failed', error);
  }
}