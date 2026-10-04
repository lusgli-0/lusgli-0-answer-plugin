/*
 * i18n 键名常量表。必须和 yaml 里 plugin.lite_runtime.backend... 逐字对应，
 * Answer 合并插件翻译时按这些 key 去 bundle 里取 other。
 */
package i18n

const (
	InfoName         = "plugin.lite_runtime.backend.info.name"
	InfoDescription  = "plugin.lite_runtime.backend.info.description"
	ConfigDirTitle   = "plugin.lite_runtime.backend.config.cells_dir.title"
	ConfigDirDesc    = "plugin.lite_runtime.backend.config.cells_dir.description"
	ConfigUsageTitle = "plugin.lite_runtime.backend.config.usage.title"
	ConfigUsageDesc  = "plugin.lite_runtime.backend.config.usage.description"
)
