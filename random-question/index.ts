/*
 * 随机问题插件入口。
 *
 * 何时被加载：
 *   后台启用 slug=random_question 之后，PluginKit.registerPlugins 会
 *   dynamic import('random-question')。本文件一执行就会向菜单总线报到。
 * 
 * 和另外两个插件怎么接线（菜单总线，见 plugin-shared/src/actionRegistry.ts）：
 *   community-menu 按钮 action=plugin 时 actions.dispatch(slug, payload, ctx)，
 *   ctx = { request, navigate }。request / navigate 来自 SideNav 传给
 *   PluginRender 的 props，不要在本文件 import '@/utils/request'。
 *   本文件用 actions.register 登记 random_question，floating-card 登记自己的 slug，互不干扰。
 *
 *   1. GET /answer/api/v1/random-question/config 读后台 page_size（失败用 20）
 *   2. GET /answer/api/v1/question/page?page=1&page_size=…&order=newest
 *   3. count > page_size 时再随机翻一页
 *   4. 从该页 list 随机挑一条，跳 /questions/{id}/{url_title}
 */

import {
  createActionRegistry,
  MENU_ACTION_BUS_KEY,
  spaGo,
  toFiniteInt,
  toPath,
  unwrapApiData,
} from 'plugin-shared';
import type { ActionContext } from 'plugin-shared';

import Component from './Component';
import i18nConfig from './i18n';
import info from './info.yaml';

/* 配置接口失败时用这个，不要让整次跳转停掉。 */
const DEFAULT_PAGE_SIZE = 20;

/* Answer 真正的 API 前缀，错写成 /api/v1 会被前端路由吞成 HTML */
const API_PATH = '/answer/api/v1';

/* 后台 page_size。路径跟目录名走，不是 slug。 */
const CONFIG_API = `${API_PATH}/random-question/config`;

/* 问题列表接口。order=newest 和 yejiao 一致，保证 count 是全站问题总数 */
const QUESTION_PAGE_API = `${API_PATH}/question/page`;

/* 本插件 slug，必须和 info.yaml / 菜单 JSON 的 "plugin" 字段一致 */
const SLUG = 'random_question';

interface QuestionPageData {
  count?: number;
  list?: QuestionItem[];
}

interface QuestionItem {
  id?: string;
  url_title?: string;
}

/* 站点前缀。根路径安装返回 ''；装在 /forum 这类子路径则返回 '/forum'。
 * 优先从页面上已有的问题链接推；没有就从 custom.css 的 href 推。 */
