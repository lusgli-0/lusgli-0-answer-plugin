/**
 * 按 slug 登记「某个菜单动作由谁处理」——插件之间松耦合的菜单总线。
 *
 * 为什么会有这个文件：
 *   侧栏菜单（community-menu）只知道一条按钮要「触发某个插件」（slug），
 *   但不想 import 那个插件的内部实现。插件在加载时自己来登记：
 *   「我的 slug 是这个，收到动作时请这样处理」。
 *
 * 它替代了旧的 window 自定义事件（'answer:plugin-action'）。旧做法是广播：
 *   每个插件都 addEventListener，再自己 if (slug !== 我的) return，
 *   每加一个插件都要抄一遍「常量 + 监听 + HMR 去重 + slug 判断」，还没有类型。
 *   这里是「查字典」：dispatch 直接 Map.get(slug)，定向找到唯一处理者。
 *
 * 实现原理（和 cardRegistry 一样的套路）：
 *   三个插件各自把 plugin-shared 打进自己的 dist，所以运行时会有三份本模块。
 *   为了让它们拿到同一张表，这里把表挂在 window 上，用同一个 key 保证：
 *   不管哪份代码先跑，都会找到 / 创建同一张表，而不是各玩各的。
 *
 * 用法（三步）：
 *   1) 被触发的插件：模块加载时报到
 *      const actions = createActionRegistry(MENU_ACTION_BUS_KEY);
 *      actions.register('random_question', (_payload, { request, navigate }) => {
 *        void goRandomQuestion(request, navigate);
 *      });
 *
 *   2) 菜单插件：点按钮时定向派发（不广播）
 *      actions.dispatch(slug, item.payload, { request, navigate });
 *
 *   3) 需要参数的插件可以给 handler 声明 payload 类型，拿到类型提示
 *      actions.register<{ card_id?: string }>('floating_card', (payload) => {
 *        cardRegistry.open(String(payload.card_id));
 *      });
 *
 * 没有默认 key：和 createCardRegistry 一样，key 由调用方传入。
 * MENU_ACTION_BUS_KEY 只表示「菜单总线」这一把，字符串只在这里出现一次。
 */

/** 派发给目标插件的「宿主上下文」：request 调接口、navigate 跳路由 */
export interface ActionContext {
  /** 宿主 axios 实例（带 token / 拦截器）。目标插件调接口用它，不要自己 import 主站 request */
  request: { instance: { get(url: string): Promise<unknown> } };
  /** 宿主 React Router 的 navigate，做 SPA 跳转用它，和主站同一套路由 */
  navigate: (url: string) => void;
}

/** 一个菜单动作的处理函数。TPayload 由插件在 register 时自己声明 */
export type ActionHandler<TPayload = unknown> = (
  payload: TPayload,
  ctx: ActionContext,
) => void;

export interface ActionRegistry {
  /** 登记：slug 用 info.yaml 里的 slug_name（下划线）。同 slug 重复登记会覆盖 */
  register<TPayload>(slug: string, handler: ActionHandler<TPayload>): void;
  /** 派发：按 slug 查表调用。没有登记就 console.warn 后静默返回，不 throw */
  dispatch(slug: string, payload: unknown, ctx: ActionContext): void;
  /** 调试用：列出当前登记了哪些 slug */
  list(): string[];
}

/** 菜单总线只此一把。字符串写死在这里，别在别处再手写 'answer_menu_actions' */
export const MENU_ACTION_BUS_KEY = 'answer_menu_actions';

// 三份 bundle 共享同一张表，靠 window 挂载（见文件头注释）。
const WINDOW_KEY = '__plugin_shared_action_registries__';
type RegistryMap = Map<string, ActionRegistry>;

// 非 window 环境（SSR/测试）退回这张模块级表，和 cardRegistry 同一做法。
const intern = new Map<string, ActionRegistry>();

function getIntern(): RegistryMap {
  if (typeof window === 'undefined') return intern;
  const w = window as Window & { [WINDOW_KEY]?: RegistryMap };
  if (!w[WINDOW_KEY]) {
    w[WINDOW_KEY] = intern;
  }
  return w[WINDOW_KEY];
}

function makeRegistry(): ActionRegistry {
  const handlers = new Map<string, ActionHandler>();

  return {
    register<TPayload>(slug: string, handler: ActionHandler<TPayload>): void {
      const id = String(slug || '').trim();
      if (!id) return;
      // 这是唯一一次把 TPayload 收窄成 unknown 的地方；之后 dispatch 只看 unknown
      handlers.set(id, handler as ActionHandler);
    },

    dispatch(slug: string, payload: unknown, ctx: ActionContext): void {
      const id = String(slug || '').trim();
      const handler = handlers.get(id);
      if (!handler) {
        console.warn(`[actions] 没有插件登记 '${id}'，请确认对应插件已启用`);
        return;
      }
      handler(payload, ctx);
    },

    list(): string[] {
      return Array.from(handlers.keys());
    },
  };
}

export function createActionRegistry(key: string): ActionRegistry {
  const id = String(key || '').trim();
  const table = getIntern();
  const hit = table.get(id);
  if (hit) return hit;
  const created = makeRegistry();
  if (id) table.set(id, created);
  return created;
}
