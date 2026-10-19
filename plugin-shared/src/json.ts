/**
 * 把未知输入收成能用的 JSON / 整数。失败返回空值，不 throw。
 * 后台 textarea、公开接口都可能给来坏数据，插件不应因此白屏。
 */

/** 数组直接用；字符串则 JSON.parse。不是数组或解析失败 → []。 */
export function parseJsonArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 把不同形态的输入统一收成有限整数（`Number.isFinite` 且无小数部分）。
 *
 * 用法
 * ----
 * 后台 JSON、textarea、`<input type="number">` 交来的可能是
 * `3`、`"3"`、`" 3.7 "`、`""`、`null`、`undefined`。先交给本函数，
 * 再拿返回值做比较或写入。失败（NaN、Infinity、拆不开的字符串）得到 `0`。
 *
 * 下限（例如至少 1 次、至少 1 小时）不要写在这里，调用方自己
 * `Math.max(1, toFiniteInt(x))`。小数向 0 截断（`3.9 → 3`），
 * 外面不必再套 `Math.floor`。
 */
export function toFiniteInt(value: unknown): number {
  const n =
    typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

/**
 * 剥掉 WriteAPI / Answer 的 { code, reason, msg, data } 外壳。
 * 原生 fetch 拿完整信封；已是内层对象（或拦截器已剥过）则原样返回。
 * 无默认 slug / 字段名。失败返回 {}，不 throw。
 */
export function unwrapApiData(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as { data?: unknown };
  const inner = obj.data;
  if (inner && typeof inner === 'object') return inner;
  return obj;
}

/**
 * 未知值收成非空字符串数组。不是数组 → []。
 * 空白串丢掉；命中项原样保留（不 trim 后再写入）。
 */
export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === 'string' && item.trim() !== '',
  );
}