function siteBase(): string {
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

/* 拼问题详情地址：/questions/{id}/{url_title}。没有 url_title 就只拼 id。 */
function questionPath(q: QuestionItem): string {
  let url = `/questions/${q.id}`;
  if (q.url_title) url += `/${q.url_title}`;
  return url;
}

/* 有 navigate（community-menu 从 SideNav 传来的 useNavigate）就走 React Router；
 * 没有则 spaGo。navigate 吃 basename 之后的路径（剥前缀），spaGo 要完整路径（补前缀）。 */
function goTo(url: string, navigate?: (path: string) => void): void {
  const path = toPath(url);
  if (!path) return;
  const base = siteBase();

  if (typeof navigate === 'function') {
    const routerPath =
      base && path.startsWith(base) ? path.slice(base.length) || '/' : path;
    navigate(routerPath);
    return;
  }

  /* TODO: spaGo 兜底目前基本是死代码。
   * 它保的是「navigate 缺失时仍能 pushState 跳转」这条保险；
   * 但 goTo 唯一调用点 goRandomQuestion 总是带 navigate（来自菜单总线 ctx），
   * 所以这个分支走不到。若要精简，可连同顶部 import 里的 spaGo 一起删。 */
  spaGo(base && !path.startsWith(base) ? base + path : path);
}

/* 把 request.instance.get 的返回值收成 {count, list}。
 * 信封（{code,data}）交给 unwrapApiData 统一剥，拿到内层后只校验 list。 */
function unwrapPage(raw: unknown): QuestionPageData {
  const obj = unwrapApiData(raw) as QuestionPageData;
  if (Array.isArray(obj.list)) {
    return obj;
  }
  throw new Error('bad response');
}

/* 把配置接口收成 1～100。信封由 unwrapApiData 统一剥，内层读不到 page_size 就回落默认。 */
function unwrapPageSize(raw: unknown): number {
  const obj = unwrapApiData(raw) as Record<string, unknown>;
  if ('page_size' in obj) {
    return clampPageSize(toFiniteInt(obj.page_size));
  }
  return DEFAULT_PAGE_SIZE;
}

function clampPageSize(n: number): number {
  if (n < 1) return DEFAULT_PAGE_SIZE;
  if (n > 100) return 100;
  return n;
}

/* 从宿主上下文里取 axios get。没有就返回 null，调用方各自决定回落还是抛错。 */
function resolveGet(
  request: ActionContext['request'],
): ((url: string) => Promise<unknown>) | null {
  const get = request?.instance?.get;
  return typeof get === 'function' ? get : null;
}

/* 读后台 page_size。接口失败 / 没有 get 时用 20，后面仍去拉问题列表。 */
async function fetchPageSize(
  request: ActionContext['request'],
): Promise<number> {
  const get = resolveGet(request);
  if (!get) return DEFAULT_PAGE_SIZE;
  try {
    const raw = await get(CONFIG_API);
    return unwrapPageSize(raw);
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

/* GET 问题分页。必须走事件里的 request.instance.get（带 token / Accept-Language）。
 * 没有 get 就抛错，让 goRandomQuestion 放弃本次跳转。 */
async function fetchQuestionPage(
  request: ActionContext['request'],
  page: number,
  pageSize: number,
): Promise<QuestionPageData> {
  const get = resolveGet(request);
  if (!get) {
    throw new Error('no request');
  }
  const url = `${QUESTION_PAGE_API}?page=${page}&page_size=${pageSize}&order=newest`;
  const raw = await get(url);
  return unwrapPage(raw);
}

/* 随机问题主流程 */
async function goRandomQuestion(
  request: ActionContext['request'],
  navigate?: ActionContext['navigate'],
): Promise<void> {
  try {
    const pageSize = await fetchPageSize(request);
    /* 先拉第 1 页：既拿到 list，也拿到总数 count */
    const first = await fetchQuestionPage(request, 1, pageSize);
    const count = Number(first.count) || 0;
    let list = first.list || [];
    /* 全站没问题：count=0 且第一页空，没法跳 */
    if (!count && !list.length) throw new Error('empty');

    /* 总数超过一页才值得再请求；否则直接用第一页 list 随机挑 */
    if (count > pageSize) {
      const pageCount = Math.ceil(count / pageSize);
      /* 1..pageCount 闭区间随机，可能抽到第 1 页（再打一次也没关系） */
      const page = 1 + Math.floor(Math.random() * pageCount);
      const more = await fetchQuestionPage(request, page, pageSize);
      list = more.list || [];
    }
    if (!list.length) throw new Error('empty page');

    const q = list[Math.floor(Math.random() * list.length)];
    if (!q || !q.id) throw new Error('no id');
    goTo(questionPath(q), navigate);
  } catch {
    /* 接口失败 / 空列表 / 没有 request：放弃本次跳转 */
  }
}

/* 菜单总线：加载时把 random_question 的动作报到登记表。
 * community-menu 点按钮 actions.dispatch(SLUG, payload, ctx) 时，这里会被调用。
 * request / navigate 由宿主传进来。 */
const actions = createActionRegistry(MENU_ACTION_BUS_KEY);

actions.register(SLUG, (_payload, { request, navigate }) => {
  void goRandomQuestion(request, navigate);
});

export default {
  info: {
    slug_name: info.slug_name,
    type: info.type,
  },
  component: Component,
  i18nConfig,
};
