/**
 * 算出「现在算哪一档计数周期」的字符串（periodKey）。
 *
 * 业务：你想「每天最多弹几次」，得能区分今天和昨天。本文件只负责造这把钥匙；
 * 次数加减在 storage.ts——那边发现钥匙变了，旧数字就当 0。
 *
 * 两种（其它 periodType 都当 daily；不绑具体规则，调用方传入字段）：
 * - daily → `daily:2026-08-20`，跟浏览器本地日历日走
 * - hours → `hours:{N}:{桶号}`，每 N 小时一档，按 Unix 毫秒切，跟时区无关
 */

import { formatLocalYmd } from './clock';
import { toFiniteInt } from './json';

export interface PeriodKeySpec {
  periodType: string;
  periodHours?: number;
}

/**
 * 当前这一档的钥匙。hours 的 N 至少为 1，避免除零。
 */
export function makePeriodKey(spec: PeriodKeySpec, now: Date): string {
  if (spec.periodType === 'hours') {
    const n = Math.max(1, toFiniteInt(spec.periodHours));
    // 从 1970-01-01 起，现在落在第几个「N 小时」里。不是墙上时钟的「今天下午 2 点到 4 点」。
    const bucket = Math.floor(now.getTime() / (n * 3600 * 1000));
    return `hours:${n}:${bucket}`;
  }
  return `daily:${formatLocalYmd(now)}`;
}
