// Package random_question 随机问题插件的 Go 侧。
//
// 后台能看到插件、能改 page_size；
// GET /answer/api/v1/random-question/config 把 page_size 交给前端。
// 这个接口在未配置时返回page_size: 0，由前端回落 20
//
// answer build --with github.com/lusgli-0/lusgli-0-answer-plugin/random-question@=./ui/src/plugins/random-question
// 把本包编进主程序；进程启动时 init() 里的 plugin.Register 把它注册进插件表。前端靠 PluginKit
// 动态 import 本目录的 index.ts，与 community-menu 通过菜单总线接线。
package random_question

import (
	"embed"
	"encoding/json"
	"strconv"
	"strings"

	"github.com/apache/answer/plugin"
	"github.com/gin-gonic/gin"
	pluginshared "github.com/lusgli-0/lusgli-0-answer-plugin/plugin-shared"
	"github.com/lusgli-0/lusgli-0-answer-plugin/random-question/i18n"
)

//go:embed info.yaml
var infoFS embed.FS

// pluginSlug 本插件 slug。后台列表、启用状态、菜单 JSON 的 "plugin" 字段都用它。
const pluginSlug = "random_question"

// RandomQuestionConfig 后台「插件配置」表单。
// page_size 对应 GET /answer/api/v1/question/page 的 page_size 查询参数。
// 输入框可能提交数字也可能提交字符串，所以用 any 接。
type RandomQuestionConfig struct {
	PageSize any `json:"page_size"`
}

type publicConfig struct {
	PageSize int `json:"page_size"`
}

// RandomQuestion 插件本体。Register 后同时满足 Base、Config、Agent。
type RandomQuestion struct {
	Config *RandomQuestionConfig
}

var (
	_ plugin.Base   = (*RandomQuestion)(nil)
	_ plugin.Config = (*RandomQuestion)(nil)
	_ plugin.Agent  = (*RandomQuestion)(nil)
)

func init() {
	plugin.Register(&RandomQuestion{
		Config: &RandomQuestionConfig{},
	})
}

// Info 后台插件列表用的名字、slug、版本。
func (r *RandomQuestion) Info() plugin.Info {
	info := pluginshared.ReadInfo(infoFS, "info.yaml", pluginSlug)
	return plugin.Info{
		Name:        plugin.MakeTranslator(i18n.InfoName),
		SlugName:    info.SlugName,
		Description: plugin.MakeTranslator(i18n.InfoDescription),
		Author:      info.Author,
		Version:     info.Version,
		Link:        info.Link,
	}
}

// ConfigFields 后台配置表单。只有 page_size 一项，InputTypeNumber。
func (r *RandomQuestion) ConfigFields() []plugin.ConfigField {
	return []plugin.ConfigField{
		{
			Name:        "page_size",
			Type:        plugin.ConfigTypeInput,
			Title:       plugin.MakeTranslator(i18n.ConfigPageSizeTitle),
			Description: plugin.MakeTranslator(i18n.ConfigPageSizeDescription),
			Required:    false,
			Value:       r.pageSizeValue(),
			UIOptions: plugin.ConfigFieldUIOptions{
				InputType:   plugin.InputTypeNumber,
				Placeholder: plugin.MakeTranslator(i18n.ConfigPageSizePlaceholder),
			},
		},
	}
}

// ConfigReceiver 保存配置时调用。解不出 JSON 就清空成未配置。
// 未配置时公开接口返回 page_size=0，由插件前端回落默认 20。
func (r *RandomQuestion) ConfigReceiver(config []byte) error {
	c := &RandomQuestionConfig{}
	_ = json.Unmarshal(config, c) // 不检查 err，直接无视
	r.Config = c
	return nil
}

// 这个插件只需一个游客也能访问的接口，让未登录的访客也能读到page_size，
// 所以只有 `RegisterUnAuthRouter` 里挂了东西。
// 完整地址：GET /answer/api/v1/random-question/config
func (r *RandomQuestion) RegisterUnAuthRouter(g *gin.RouterGroup) {
	g.GET("/random-question/config", r.handlePublicConfig)
}

// 本插件没有「登录用户专属」的功能。随机跳题是前端（菜单总线）触发的，不需要额外给登录用户开 HTTP 接口。
func (r *RandomQuestion) RegisterAuthUserRouter(_ *gin.RouterGroup) {}

// Answer 已经内置了通用的「插件配置页」来处理，不需要插件自己再开管理员 API。
func (r *RandomQuestion) RegisterAuthAdminRouter(_ *gin.RouterGroup) {}

func (r *RandomQuestion) handlePublicConfig(ctx *gin.Context) {
	pageSize := 0
	if plugin.StatusManager.IsEnabled(pluginSlug) {
		pageSize = r.pageSize()
	}
	pluginshared.WriteAPI(ctx, publicConfig{PageSize: pageSize})
}

// pageSize 把配置收成 0~100 的整数，0 表示「未配置」。后台数字框常给 float64，文本框给 string。
// 默认 20 只存在插件前端 index.ts 的 DEFAULT_PAGE_SIZE，Go 侧不再重复存；上限 100 与前端 clampPageSize 一致。
func (r *RandomQuestion) pageSize() int {
	if r == nil || r.Config == nil {
		return 0
	}
	n := 0
	switch v := r.Config.PageSize.(type) {
	case float64:
		n = int(v)
	case string:
		if parsed, err := strconv.Atoi(strings.TrimSpace(v)); err == nil {
			n = parsed
		}
	}
	if n < 1 {
		return 0
	}
	if n > 100 {
		return 100
	}
	return n
}

// pageSizeValue 后台表单显示用：未配置返回空串，让输入框露出 placeholder「20」。
// 20是i18n 文案文件里的一个字符串字面量：
// placeholder:
//   other: "20"

func (r *RandomQuestion) pageSizeValue() string {
	if n := r.pageSize(); n > 0 {
		return strconv.Itoa(n)
	}
	return ""
}
