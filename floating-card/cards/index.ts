/**
 * 卡片登记表。运行时以后端（数据目录）返回为准，前端不再内置任何卡片内容。
 * 这里只提供登记表实例：overlay 往里面 setOpener，菜单/外部按卡名 open。
 */
import { createCardRegistry } from 'plugin-shared';

/** 和 slug 一样，intern 用这把钥匙，前后台才能看到同一张表。 */
export const CARD_REGISTRY_KEY = 'floating_card';

export const cardRegistry = createCardRegistry(CARD_REGISTRY_KEY);
