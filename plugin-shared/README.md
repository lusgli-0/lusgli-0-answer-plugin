# plugin-shared

本地插件共用的 **npm 包 + Go 模块**。不是 Answer 插件：无 Register、无 `info.yaml`、无根 `index.ts`、后台看不到。

无默认 slug / `storageKey` / 卡名 / 文案。调用方传入。

| 角色 | 值 |
|---|---|
| npm name / 目录 | `plugin-shared` |
| 前端入口 | `src/index.ts` |
| Go module | `github.com/lusgli-0/lusgli-0-answer-plugin/plugin-shared` |
| Go 包名 | `pluginshared` |

## 接入

不要在消费者 `package.json` 写 `workspace:*` 或 `file:../plugin-shared`。  
前者：vendor 里孤立 install 没有 workspace。  
后者：`answer build` 会把 `plugin-shared` 改名为 `plugin_shared`。

`src/` 必须有 `//go:embed src`（见 `frontend.go`）：`go mod vendor` 不会拷没有 `.go` 的子目录，否则 UI 侧 `tsc` 找不到 `plugin-shared`。

```ts
import { spaGo, createCachedStorage } from 'plugin-shared';
```

消费者 vite alias 同时认 `../plugin-shared` 和 `../plugin_shared`；**不要** external 本包。`react-dom/client`、`react/jsx-runtime` 要 external。

发布后，消费者 `go.mod` 直接 require（不用写 `replace`）：

```
require github.com/lusgli-0/lusgli-0-answer-plugin/plugin-shared v0.1.0
```

本地开发时，`answer build` 必须再加 `--with` 指向本地目录（临时主模块会忽略消费者 `go.mod` 里的 replace，所以要单独 `--with`）：

```text
--with github.com/lusgli-0/lusgli-0-answer-plugin/plugin-shared@=./ui/src/plugins/plugin-shared
```

本包不 Register，`answer plugin` 里不会出现。改 Go 后重编后端；改 TS 后重打**消费者** dist。

## 不要放进本包

默认 key/slug/文案、`DisplayRule`、`plugin.Config`、依赖主站 `internal` / `github.com/apache/answer`。

## 前端 API 要点

- `clock`：半开区间。`isNowInTimeRange(start===end)` 全天；`hourInRange(from===to)` false。不要合成。
- `storage`：`createCachedStorage(storageKey)` intern；`get` 换桶不写盘。
- `spaNav`：`#root` 外无 Router，用 `spaGo`。订地址栏用 `usePathname()`（内部包一层 pushState，无默认路径）。
- `mountOutsideRoot({ hostId, node, placement })`：按 hostId 复用 Root，挂在 `window`。
- `writeTextarea`：必须走 textarea 原型 setter 再 `input` 事件。
- `createCardRegistry(registryKey)`：无默认卡名；intern 挂 `window`。
- `createActionRegistry(registryKey)` + `MENU_ACTION_BUS_KEY`：菜单动作总线，同 slug 重复 `register` 会覆盖、intern 挂 `window`。菜单 `dispatch(slug, payload, ctx)`，目标插件 `register(slug, handler)`。

## Go

`WriteAPI` → `{code,reason,msg,data}`（插件不能 import `internal`）。  
`AsJSONArray` / `ParseLines`。  
`ReadInfo(fs, "info.yaml", "hello_banner")`：读**调用方**的 yaml，slug 调用方传入。
