/**
 * 后台「显示规则」可视化编辑器。
 *
 * Answer 的插件设置页是按 ConfigFields 自动画的，
 * 没有「动态增删一组复合字段」的控件。我们不改主站源码，而是：
 * 1. 后台仍用 textarea 存 JSON（保存、读库走原有通道）
 * 2. 本插件在 /admin/hello_banner 上找到 name=display_rules 的 textarea
 * 3. 在它前面插入本编辑器，把 textarea 藏起来
 * 4. 改规则时用原生 value setter + input 事件写回，让受控表单的 React state 跟上
 *    这样点页面上原来的「提交」仍然能把规则存进插件配置
 * 5. 从 textarea 读出时走 parseDisplayRules（合法性检查）
 */

import { useEffect, useState } from 'react';

import {
  EnhanceTextareaField,
  toFiniteInt,
  usePathname,
  writeTextarea,
} from 'plugin-shared';

import settingsCss from './DisplayRulesEditor.css?inline';
import {
  createEmptyRule,
  parseDisplayRules,
  serializeDisplayRules,
  type DisplayRule,
  type PeriodType,
} from './displayRules';

const TEXTAREA_NAME = 'display_rules';

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'hours', label: '每几个小时' },
];

interface EditorProps {
  textarea: HTMLTextAreaElement;
}

/**
 * 真正的表单：每条规则一行卡片，可增删，字段即时写回 textarea。
 */
function DisplayRulesEditor({ textarea }: EditorProps) {
  const [rules, setRules] = useState<DisplayRule[]>(() =>
    parseDisplayRules(textarea.value),
  );

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = settingsCss;
    document.head.appendChild(el);
    //React 卸掉这个组件时（离开设置页）把这张 <style> 删掉，避免样式留在全站
    return () => el.remove();
  }, []);

  /**
   * 本地改完规则后：更新 React 状态，并把 JSON 灌回隐藏 textarea。
   * 不在这里请求后端，保存仍然走页面原来的提交按钮。
   */
  const commit = (next: DisplayRule[]) => {
    setRules(next);
    writeTextarea(textarea, serializeDisplayRules(next));
  };
  /**
   * 只改第几条规则里的某几个字段 
   */
  const patchAt = (index: number, patch: Partial<DisplayRule>) => {
    commit(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  return (
    <div className="hb-rules">
      <p className="hb-rules__hint">
        未添加任何规则时横幅始终显示。配了规则后：当前时间落在某条规则的时间段内，
        且该规则在本周期内的显示次数未达上限，才显示；否则隐藏。时间段含开始、不含结束，
        支持跨天（如 22:00–02:00）。如果开始和结束时间一样，则认为时间段是全天。时区为浏览器本地时区。
      </p>
      {rules.map((rule, index) => (
        <div className="hb-rule" key={rule.id}>
          <div className="hb-rule__head">
            <strong>规则 {index + 1}</strong>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => commit(rules.filter((_, i) => i !== index))}
            >
              删除
            </button>
          </div>
          <div className="hb-rule__grid">
            <label>
              开始时间
              <input
                type="time"
                className="form-control form-control-sm"
                value={rule.start}
                onChange={(e) => patchAt(index, { start: e.target.value })}
              />
            </label>
            <label>
              结束时间
              <input
                type="time"
                className="form-control form-control-sm"
                value={rule.end}
                onChange={(e) => patchAt(index, { end: e.target.value })}
              />
            </label>
            <label>
              上限次数
              <input
                type="number"
                min={1}
                step={1}
                className="form-control form-control-sm"
                value={rule.maxCount}
                onChange={(e) =>
                  patchAt(index, { maxCount: Math.max(1, toFiniteInt(e.target.value)) })
                }
              />
            </label>
            <label>
              周期类型
              <select
                className="form-select form-select-sm"
                value={rule.periodType}
                onChange={(e) =>
                  patchAt(index, { periodType: e.target.value as PeriodType })
                }
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {rule.periodType === 'hours' ? (
              <label>
                每 N 小时
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="form-control form-control-sm"
                  value={rule.periodHours}
                  onChange={(e) =>
                    patchAt(index, {
                      periodHours: Math.max(1, toFiniteInt(e.target.value)),
                    })
                  }
                />
              </label>
            ) : null}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        onClick={() => commit([...rules, createEmptyRule()])}
      >
        添加规则
      </button>
    </div>
  );
}

/**
 * 挂在插件根上。路径对不上不挂编辑器。
 * 找 textarea、插宿主、藏原文框：EnhanceTextareaField。
 */
export function AdminDisplayRulesBridge() {
  const show = usePathname().includes('/admin/hello_banner');
  if (!show) return null;

  return (
    <EnhanceTextareaField
      textareaName={TEXTAREA_NAME}
      hostClassName="hb-rules-host"
      hiddenClassName="hb-rules-json"
    >
      {(textarea) => <DisplayRulesEditor textarea={textarea} />}
    </EnhanceTextareaField>
  );
}
