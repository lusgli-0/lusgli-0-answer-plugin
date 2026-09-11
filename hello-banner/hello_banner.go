//answer插件开发一共三个接口：
//plugin.Base（必须实现）   → 告诉 Answer「我是谁」（名字、slug、版本）
//必须有的方法:Info()
//plugin.Config（可选）→ 后台出现「设置」页，管理员能改问候语 / 语录列表
//必须有的方法:ConfigFields() ConfigReceiver()
//plugin.Agent（可选）→ 挂一条游客也能访问的 HTTP 接口
//必须有的方法:RegisterAuthUserRouter()
//            RegisterAuthAdminRouter() 
//            RegisterUnAuthRouter()
//
//Answer 给插件准备的存库方式是：
//后台设置 → 打成一段 JSON → 放进 plugin_config 表。
//如果想让管理员能改，并且重启后还在：
// Config加字段->ConfigFields()加同名输入框->ConfigReceiver()里解析JSON->赋值给Config对象
//
// 编进二进制：
//   answer build \
//     --with github.com/lusgli-0/lusgli-0-answer-plugin/hello-banner@=./ui/src/plugins/hello-banner \
//     --with github.com/lusgli-0/lusgli-0-answer-plugin/plugin-shared@=./ui/src/plugins/plugin-shared
// 后端只存 JSON 并转发到前端。
package hello_banner

import (
	"embed"
	"encoding/json"
	"strings"

	"github.com/apache/answer/plugin"
	"github.com/gin-gonic/gin"
	"github.com/lusgli-0/lusgli-0-answer-plugin/hello-banner/i18n"
	pluginshared "github.com/lusgli-0/lusgli-0-answer-plugin/plugin-shared"
)

//go:embed info.yaml
// 上面这行不是注释，是编译指令：把 info.yaml 打进二进制。
var infoFS embed.FS

// from 含、to 不含。from 是 0–23，to 是 0–24（24 = 当天结束）。
const defaultGreetingSlotsJSON = `[
  { "from": 23, "to": 6, "text": "夜深了，边灌快乐水边敲代码" },
  { "from": 6, "to": 9, "text": "早上好，先来杯咖啡再写代码" },
  { "from": 9, "to": 12, "text": "上午好，思路最清晰的时刻" },
  { "from": 12, "to": 14, "text": "中午好，吃饱了别急着 merge" },
  { "from": 14, "to": 18, "text": "下午好，和 bug 战个痛快" },
  { "from": 18, "to": 23, "text": "晚上好，今晚的 commit 属于你" }
]`

const defaultQuotes = ``

// defaultDisplayRulesJSON 空数组 = 前台不限制次数，横幅始终显示。
const defaultDisplayRulesJSON = `[]`

// 左边是go变量名，代码用
//右面json:"..."是存进数据库时用的键。
//保存后，数据库里大概是：
//greeting_slots = 第一个框里敲的那些字
//quotes         = 第二个框里敲的那些字
//display_rules  = 第三个框里敲的那些字
// display_rules 后端不解析字段含义，
// 只负责存进 plugin_config、再从公开接口原样转发出去；合法与否由前端判断。
type Config struct {
	GreetingSlots string `json:"greeting_slots"`
	Quotes        string `json:"quotes"`
	DisplayRules  string `json:"display_rules"`
}

//json:"..."告诉Go自带的encoding/json包：
//当这个结构体被转成json时，字段名叫什么，
//当从json转成结构体时，匹配哪个字段。
// GreetingSlot 一条时段。前端用当地小时匹配，后端只负责校验和原样下发。
type GreetingSlot struct {
	From int    `json:"from"`
	To   int    `json:"to"`
	Text string `json:"text"`
}

type publicConfig struct {
	GreetingSlots []GreetingSlot  `json:"greeting_slots"`
	Quotes        []string        `json:"quotes"`
	DisplayRules  json.RawMessage `json:"display_rules"`
}

// HelloBanner 插件本体。Config 存在内存里，Answer 启动/保存时会灌进来。
type HelloBanner struct {
	Config *Config
}

// 如果把一个具体类型赋值给一个接口变量
// 编译器必须确认这个类型是否实现了这个接口的所有方法
var (
	_ plugin.Base   = (*HelloBanner)(nil)
	_ plugin.Config = (*HelloBanner)(nil)
	_ plugin.Agent  = (*HelloBanner)(nil)
)
//answer build --with 把这个包编进主程序后，进程启动加载包时自动跑 init()
func init() {
	plugin.Register(&HelloBanner{
		Config: defaultConfig(),
	})
}

func defaultConfig() *Config {
	return &Config{
		GreetingSlots: defaultGreetingSlotsJSON,
		Quotes:        defaultQuotes,
		DisplayRules:  defaultDisplayRulesJSON,
	}
}

// Info 后台「已安装插件」列表用的元数据。
//当模板直接抄就行
func (h *HelloBanner) Info() plugin.Info {
	info := pluginshared.ReadInfo(infoFS, "info.yaml", "hello_banner")
	return plugin.Info{
		Name:        plugin.MakeTranslator(i18n.InfoName),
		SlugName:    info.SlugName,
		Description: plugin.MakeTranslator(i18n.InfoDescription),
		Author:      info.Author,
		Version:     info.Version,
		Link:        info.Link,
	}
}

