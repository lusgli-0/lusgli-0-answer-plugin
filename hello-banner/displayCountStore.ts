/**
 * 横幅显示次数写进localStorage里。
 */

import { createCachedStorage, makePeriodKey } from 'plugin-shared';

import type { DisplayRule } from './displayRules';

const storage = createCachedStorage('hello_banner_display_counts');

/**
 * 本页是否已经记过一次「渲染完成」。
 */
let recordedThisPageLoad = false;

/**
 * 读取某规则在指定周期桶里已经显示的次数。
 * 桶对不上（新的一天 / 新的 N 小时）返回 0。
 */
export function getRuleCount(ruleId: string, periodKey: string): number {
  return storage.get(ruleId, periodKey);
}

/**
 * 给某规则在当前桶里 +1，并立刻写回 localStorage。
 */
export function incrementRuleCount(ruleId: string, periodKey: string): number {
  return storage.increment(ruleId, periodKey);
}

/**
 * 横幅 DOM 已经画出来之后给本次命中的每条规则各记一次。
 * 无命中规则（未配置任何规则的「始终显示」）不写存储。
 * 同一页面重复调用是空操作，靠 recordedThisPageLoad 挡住。
 */
export function recordBannerDisplays(matched: DisplayRule[], now: Date): void {
  if (recordedThisPageLoad) return;
  if (!matched || matched.length === 0) return;
  recordedThisPageLoad = true;
  for (const rule of matched) {
    incrementRuleCount(rule.id, makePeriodKey(rule, now));
  }
}
