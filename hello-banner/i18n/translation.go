// Package i18n 只放「翻译键」字符串，相当于 JS 里的常量：
//   export const InfoName = 'plugin.hello_banner.backend.info.name'
// 真正的中英文写在同目录的 zh_CN.yaml / en_US.yaml 里。
package i18n

const (
	InfoName        = "plugin.hello_banner.backend.info.name"
	InfoDescription = "plugin.hello_banner.backend.info.description"

	ConfigGreetingSlotsTitle       = "plugin.hello_banner.backend.config.greeting_slots.title"
	ConfigGreetingSlotsDescription = "plugin.hello_banner.backend.config.greeting_slots.description"
	ConfigQuotesTitle              = "plugin.hello_banner.backend.config.quotes.title"
	ConfigQuotesDescription        = "plugin.hello_banner.backend.config.quotes.description"

	ConfigDisplayRulesTitle       = "plugin.hello_banner.backend.config.display_rules.title"
	ConfigDisplayRulesDescription = "plugin.hello_banner.backend.config.display_rules.description"
)
