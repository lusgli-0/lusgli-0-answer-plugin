# Lite Runtime 功能演示

本 cell 可通过 `data-ans-cell="lite-runtime-demo"` 触发，也可由菜单总线派发 `lite_runtime` action 并传入 `{ cell_id: "lite-runtime-demo" }`。

演示内容：

- 独立 HTML、CSS、JS 文件和按 cell ID 加载配置。
- 操作面板 DOM、按钮事件、输入内容和面板内状态。
- 使用 `overlay` 查询遮罩关闭卡片，并读取浮层打开状态。
- 通过 cell CSS 按 overlay ID 单独设置毛玻璃、渐变遮罩和极光入场动画，不影响其他 cell。
- `api.onOpen` / `api.onClose` 生命周期回调。
- 通过 `scope.listen` 绑定并随关闭清理事件的鼠标倾斜效果。
- 点卡片右上角或遮罩，或按 `Esc` 关闭浮层。

触发元素示例：

```html
<button type="button" data-ans-cell="lite-runtime-demo">打开 Lite Runtime 演示</button>
```
