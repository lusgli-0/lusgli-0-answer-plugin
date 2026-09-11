/**
 * 前端入口。后台启用 slug=hello_banner 之后，PluginKit 会 import('hello-banner')。
 *
 * 不能把横幅塞进 #root，手动插入的节点下次渲染会被删。
 * mountOutsideRoot 在 body 上另开容器（prepend）
 * createRoot 让 React 画 Component。
 * 这棵树在 #root 外，没有 Router，站内跳转见 plugin-shared 的 spaGo。
 */
import { createElement, Fragment } from 'react';
import { AdminDisplayRulesBridge } from './DisplayRulesEditor';
import { mountOutsideRoot } from 'plugin-shared';
//每个index.ts都要导下面三个
import Component from './Component';
import i18nConfig from './i18n';
import info from './info.yaml';

//立刻挂DOM
//没有 mountOutsideRoot，页面上就不会出现横幅
mountOutsideRoot({
  hostId: 'hello-banner-root',
  placement: 'prepend',
  node: createElement(
    //Fragment取消包在几个组件外面的div
    Fragment,
    null,
    //Component 是插件的UI
    createElement(Component),
    //AdminDisplayRulesBridge 是插件设置页里的可视化编辑器
    createElement(AdminDisplayRulesBridge),
  ),
});
//每个UI插件入口都长这样，可以抄
export default {
  //info从本插件的info.yaml里读
  info: {
    slug_name: info.slug_name,
    type: info.type,
  },
  component: Component,
  i18nConfig,
};
