1. 浏览器加载 lite-runtime
2. Component.tsx 调用 fetchPublicConfig()
3. load/ 请求 /answer/api/v1/lite-runtime/config
4. Go 的 handlePublicConfig() 扫描 cells/
5. Go 返回 cells 数组
6. cellRuntime.ts 根据 cell_id 打开某个 cell

加载配置：load/ 请求配置并返回后端提供的 cells。
选择 cell：cellRuntime.ts 根据 cell_id 找到配置并准备样式。
创建视图：mount/ 创建浮层 DOM、panel 并注入样式。
建立生命周期：lifecycle/manager.ts 从 ready 状态开始，stateMachine.ts 管理 ready/running/idle 转换，hooks.ts 定义回调接口。
运行 cell：run/ 执行 cell JS，脚本通过 api 注册 onOpen/onClose。
打开/关闭：cellRuntime.ts 编排流程；events.ts 负责转发用户事件；mount/cell.ts 提供 mount/unmount；关闭后保留 cell slot 进入 idle。
插件卸载：Component.tsx 卸载时调用 unloadCellRuntime()；后端清理尚未实现。

## 打开入口

`openCell(cellId)` 有两个调用入口：

- 菜单总线：`Component.tsx` 注册 `lite_runtime` action；收到 `{ cell_id }` 后更新配置并直接调用 `openCell(cell_id)`。
- 页面触发器：`Component.tsx` 挂载时调用 `startCellRuntime()`；它把 `openCell` 和 `closeAll` 交给 `events.ts`。点击带 `data-ans-cell="cell-id"` 的元素时，事件处理器调用 `openCell(cellId)`；点击浮层背景或按 Escape 则调用 `closeAll()`。

`Component.tsx` 卸载时调用 `unloadCellRuntime()`；当前此函数尚未实现后端清理。

cell 的 JS 会在运行时提供的上下文里执行，
 * 可以直接使用 panel、overlay、api，不污染全局脚本作用域。

 cell 的 JS 执行时，runtime 会把 api.onOpen 和 api.onClose 提供给它。
 onOpen/onClose 注册的是 cell 自己想在打开或关闭时执行的额外代码。
 cell 脚本可以这样注册回调：
```javascript
api.onOpen(() => {
  console.log('cell 打开了');
});

api.onClose(() => {
  console.log('cell 关闭了');
});
```

每个 Cell 放在 cells 子目录里，文件夹名就是 cell_id。

前端文件放在：
cells/{cell_id}/frontend/{cell_id}.html
cells/{cell_id}/frontend/{cell_id}.css
cells/{cell_id}/frontend/{cell_id}.js

修改后刷新 Answer 前台即可，不用重启。删除 Cell 时删除对应的 cells/{cell_id}/ 文件夹。

Docker 默认数据目录是 /data，因此容器内的 Cell 目录为：
/data/lite-runtime/cells/{cell_id}/