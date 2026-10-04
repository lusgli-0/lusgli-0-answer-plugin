# lite-runtime

一个为 Apache Answer 设计的嵌入式微服务运行时。它从数据目录发现 Cell，按需加载前端与后端——无需重新编译，无需重启容器，刷新页面即更新。

> [!WARNING]
> 早期开发版。后端功能尚未开发，目前仅前端功能可用。
> Cell 清单格式尚未添加，各种接口可能随时变化。

## 为什么用 lite-runtime？

如果你的需求是“加一个 OAuth 登录方式”或“把文件存到 S3”，这些是一次性配置、之后很少改动的功能，官方插件是合适的。编译一次，长期使用。

但如果你的需求是“快速迭代、频繁增加新功能、用自己喜欢的语言写后端”，官方插件的编译时模型就成了瓶颈。Answer 插件的后端语言必须用 Go，前端也有明确的技术栈，每改一次插件都要走完整的构建流程，这在开发和实验阶段极其低效。

lite-runtime 解决的就是这些问题：编译一次宿主插件，之后所有 Cell 的增删改都不再需要碰 Answer 的构建流程，把扩展的迭代周期从“分钟级编译+重启”压缩到了“秒级刷新”。并且得益于它绕开了这个“编译时集成”模型，Cell 的后端可以用 Python/Node 等任意语言，前端不强制使用React（尚未测试，建议先用原生 Javascript）。

## 什么是 Cell？

Cell 是 lite-runtime 中的一个微服务。每个 Cell 可以拥有自己的前端、后端和数据。Cell 通过文件夹名被发现，在触发时加载。

与传统的 Answer 插件不同，Cell 不需要重新编译 Answer。只需修改数据卷里的文件，刷新页面即可生效。

## 插件加载与执行

数据目录中的 Cell `.js` 文件是在运行时通过 `new Function(...)` 执行的。

执行链路如下：

1. 插件包入口 `index.ts` 先执行。它创建 `Component`，调用 `mountOutsideRoot()` 把 React 组件挂到页面，然后导出插件信息。
2. React 挂载 `Component` 后，`Component.tsx` 的 effect 开始工作：请求后端配置、注册菜单 action，并调用 `startCellRuntime()` 安装全局点击和键盘事件。
3. 用户触发某个 Cell 后，`events.ts` 或菜单 action 调用 `openCell(cellId)`。`cellRuntime.ts` 根据 `cell_id` 找到配置，创建浮层、注入样式，再调用 `runCellJs()` 执行 Cell 的 JS。
4. 点击浮层背景或按 Escape 会调用 `closeAll()`；关闭后保留已创建的 Cell slot，使其进入 idle 状态。

## 配置加载

前台请求 `/answer/api/v1/lite-runtime/config`。Go 后端的 `handlePublicConfig()` 每次收到请求时扫描数据目录中的 `cells/`，读取每个 Cell 的 HTML、CSS 和 JS，并返回 `cells` 数组及内置共享样式。

## 打开与关闭

`openCell(cellId)` 有两个入口：

- **quick-links 魔改版总线**：`Component.tsx` 注册 `lite_runtime` action。收到 `{ cell_id }` 后使用最新配置调用 `openCell(cell_id)`。
- **页面触发器**：点击带有 `data-ans-cell` 属性的元素时打开对应 Cell，例如：

  ```html
  <button data-ans-cell="hello">打开</button>
  ```

点击浮层背景或按 Escape 会关闭当前 Cell。

## 编写 Cell

每个 Cell 放在 `cells` 目录下的独立子目录中，子目录名就是 `cell_id`。文件按以下路径和命名放置：

```text
cells/{cell_id}/
└── frontend/
    ├── {cell_id}.html
    ├── {cell_id}.css
    └── {cell_id}.js
```

Cell 的 JS 会以 `panel`、`overlay` 和 `api` 作为运行时参数执行，可以通过 `api` 注册打开和关闭时的回调：

```javascript
api.onOpen(() => {
  console.log('cell 打开了');
});

api.onClose(() => {
  console.log('cell 关闭了');
});
```

## 部署与更新

Docker 默认容器目录为 `/data`，因此默认 Cell 目录为：

```text
/data/lite-runtime/cells/{cell_id}/
```

修改或新增 Cell 文件后，刷新 Answer 页面即可重新加载配置。删除 Cell 时，删除对应的 `cells/{cell_id}/` 目录。

## 当前限制

 `unloadCellRuntime()` 是个空函数，尚未实现 Cell 后端的清理。
 `lite-runtime.go` 里的 `mustFile()` 后续考虑删除。
