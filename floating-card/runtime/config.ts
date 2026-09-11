/**
 * 站点前缀 + 拉公开配置。以后端（数据目录）返回为准。
 * 接口失败 → 返回空列表，不显示卡片。
 * 接口成功但列表为空（你在数据目录删光了）→ 同样保持空。
 */
import overlayCss from './overlay.css?raw';

import type { CardConfig, PublicConfig } from './cardConfig';

export const CONFIG_API_PATH = '/answer/api/v1/floating-card/config';

export function siteBase(): string {
  const a = document.querySelector('a[href*="/questions/"]');
  if (a) {
    const href = a.getAttribute('href') || '';
    const m = href.match(/^(.*)\/questions\/[^/?#]+/);
    if (m) return m[1];
  }
  const link = document.querySelector('link[href*="custom.css"]');
  const cssHref = (link && link.getAttribute('href')) || '';
  const m2 = cssHref.match(/^(.*)\/custom\.css(?:\?.*)?$/);
  return m2 ? m2[1] : '';
}

function asCard(raw: unknown): CardConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as CardConfig;
  const id = String(o.card_id || '').trim();
  if (!id) return null;
  return {
    card_id: id,
    features: {
      tilt:
        o.features && typeof o.features.tilt === 'boolean'
          ? o.features.tilt
          : true,
    },
    html: (o.html && String(o.html).trim()) || '',
    css: (o.css && String(o.css).trim()) || '',
    js: (o.js && String(o.js).trim()) || '',
    data: o.data,
  };
}

function normalize(cfg: PublicConfig): PublicConfig {
  const cards = (cfg.cards || []).map(asCard).filter((c): c is CardConfig => !!c);
  return {
    shared_css: cfg.shared_css || overlayCss,
    cards,
  };
}

function isPublicConfig(x: unknown): x is PublicConfig {
  return !!x && typeof x === 'object' && Array.isArray((x as PublicConfig).cards);
}

export async function fetchPublicConfig(
  getter?: (url: string) => Promise<unknown>,
): Promise<PublicConfig> {
  const url = siteBase() + CONFIG_API_PATH;
  try {
    let payload: unknown;
    if (getter) {
      payload = await getter(url);
    } else {
      const res = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || type.indexOf('json') === -1) {
        throw new Error('bad response');
      }
      const body = (await res.json()) as { data?: unknown };
      payload = body?.data;
    }
    if (isPublicConfig(payload)) {
      return normalize(payload);
    }
  } catch {
    /* 接口失败：落到下面的空配置，不显示任何卡 */
  }
  // 接口失败返回空列表：不显示卡片，也不用前端出厂稿顶替。
  return { shared_css: overlayCss, cards: [] };
}