// ConfigFields 描述后台表单。Answer 根据这份数组自动画输入框。
// 你不用自己写管理页 HTML。
//骨架可以抄，三个框的内容不能原样搬
func (h *HelloBanner) ConfigFields() []plugin.ConfigField {
	cfg := h.Config
	if cfg == nil {
		cfg = defaultConfig()
	}
	return []plugin.ConfigField{
		{
			Name:        "greeting_slots", // 必须和 Config 的 json:"..." 一样
			Type:        plugin.ConfigTypeTextarea,
			Title:       plugin.MakeTranslator(i18n.ConfigGreetingSlotsTitle),
			Description: plugin.MakeTranslator(i18n.ConfigGreetingSlotsDescription),
			Value:       cfg.GreetingSlots, // 框里现在显示什么
			UIOptions: plugin.ConfigFieldUIOptions{
				Rows:      "14",
				ClassName: "small font-monospace",
			},
		},
		{
			Name:        "quotes",
			Type:        plugin.ConfigTypeTextarea,
			Title:       plugin.MakeTranslator(i18n.ConfigQuotesTitle),
			Description: plugin.MakeTranslator(i18n.ConfigQuotesDescription),
			Value:       cfg.Quotes,
			UIOptions: plugin.ConfigFieldUIOptions{
				Rows:      "6",
				ClassName: "small font-monospace",
			},
		},
		{
			Name:        "display_rules",
			Type:        plugin.ConfigTypeTextarea,
			Title:       plugin.MakeTranslator(i18n.ConfigDisplayRulesTitle),
			Description: plugin.MakeTranslator(i18n.ConfigDisplayRulesDescription),
			Value:       cfg.DisplayRules,
			UIOptions: plugin.ConfigFieldUIOptions{
				Rows:      "10",
				ClassName: "small font-monospace",
			},
		},
	}
}

func (h *HelloBanner) ConfigReceiver(config []byte) error {
	c := &Config{}
	// 在 ConfigReceiver 里把后台存下来的 JSON 填进 Config 对象
	// Answer 会在两种时候调用这个函数：
	// 1. 管理员点保存
	// 2. 进程启动时从 plugin_config 表把旧配置灌回来
	if len(strings.TrimSpace(string(config))) > 0 {
		// 把键填进 c 里
		_ = json.Unmarshal(config, c)
	}
	// 这里写本插件自己的默认值 / 清洗 / 副作用
	// 剩下的是可以抄的骨架
	applyListDefaults(c) // 从未配过时初始化列表
	// 把 Config 对象赋值给 h.Config，这样 Config 对象就存在内存里了
	h.Config = c
	return nil
}

//从未配过时初始化列表
func applyListDefaults(c *Config) {
	if strings.TrimSpace(c.GreetingSlots) == "" {
		c.GreetingSlots = defaultGreetingSlotsJSON
	}
	// 空规则存 []，不存空串。
	// 设置页的框里要有这份 JSON，卡片才能按「零条规则」来画。
	if strings.TrimSpace(c.DisplayRules) == "" {
		c.DisplayRules = defaultDisplayRulesJSON
	}
}

//RegisterUnAuthRouter 挂到 /answer/api/v1 下面，游客可访问。
//r *gin.RouterGroup 是插件的根路由组，所有插件的接口都挂在这个组下面
//根路由组是/answer/api/v1
//GET /answer/api/v1/hello-banner/config
//handlePublicConfig 是插件的公共配置接口，访问这个URL会调用这个函数
func (h *HelloBanner) RegisterUnAuthRouter(r *gin.RouterGroup) {
	r.GET("/hello-banner/config", h.handlePublicConfig)
}

// Agent 接口要求这三个方法都写上。没有登录用户 / 管理员专用接口，留空即可。
func (h *HelloBanner) RegisterAuthUserRouter(_ *gin.RouterGroup) {}

func (h *HelloBanner) RegisterAuthAdminRouter(_ *gin.RouterGroup) {}

func (h *HelloBanner) handlePublicConfig(ctx *gin.Context) {
	// 如果插件被禁用，返回空数据。
	if !plugin.StatusManager.IsEnabled(h.Info().SlugName) {
		pluginshared.WriteAPI(ctx, publicConfig{
			GreetingSlots: []GreetingSlot{},
			Quotes:        []string{},
			DisplayRules:  json.RawMessage("[]"),
		})
		return
	}
	cfg := h.Config
	//cfg == nil 时用默认配置。
	if cfg == nil {
		cfg = defaultConfig()
	}
	pluginshared.WriteAPI(ctx, publicConfig{
		GreetingSlots: parseGreetingSlots(cfg.GreetingSlots),
		Quotes:        pluginshared.ParseLines(cfg.Quotes),
		DisplayRules:  pluginshared.AsJSONArray(cfg.DisplayRules), // 原样转发；字段含义由前端 parseDisplayRules 解释
	})
}

func parseGreetingSlots(raw string) []GreetingSlot {
	defaults := mustDefaultSlots()
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return defaults
	}
	var slots []GreetingSlot
	if err := json.Unmarshal([]byte(trimmed), &slots); err != nil {
		return defaults
	}
	out := make([]GreetingSlot, 0, len(slots))
	for _, slot := range slots {
		cleaned, ok := sanitizeSlot(slot)
		if !ok {
			continue
		}
		out = append(out, cleaned)
	}
	if len(out) == 0 {
		return defaults
	}
	return out
}

func mustDefaultSlots() []GreetingSlot {
	var slots []GreetingSlot
	if err := json.Unmarshal([]byte(defaultGreetingSlotsJSON), &slots); err != nil {
		return []GreetingSlot{}
	}
	return slots
}

//Trimspace()去掉两端空白并检查时间合法性
func sanitizeSlot(slot GreetingSlot) (GreetingSlot, bool) {
	slot.Text = strings.TrimSpace(slot.Text)
	if slot.Text == "" {
		return slot, false
	}
	if slot.From < 0 || slot.From > 23 {
		return slot, false
	}
	if slot.To < 0 || slot.To > 24 {
		return slot, false
	}
	if slot.From == slot.To {
		return slot, false
	}
	return slot, true
}

