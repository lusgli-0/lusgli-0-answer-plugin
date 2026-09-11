/**
 * 本地时钟工具。插件自己看浏览器用的时区，不读服务器钟。
 *
 * 半开区间：含起点、不含终点。起点 > 终点视为跨天 / 跨夜（22:00–02:00、22–6）。
 *
 * 两个「相等」不要合成一个函数再改行为：
 *   isNowInTimeRange（分钟规则）start === end → 全天都显示
 *   hourInRange（小时问候）    from === to   → 永不命中
 * 问候时段 from===to 在后端 sanitize 里也会丢掉，两边故意一致。
 */

const CLOCK_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * 半开圆环：value 落在 [from, to) 里算命中。
 * equalMeansAll：from === to 时，true = 全圆命中，false = 永不命中。
 * 不要把这个参数暴露给业务方去「选语义」，调用方应继续用下面两个具名函数。
 */
function inHalfOpenCircularRange(
  value: number,
  from: number,
  to: number,
  equalMeansAll: boolean,
): boolean {
  if (from === to) return equalMeansAll;
  if (from < to) return value >= from && value < to;
  return value >= from || value < to;
}

/**
 * "HH:mm" → 当天已过分钟数 0–1439。
 * 非法格式返回 -1，调用方当作本条无效，不要 throw。
 */
export function parseClockToMinutes(clock: string): number {
  const hit = CLOCK_RE.exec(String(clock || '').trim());
  if (!hit) return -1;
  return Number(hit[1]) * 60 + Number(hit[2]);
}

/**
 * 本地时刻是否落在 [start, end)。
 * start === end → 全天；start < end → 同日；start > end → 跨天。
 */
export function isNowInTimeRange(now: Date, start: string, end: string): boolean {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = parseClockToMinutes(start);
  const endMin = parseClockToMinutes(end);
  if (startMin < 0 || endMin < 0) return false;
  return inHalfOpenCircularRange(nowMin, startMin, endMin, true);
}

/**
 * 当前小时是否落在 [from, to)。from 含、to 不含。
 * from === to → false（空区间，不是全天）。
 * from > to → 跨夜，例如 22–6。
 */
export function hourInRange(hour: number, from: number, to: number): boolean {
  return inHalfOpenCircularRange(hour, from, to, false);
}

/** 本地日历日，形如 2026-08-20。不用 toISOString，那会变成 UTC 日期。 */
export function formatLocalYmd(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
