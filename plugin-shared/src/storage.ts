/**
 * 浏览器里记「某个东西这周期已经出现几次」。
 *
 * 数据在游客自己的 localStorage，服务端不管钟、也不管次数。
 * 没有默认 key：横幅、公告卡各自传入，互不覆盖。
 *
 * periodKey 由 period.ts 造（今天 / 当前 N 小时档）。这里只比较字符串：
 * 钥匙变了 → get 返回 0；下次 increment 从 1 起记。读写策略见下面的 cache、intern、try/catch。
 */

interface CountRecord {
  count: number;
  periodKey: string;
}

interface StoreShape {
  v: 1;
  records: Record<string, CountRecord>;
}

export interface CachedStorage {
  get: (recordId: string, periodKey: string) => number;
  increment: (recordId: string, periodKey: string) => number;
}

/**
 * 同一把 storageKey 全页共用这一份读写器。
 *
 * 两个地方都 createCachedStorage('同一把钥匙') 时，如果各拿各的对象，
 * 就会各写各的 localStorage，后写的覆盖先写的，次数会乱。
 * Map 在这里当登记表：见过这把钥匙就还旧的那一项（intern）。
 */
const intern = new Map<string, CachedStorage>();

/** 「读失败」和「从没存过」都走这里，避免两处手写 {} 以后改漏。 */
function emptyStore(): StoreShape {
  return { v: 1, records: {} };
}

function makeCachedStorage(storageKey: string): CachedStorage {
  // 闭包：下面的函数都能用这份 cache / storageKey，外面拿不到。
  // 内存镜像：第一次从 localStorage 抄到这张「小黑板」，之后 get 只看黑板。
  // 没有它，React 一页问很多次「还剩几次」就要反复 getItem + JSON.parse（同步、偏慢）。
  // null = 还没读过盘。只有 increment 才会把黑板抄回 localStorage。
  let cache: StoreShape | null = null;

  function readStorageOnce(): StoreShape {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return emptyStore();
      const parsed = JSON.parse(raw) as Partial<StoreShape>;
      // 类型守卫：JSON.parse 出来形状未知。v 不是 1、或 records 不是对象 → 丢掉，免得旧格式带偏后续逻辑。
      if (
        parsed &&
        parsed.v === 1 &&
        parsed.records &&
        typeof parsed.records === 'object'
      ) {
        return { v: 1, records: parsed.records };
      }
    } catch {
      // 隐私模式、存储被关、JSON 损坏：getItem / parse 会 throw。吞掉当没存过，别让页面崩。
    }
    return emptyStore();
  }

  /** 第一次用才读盘；读过之后 cache 不再是 null。import 时可能还没有 window，用不到的 key 也不必碰存储。 */
  function ensureCache(): StoreShape {
    if (cache) return cache;
    cache = readStorageOnce();
    return cache;
  }

  function persist(): void {
    if (!cache) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cache));
    } catch {
      // 配额满或隐私模式：setItem 会 throw。内存里数字仍对，刷新后没落盘。页面照常跑。
    }
  }

  return {
    /**
     * 这条记录在这个周期桶里已经记了几次。
     * 没有记录、或 periodKey 对不上（已经是新的一天 / 新的 N 小时）→ 0。
     * 只读：不在这里改存储、也不写盘。
     */
    get(recordId: string, periodKey: string): number {
      const store = ensureCache();
      const rec = store.records[recordId];
      if (!rec || rec.periodKey !== periodKey) return 0;
      return rec.count;
    },

    /**
     * 当前桶 +1 并立刻写盘。
     * 钥匙已经换了：当成新周期的第 1 次，不要把昨天的次数累进来。
     */
    increment(recordId: string, periodKey: string): number {
      const store = ensureCache();
      const rec = store.records[recordId];
      if (!rec || rec.periodKey !== periodKey) {
        store.records[recordId] = { count: 1, periodKey };
      } else {
        rec.count += 1;
      }
      persist();
      return store.records[recordId].count;
    },
  };
}

/**
 * 拿到一把钥匙对应的读写器。没有默认 key，调用方自己传。
 * 同一 key 永远返回 intern 里那一份。
 */
export function createCachedStorage(storageKey: string): CachedStorage {
  const hit = intern.get(storageKey);
  if (hit) return hit;
  const created = makeCachedStorage(storageKey);
  intern.set(storageKey, created);
  return created;
}
