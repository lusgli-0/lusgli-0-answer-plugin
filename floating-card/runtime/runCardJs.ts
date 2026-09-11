/**
 * 跑一张卡自己的 js。
 *
 * 为什么用 new Function 而不是 <script>：卡 js 是管理员保存在配置里的字符串，
 * 也可能是内置文件的原文。要给它 panel / overlay / api，而不是污染整页全局。
 * 失败只打日志：坏脚本不该让整页白屏，遮罩仍能关上。
 *
 * api 只有这几个键。卡 js 不要指望能 import 主站模块。
 */
import { formatLocalYmd } from 'plugin-shared';
import type { CardHost, CardRenderHandle } from 'plugin-shared';

import { bindTilt } from './tilt';
import type { CardData } from './cardConfig';

export interface CardScriptApi {
  data?: CardData;
  todayKey: () => string;
  bindTilt?: (panel: HTMLElement | null) => void;
  onOpen: (fn: () => void) => void;
  onClose: (fn: () => void) => void;
}

export function runCardJs(
  js: string,
  host: CardHost,
  opts: { data?: CardData; tilt: boolean },
): CardRenderHandle {
  const handle: CardRenderHandle = {};
  const code = String(js || '').trim();
  if (!code) return handle;

  const api: CardScriptApi = {
    data: opts.data,
    todayKey: () => formatLocalYmd(new Date()),
    onOpen(fn) {
      handle.onOpen = fn;
    },
    onClose(fn) {
      handle.onClose = fn;
    },
  };
  if (opts.tilt) {
    api.bindTilt = bindTilt;
  }

  try {
    const fn = new Function('panel', 'overlay', 'api', code);
    fn(host.panel, host.overlay, api);
  } catch (err) {
    console.error('[floating-card] card js failed', err);
  }
  return handle;
}
