/**
 * 壳 / 设置页 / 公开接口共用的卡片 JSON 形状，以及本插件对外的名字。
 *
 * 为什么单独放 runtime、且不 import cards/：
 *   config.ts、overlay.ts 已经 import 登记表。如果本文件再从 cards 拿类型，
 *   登记表又来拿 CardData，就成环。本文件必须是叶子。
 *
 * 牌组（DeckRow）只属于 rune，在 cards/rune/deck.ts。
 */

import type { DeckItem } from '../cards/rune/deck';

/** 只留 tilt。粒子在 guide.css/js，每日一签在 rune.js。 */
export interface CardFeatures {
  tilt?: boolean;
}

export interface CardData {
  deck?: DeckItem[];
  storage_key?: string;
  [key: string]: unknown;
}

export interface CardConfig {
  card_id: string;
  features?: CardFeatures;
  html?: string;
  css?: string;
  js?: string;
  data?: CardData;
}

export interface PublicConfig {
  shared_css: string;
  cards: CardConfig[];
}

export const SLUG_NAME = 'floating_card';
