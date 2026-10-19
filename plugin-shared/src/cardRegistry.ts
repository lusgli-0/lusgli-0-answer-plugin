/**
 * 按名字登记「一张卡怎么画出来」。
 *
 * 谁在用：悬浮卡这类东西——外面一个按钮只知道卡名（guide / rune），
 * 不该 import 卡内部的粒子、抽签、DOM 结构。卡在加载时自己来登记：
 * 「我叫这个名字，源码在这，打开时请这样渲染」。
 *
 * 没有默认卡名：登记表是空的，调用方传入 registryKey，各插件各拿各的表。
 *
 * 打开动作（遮罩、锁滚动）不放这里：那是悬浮层的壳。本文件只保管名单。
 */

export interface CardSources {
  html: string;
  css: string;
  js: string;
}

export interface CardHost {
  overlay: HTMLElement;
  panel: HTMLElement | null;
}

export interface CardRenderHandle {
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * 一张卡交给登记表的全部内容。
 * render：壳已经建好 overlay 之后，卡自己往 panel 上绑行为。
 * getSources：设置页要列出/编辑 html/css/js 时来取，不是给外面业务用的。
 */
export interface CardRegistration {
  name: string;
  getSources: () => CardSources;
  render?: (host: CardHost) => CardRenderHandle | void;
}

export interface CardRegistry {
  register: (card: CardRegistration) => void;
  get: (name: string) => CardRegistration | undefined;
  list: () => CardRegistration[];
  /** 壳在启动时告诉登记表「按名字打开」怎么做。外面只调 open(name)。 */
  setOpener: (open: (name: string) => void) => void;
  open: (name: string) => void;
}

const intern = new Map<string, CardRegistry>();

/** 挂在 window 上，HMR / 设置页 / 前台不是同一份模块实例时也能找到同一张表。 */
const WINDOW_KEY = '__plugin_shared_card_registries__';

type RegistryMap = Map<string, CardRegistry>;

function getIntern(): RegistryMap {
  if (typeof window === 'undefined') return intern;
  const w = window as Window & { [WINDOW_KEY]?: RegistryMap };
  if (!w[WINDOW_KEY]) {
    w[WINDOW_KEY] = intern;
  }
  return w[WINDOW_KEY];
}

function makeRegistry(): CardRegistry {
  // 闭包：cards / opener 只给下面这几个函数用，外面拿不到，所以每张表一份私有名单。
  const cards = new Map<string, CardRegistration>();
  let opener: ((name: string) => void) | null = null;

  return {
    register(card: CardRegistration): void {
      const name = String(card?.name || '').trim();
      if (!name) return;
      cards.set(name, { ...card, name });
    },

    get(name: string): CardRegistration | undefined {
      return cards.get(String(name || '').trim());
    },

    list(): CardRegistration[] {
      return Array.from(cards.values());
    },

    setOpener(open: (name: string) => void): void {
      opener = open;
    },

    /**
     * 外部监听器只传卡名。壳还没 setOpener 时（插件没加载完）静默返回，别 throw。
     */
    open(name: string): void {
      const id = String(name || '').trim();
      if (!id || !opener) return;
      opener(id);
    },
  };
}

/**
 * 拿到一把 registryKey 对应的登记表。没有默认 key，调用方自己传。
 * 同一 key 永远返回 intern 里那一份（两处 import、HMR 不会各登记各的）。
 */
export function createCardRegistry(registryKey: string): CardRegistry {
  const key = String(registryKey || '').trim();
  const table = getIntern();
  const hit = table.get(key);
  if (hit) return hit;
  const created = makeRegistry();
  if (key) table.set(key, created);
  return created;
}
