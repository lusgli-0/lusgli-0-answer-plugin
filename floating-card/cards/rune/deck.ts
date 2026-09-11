/**
 * 符文牌组的形状，和 cards/rune/deck.json 一行对应。
 * 数组下标不好记时可用对象写法。
 */

export type DeckRow = [
  path: string,
  name: string,
  nameZh: string,
  topic: string,
  category: string,
  meaning: string,
  homework: string,
];

export interface DeckItemObject {
  path?: string;
  name?: string;
  name_zh?: string;
  topic?: string;
  category?: string;
  meaning?: string;
  homework?: string;
}

export type DeckItem = DeckRow | DeckItemObject | unknown[];
