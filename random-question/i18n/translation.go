// Package i18n 存放后台翻译键。
// plugin.MakeTranslator 用这些字符串去主站 i18n bundle 里查，
// 对应 i18n/en_US.yaml、zh_CN.yaml 里 plugin.random_question.backend.* 路径。
package i18n

const (
	// InfoName 后台插件列表显示名
	InfoName = "plugin.random_question.backend.info.name"
	// InfoDescription 后台插件列表说明
	InfoDescription = "plugin.random_question.backend.info.description"
	// ConfigPageSizeTitle 配置项「每页条数」标题
	ConfigPageSizeTitle = "plugin.random_question.backend.config.page_size.title"
	// ConfigPageSizeDescription 配置项「每页条数」说明
	ConfigPageSizeDescription = "plugin.random_question.backend.config.page_size.description"
	// ConfigPageSizePlaceholder 配置项输入框占位，默认 20
	ConfigPageSizePlaceholder = "plugin.random_question.backend.config.page_size.placeholder"
)
