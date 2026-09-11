/**
 * plugin-shared：本地插件共用的前端 npm 包（不是 Answer 插件）。
 *
 * 入口放在 src/index.ts，根目录故意没有 index.ts：
 * ui/scripts/importPlugins.js / loadPlugins.js 只认 plugins/<dir>/index.ts。
 * 根上若有 index.ts，官方扫描会当 UI 插件读 info.yaml，没有就抛错。
 *
 * 调用方：import { spaGo, createCachedStorage } from 'plugin-shared'
 * 无默认 slug / storageKey / 卡名 / 文案，一律由调用方传入。
 *
 * 消费者 vite 不要把本包放进 external：PluginKit 只加载插件自己的 dist，
 * 运行时解析不了 plugin-shared，必须打进调用方包里。
 */

export {
  parseClockToMinutes,
  isNowInTimeRange,
  hourInRange,
  formatLocalYmd,
} from './clock';

export { parseJsonArray, toFiniteInt, unwrapApiData, asStringList } from './json';

export { createCachedStorage } from './storage';
export type { CachedStorage } from './storage';

export { makePeriodKey } from './period';
export type { PeriodKeySpec } from './period';

export {
  spaGo,
  onInternalNavClick,
  toPath,
  subscribePath,
  getPathname,
  usePathname,
} from './spaNav';

export { mountOutsideRoot } from './mount';

export { writeTextarea, EnhanceTextareaField } from './schemaForm';
export type { EnhanceTextareaFieldProps } from './schemaForm';

export { createCardRegistry } from './cardRegistry';
export type {
  CardHost,
  CardRegistration,
  CardRegistry,
  CardRenderHandle,
  CardSources,
} from './cardRegistry';

export { createActionRegistry, MENU_ACTION_BUS_KEY } from './actionRegistry';
export type { ActionContext, ActionHandler, ActionRegistry } from './actionRegistry';
