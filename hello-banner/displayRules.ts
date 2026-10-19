/**
 * 横幅显示次数合法性与判定入口。
 *
 * 分工
 * ----
 * Go 只把管理员保存的 JSON 原样放进 GET /hello-banner/config 的 display_rules。
 * 本文件负责：把未知 JSON 收成合法规则 → 用本地时钟判断显不显示 → 算出周期桶键。
 * 时钟 / JSON 清洗 / 周期键在 plugin-shared；真正读写 localStorage 在 displayCountStore.ts。
 *
 * 判定
 * ----
 * 有效规则 0 条         → 始终显示（旧行为），不写计数。
 * 否则                  → 当前本地时刻落在某条 [start, end) 内，
 *                         且该规则本周期已显示次数 < maxCount，才显示。
 * 横幅真正画到页面上之后才 +1（见 Component 的 useEffect）。
 *
 * 时间
 * ----
 * 含 start、不含 end。start > end 视为跨天（22:00–02:00）。
 * 一律用 Date 的本地时区。
 * 分钟规则 start === end 是全天。
 *
 * 周期
 * ----
 * daily（默认）= 本地自然日一换就重置。
 * hours        = 每 N 小时一个桶（按 Unix 毫秒切）。
 */

import {
  isNowInTimeRange,
  makePeriodKey,
  parseClockToMinutes,
  parseJsonArray,
  toFiniteInt,
} from 'plugin-shared';

/** daily：每天；hours：每 N 小时。缺省 / 写错都当 daily。 */
export type PeriodType = 'daily' | 'hours';

/** 一条显示规则。*/
export interface DisplayRule {
  /** localStorage 计数主键。改时间不改 id，旧次数还算在这条上。 */
  id: string;
  /** "HH:mm"，含该时刻。 */
  start: string;
  /** "HH:mm"，不含该时刻。 */
  end: string;
  /** 本周期最多渲染几次，≥ 1。 */
  maxCount: number;
  periodType: PeriodType;
  /** 仅 hours 有意义，至少 1。 */
  periodHours: number;
}

export interface DisplayDecision {
  show: boolean;
  /** 本次命中且仍有额度的规则，渲染完成后给它们 +1。 */
  matched: DisplayRule[];
}

/** 获取指定规则和当前周期，返回已经显示过几次。 */
export type CountGetter = (ruleId: string, periodKey: string) => number;

const PERIOD_TYPES: PeriodType[] = ['daily', 'hours'];

/**
 * 决定现在要不要画横幅。
 */
export function decideBannerDisplay(
  rules: DisplayRule[],
  now: Date,
  getCount: CountGetter,
): DisplayDecision {
  if (!rules || rules.length === 0) {
    return { show: true, matched: [] };
  }
  const matched: DisplayRule[] = [];
  for (const rule of rules) {
    if (!isNowInTimeRange(now, rule.start, rule.end)) continue;
    const used = getCount(rule.id, makePeriodKey(rule, now));
    if (used < rule.maxCount) matched.push(rule);
  }
  return { show: matched.length > 0, matched };
}

/**
 * 把设置页 textarea 原文收成可用规则。
 * 非法项丢掉；结果为空 = 未配置 = 始终显示。
 */
export function parseDisplayRules(raw: unknown): DisplayRule[] {
  const list = parseJsonArray(raw);
  const out: DisplayRule[] = [];
  for (const item of list) {
    const cleaned = sanitizeRule(item);
    if (cleaned) out.push(cleaned);
  }
  return out;
}

/**
 * 单条清洗：必须有 id，时钟必须是 HH:mm，上限 ≥ 1，周期只认 daily/hours。
 * 缺 id 的项丢掉（设置页添加规则会生成 id）。
 */
function sanitizeRule(item: unknown): DisplayRule | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  const id = String(row.id ?? '').trim();
  if (!id) return null;
  const start = String(row.start ?? '').trim();
  const end = String(row.end ?? '').trim();
  if (parseClockToMinutes(start) < 0 || parseClockToMinutes(end) < 0) return null;
  const maxCount = toFiniteInt(row.max_count);
  if (maxCount < 1) return null;
  const periodType = toPeriodType(row.period_type);
  const periodHours = Math.max(1, toFiniteInt(row.period_hours));
  return { id, start, end, maxCount, periodType, periodHours };
}

/** 把 period_type 清洗成 ‘daily’ 或 ‘hours’。
 * 缺省 / 写错都当 daily。
*/
function toPeriodType(value: unknown): PeriodType {
  const s = String(value ?? '').trim();
  return PERIOD_TYPES.includes(s as PeriodType) ? (s as PeriodType) : 'daily';
}

/** 设置面板「添加规则」用。id 带时间戳，避免两条新规则撞计数键。 */
export function createEmptyRule(): DisplayRule {
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    id: `rule_${Date.now().toString(36)}_${rand}`,
    start: '09:00',
    end: '18:00',
    maxCount: 1,
    periodType: 'daily',
    periodHours: 6,
  };
}

/** 写回后台 textarea 的 JSON（snake_case）。
 * 用来给writeTextare提供第二个参数，writeTextare把自定义编辑器的内容写回后台。
 */
export function serializeDisplayRules(rules: DisplayRule[]): string {
  return JSON.stringify(
    rules.map((rule) => ({
      id: rule.id,
      start: rule.start,
      end: rule.end,
      max_count: rule.maxCount,
      period_type: rule.periodType,
      period_hours: rule.periodHours,
    })),
    null,
    2,
  );
}
