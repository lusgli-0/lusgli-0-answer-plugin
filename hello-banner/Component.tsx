/**
 * 问候横幅。由 React 渲染，样式在 Component.css。
 *
 * 问候语：接口下发 greeting_slots，用当地 new Date().getHours() 匹配第一条。
 *
 * 显示次数：接口只原样下发 JSON，合法性与是否展示都在 parseDisplayRules /
 * decideBannerDisplay。横幅画到 DOM 之后才在 useEffect 里 +1。
 * 
 * 纸飞机按钮的设计是：https://uiverse.io/marcelodolza/fat-zebra-11
 * MIT License
 * Copyright - 2026 marcelodolza (Marcelo Dolza)
 */
import { useEffect, useState, type CSSProperties } from 'react';

import {
  asStringList,
  hourInRange,
  onInternalNavClick,
  unwrapApiData,
} from 'plugin-shared';

import './Component.css';
import { recordBannerDisplays, getRuleCount } from './displayCountStore';
import {
  decideBannerDisplay,
  parseDisplayRules,
  type DisplayRule,
} from './displayRules';

const API = '/answer/api/v1/hello-banner/config';

interface GreetingSlot {
  from?: number;
  to?: number;
  text?: string;
}

interface BannerLists {
  greeting_slots?: GreetingSlot[];
  quotes?: string[];
  display_rules?: unknown;
}

interface BannerPicks {
  greeting: string;
  quote: string;
}

/** 把greeting_slots清洗成符合条件的对象数组 */
function asSlots(value: unknown): GreetingSlot[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is GreetingSlot => {
    if (!item || typeof item !== 'object') return false;
    const slot = item as GreetingSlot;
    return typeof slot.text === 'string' && slot.text.trim() !== '';
  });
}

function unwrapLists(raw: unknown): BannerLists {
  const inner = unwrapApiData(raw) as BannerLists;
  return {
    greeting_slots: asSlots(inner.greeting_slots),
    quotes: asStringList(inner.quotes),
    display_rules: inner.display_rules,
  };
}

function pickOne(items: string[] | undefined): string {
  if (!items || items.length === 0) return '';
  return items[Math.floor(Math.random() * items.length)];
}

// 从头到尾翻 slots，把满足条件的第一条存入 hit，返回 hit.text.trim()。
// 时段匹配用 hourInRange
function pickGreeting(slots: GreetingSlot[] | undefined): string {
  if (!slots || slots.length === 0) return '';
  const hour = new Date().getHours();
  const hit = slots.find((slot) => {
    const from = Number(slot.from);
    const to = Number(slot.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
    return hourInRange(hour, from, to);
  });
  return hit?.text?.trim() || '';
}

/** CSS 用 --i 做逐字延迟，必须每个字一个 span。 */
function LetterLine({ text }: { text: string }) {
  return (
    <p>
      {Array.from(text).map((ch, i) => (
        <span key={i} style={{ '--i': i } as CSSProperties}>
          {ch}
        </span>
      ))}
    </p>
  );
}

/** 须和 Component.css 里 ansBannerRetract 的 450ms 一致。 */
const BANNER_RETRACT_MS = 450;

const Component = () => {
  const [picks, setPicks] = useState<BannerPicks>({ greeting: '', quote: '' });
  const [closed, setClosed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [retracting, setRetracting] = useState(false);
  /** 本次真正画出来时要 +1 的规则；未配置规则时为空，不写 localStorage。 */
  const [matchedRules, setMatchedRules] = useState<DisplayRule[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(API)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const lists = unwrapLists(json);
        const greeting = pickGreeting(lists.greeting_slots);
        const quote = pickOne(lists.quotes);
        // 没有文案就return
        if (!greeting && !quote) return;
        const now = new Date();
        const rules = parseDisplayRules(lists.display_rules);
        const decision = decideBannerDisplay(rules, now, getRuleCount);
        //没有有效规则就return
        if (!decision.show) return;
        //桥接
        setMatchedRules(decision.matched);
        setPicks({ greeting, quote });
      })
      .catch(() => {
        //后端没编进这个插件、或接口失败：不画横幅 
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 横幅已经渲染进页面之后才计数。
   * 开发环境 React 18 会故意：挂载 → 卸掉 → 再挂载，
   * effect 可能跑两次，用来抓清理漏写。
   * 若每次都 +1，一次刷新会变成记 2 次。
   * recordBannerDisplays 同一次页面加载只记一次。
   * #root的StrictMode打不到这个插件
   */
  useEffect(() => {
    if (!picks.greeting && !picks.quote) return;
    recordBannerDisplays(matchedRules, new Date());
  }, [picks, matchedRules]);

  if (closed || (!picks.greeting && !picks.quote)) {
    return null;
  }

  const onClose = (duration: number = BANNER_RETRACT_MS) => {
    if (closing) return;
    setClosing(true);
    const wait = Math.max(0, duration - BANNER_RETRACT_MS);
    window.setTimeout(() => {
      setRetracting(true);
      window.setTimeout(() => setClosed(true), BANNER_RETRACT_MS);
    }, wait);
  };

  return (
    <div className={retracting ? 'hello-banner is-closing' : 'hello-banner'}>
      {picks.greeting ? <b>{picks.greeting}</b> : null}
      {picks.quote ? <span>{picks.quote}</span> : null}
      <a
        className="hello-btn"
        href="/questions/ask"
        onClick={(e) => {onInternalNavClick(e); onClose(1500);}}
      >
        <span className="ans-state ans-state--default">
          <span className="ans-icon" aria-hidden="true" />
          <LetterLine text="去提问" />
        </span>
        <span className="ans-state ans-state--sent">
          <span className="ans-icon" aria-hidden="true" />
          <LetterLine text="出发" />
        </span>
      </a>
      <button
        type="button"
        className={retracting ? 'ans-xbtn is-closing' : 'ans-xbtn'}
        aria-label="关闭"
        onClick={() => onClose(250)}
      />
    </div>
  );
};

export default Component;
