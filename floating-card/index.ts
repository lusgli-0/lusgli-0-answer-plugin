/**
 * 前端入口。PluginKit import('floating-card') 时执行。
 *
 * 先加载 cards/（建登记表），再 mountOutsideRoot 挂控制器。
 * 开卡入口两个：
 *   ① 菜单总线：community-menu 派发动作 → Component 里 register 的 handler。
 *   ② data-ans-card="卡名"：overlay 的全局点击监听。
 */
import { createElement } from 'react';
import { mountOutsideRoot } from 'plugin-shared';

import './cards';
import Component from './Component';
import i18nConfig from './i18n';
import info from './info.yaml';
import { ROOT_ID } from './runtime/overlay';

mountOutsideRoot({
  hostId: ROOT_ID,
  placement: 'append',
  node: createElement(Component),
});

export default {
  info: {
    slug_name: info.slug_name,
    type: info.type,
  },
  component: Component,
  i18nConfig,
};
