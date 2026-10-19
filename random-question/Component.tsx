/*
 * 随机问题插件：React 组件占位。
 *
 * PluginKit 要求 default export 里必须有 component。
 * SideNav 只渲染 slug_name === 'quick_links'，本插件 slug 是 random_question，
 * 所以这个组件永远不会被挂到侧栏。真正干活的是 index.ts 模块加载时向
 * 菜单总线（actionRegistry）登记的动作（由 community-menu 按钮触发）。
 *
 * 返回 null：即使以后有人误把本插件塞进 PluginRender，也不会画出空 DOM。
 */
const Component = () => null;

export default Component;
