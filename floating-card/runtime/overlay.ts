/**
 * 共用 overlay 壳：遮罩、锁滚动、按名字打开。
 *
 * 卡内容来自 GET /answer/api/v1/floating-card/config（后端读数据目录里的卡片文件）。
 *
 * 开卡入口有两个，最终都汇到本文件的 openCard()：
 *   ① 菜单总线：community-menu 点按钮 → Component.tsx 里 register 的 handler → registry.open。
 *   ② data-ans-card="卡名"：任意元素被点击，本文件 onDocClick 直接 openCard。
 */
import overlayCss from './overlay.css?raw';

import { cardRegistry } from '../cards';
import { runCardJs } from './runCardJs';
import { injectCardStyles, injectSharedStyles } from './styles';
import type { CardConfig, PublicConfig } from './cardConfig';

export const ROOT_ID = 'floating-card-root';
const BODY_LOCK_CLASS = 'ans-ov-open';

interface Slot {
  overlay: HTMLElement;
  onOpen?: () => void;
  onClose?: () => void;
}

const slots = new Map<string, Slot>();
let currentId: string | null = null;
let docBound = false;
let latest: PublicConfig | null = null;

function findPanel(overlay: HTMLElement): HTMLElement | null {
  return (
    overlay.querySelector<HTMLElement>('[data-ans-panel]') ||
    overlay.querySelector<HTMLElement>('.ans-guide-panel, .ans-rune-panel, .ans-card-panel')
  );
}

function resolveCard(cardId: string): CardConfig | null {
  // 以后端（数据目录）返回的列表为准。接口还没回来或失败时不显示。
  if (!latest) return null;
  const fromApi = latest.cards.find((c) => c.card_id === cardId);
  if (!fromApi) return null;
  return {
    card_id: cardId,
    features: { tilt: !!fromApi.features?.tilt },
    html: fromApi.html || '',
    css: fromApi.css || '',
    js: fromApi.js || '',
    data: fromApi.data,
  };
}

function buildSlot(card: CardConfig): Slot {
  const ov = document.createElement('div');
  ov.id = 'ans-ov-' + card.card_id;
  ov.className = 'ans-ov';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-hidden', 'true');
  ov.innerHTML =
    '<div class="ans-ov-backdrop">' +
    '<div class="ans-ov-backdrop-blur"></div>' +
    '<div class="ans-ov-backdrop-tint"></div>' +
    '</div>' +
    (card.html || '');
  document.body.appendChild(ov);

  const panel = findPanel(ov);
  const handle = runCardJs(card.js || '', { overlay: ov, panel }, {
    data: card.data,
    tilt: !!card.features?.tilt,
  });

  return {
    overlay: ov,
    onOpen: handle.onOpen,
    onClose: handle.onClose,
  };
}

function lockBody(on: boolean): void {
  if (!document.body) return;
  if (on) document.body.classList.add(BODY_LOCK_CLASS);
  else document.body.classList.remove(BODY_LOCK_CLASS);
}

export function closeAll(): void {
  slots.forEach((slot) => {
    slot.overlay.classList.remove('is-open');
    slot.overlay.setAttribute('aria-hidden', 'true');
    if (slot.onClose) slot.onClose();
  });
  currentId = null;
  lockBody(false);
}

function onDocClick(e: MouseEvent): void {
  const t = e.target as HTMLElement | null;
  if (!t || !t.closest) return;

  // 开卡入口 ②：任意带 data-ans-card="卡名" 的元素被点击就开对应卡（直接 openCard）。
  // 给「不走菜单、自己在页面上放按钮/链接」的场景；菜单入口见 Component.tsx 的 register。
  const trigger = t.closest('[data-ans-card]');
  if (trigger) {
    const name = trigger.getAttribute('data-ans-card');
    if (name) {
      e.preventDefault();
      openCard(name);
    }
    return;
  }

  if (t.closest('.ans-ov-backdrop')) {
    e.preventDefault();
    closeAll();
  }
}

function onDocKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeAll();
}

function bindDocOnce(): void {
  if (docBound) return;
  docBound = true;
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onDocKey);
}

export function setPublicConfig(cfg: PublicConfig): void {
  latest = cfg;
  injectSharedStyles(cfg.shared_css || overlayCss);
}

/**
 * 按卡名打开。找不到配置就静默返回。
 * 第一次打开才建 DOM，之后复用（改后台 HTML 后刷新页面）。
 */
export function openCard(cardId: string): void {
  const id = String(cardId || '').trim();
  if (!id) return;
  const card = resolveCard(id);
  if (!card) return;

  injectSharedStyles((latest && latest.shared_css) || overlayCss);
  if (card.css) injectCardStyles(card.card_id, card.css);

  bindDocOnce();
  if (currentId && currentId !== id) {
    closeAll();
  }

  let slot = slots.get(id);
  if (!slot) {
    slot = buildSlot(card);
    slots.set(id, slot);
  }

  if (slot.onOpen) slot.onOpen();
  slot.overlay.classList.add('is-open');
  slot.overlay.setAttribute('aria-hidden', 'false');
  currentId = id;
  lockBody(true);
}

cardRegistry.setOpener(openCard);
if (typeof document !== 'undefined') {
  bindDocOnce();
}
