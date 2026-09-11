// Package pluginshared 是本地插件的共用基础设施：Go 模块 + 前端 npm 包。
//
// 不是 Answer 插件：没有 plugin.Register、没有 info.yaml、没有配置页。
// 后台「已安装插件」不会出现本包。调用方 import 函数即可。
//
// 前端入口是 src/index.ts。根目录不能有 index.ts，否则官方
// importPlugins.js / loadPlugins.js 会把它当 UI 插件扫描。
//
// 不要把问候语文案、默认 slug、storage key 放进本包；调用方自己传入。
// 不要依赖 github.com/apache/answer（插件不能 import 主站 internal，本库也不要绑主模块）。
//
// 本地：
//
//	--with github.com/lusgli-0/lusgli-0-answer-plugin/plugin-shared@=./ui/src/plugins/plugin-shared
//
// 仍要单独 --with：answer build 会生成临时 module answer，消费者 go.mod 的 replace 会被忽略。
// 路径指本目录（go.mod 与 package.json 同级）。copyUIFiles 看到 package.json 会拷进 UI，
// 但没有根 index.ts，不会写进 plugins/index.ts。
//
// 前端源码必须放在 src/ 并用 //go:embed src 钉住：vendor 不会拷没有 .go 的子目录。
package pluginshared
