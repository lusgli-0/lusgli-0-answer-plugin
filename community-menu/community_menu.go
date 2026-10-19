/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Package community_menu 左侧「快捷链接 + 符文卷轴」。
//
// 何时注册：answer build --with github.com/lusgli-0/lusgli-0-answer-plugin/community-menu 后，init() 调 plugin.Register。
// SideNav 只渲染 slug=quick_links，所以 Info().SlugName 必须读 info.yaml 里的 quick_links。
//
// 和其他插件接线：本文件不 import random-question / floating-card。
// 前端点按钮走菜单总线派发动作；本文件只负责把 menu_items 公开给游客
// （GET /community-menu/config），因为 GetSidebarConfig 的结构体改不了（不能动 plugin/*.go）。
package community_menu

import (
	"embed"
	"encoding/json"
	"strings"

	"github.com/apache/answer-plugins/util"
	"github.com/apache/answer/plugin"
	"github.com/gin-gonic/gin"
	"github.com/lusgli-0/lusgli-0-answer-plugin/community-menu/i18n"
	pluginshared "github.com/lusgli-0/lusgli-0-answer-plugin/plugin-shared"
)

//go:embed info.yaml
var Info embed.FS

// 配置项名叫 menu_title，后台输入框也用这个字段名。
const defaultMenuTitle = "符文卷轴"

// defaultMenuItemsJSON 仅用于 defaultConfig / applyMenuDefaults（从未配过 menu_items 时）。
// plugin 填对方 slug（下划线），不是目录名；payload.card_id 给 floating-card 区分公告/占卜。
const defaultMenuItemsJSON = `[
  { "id": "guide", "text": "📖 社区公告", "action": "plugin", "plugin": "floating_card", "payload": { "card_id": "guide" } },
  { "id": "random", "text": "🎲 随机问题", "action": "plugin", "plugin": "random_question" },
  { "id": "rune", "text": "🔮 符文占卜", "action": "plugin", "plugin": "floating_card", "payload": { "card_id": "rune" } },
  { "id": "external", "text": "🔗 外部链接", "action": "url", "url": "https://lusgli-0.github.io" }
]`

// Config 后台保存的整份 JSON。
// tags / links_text 沿用官方字段名，已有 Quicklinks 配置可以直接接着用。
// menu_items 用字符串而不是 []MenuItem：后台控件是 textarea，存的是用户编辑的原文。
type Config struct {
	Tags      []*plugin.TagSelectorOption `json:"tags"`
	LinksText string                      `json:"links_text"`
	MenuTitle string                      `json:"menu_title"`
	MenuItems string                      `json:"menu_items"`
}

// MenuItem 游客接口返回的一条按钮。action 只认 plugin / url。
type MenuItem struct {
	ID      string `json:"id,omitempty"`
	Text    string `json:"text"`
	Action  string `json:"action"`
	Plugin  string `json:"plugin,omitempty"`
	Payload any    `json:"payload,omitempty"`
	URL     string `json:"url,omitempty"`
}

// publicMenuConfig 游客可见的子集。故意不含 tags/links_text：那两份已经走 /sidebar/config。
// 路径叫 /community-menu/config 是跟着目录名走，以后改名时和 Agent 路由一起改。
type publicMenuConfig struct {
	MenuTitle string     `json:"menu_title"`
	MenuItems []MenuItem `json:"menu_items"`
}

// CommunityMenu 同时实现 Base + Config + Sidebar + Agent。
type CommunityMenu struct {
	Config *Config
}

var (
	_ plugin.Base    = (*CommunityMenu)(nil)
	_ plugin.Config  = (*CommunityMenu)(nil)
	_ plugin.Sidebar = (*CommunityMenu)(nil)
	_ plugin.Agent   = (*CommunityMenu)(nil)
)

func init() {
	plugin.Register(&CommunityMenu{
		Config: defaultConfig(),
	})
}

// defaultConfig 从未保存过后台配置时的内存默认值。
func defaultConfig() *Config {
	return &Config{
		Tags:      []*plugin.TagSelectorOption{},
		LinksText: "",
		MenuTitle: defaultMenuTitle,
		MenuItems: defaultMenuItemsJSON,
	}
}

// applyMenuDefaults 旧 JSON 只有 tags/links_text 时，把新字段补上。
// 空字符串视为「没配」，不要把标题刷成空白让左栏看起来坏了。
func applyMenuDefaults(c *Config) {
	if strings.TrimSpace(c.MenuTitle) == "" {
		c.MenuTitle = defaultMenuTitle
	}
	if strings.TrimSpace(c.MenuItems) == "" {
		c.MenuItems = defaultMenuItemsJSON
	}
}

// Info 插件元数据。SlugName 来自 info.yaml，禁止改成 community_menu，否则 SideNav 不渲染。
func (q *CommunityMenu) Info() plugin.Info {
	info := &util.Info{}
	info.GetInfo(Info)

	return plugin.Info{
		Name:        plugin.MakeTranslator(i18n.InfoName),
		SlugName:    info.SlugName,
		Description: plugin.MakeTranslator(i18n.InfoDescription),
		Author:      info.Author,
		Version:     info.Version,
		Link:        info.Link,
	}
}

// ConfigFields 后台表单。Name 会变成保存 JSON 的键，tags / links_text 不能改。
func (q *CommunityMenu) ConfigFields() []plugin.ConfigField {
	if q.Config == nil {
		q.Config = defaultConfig()
	}
	return []plugin.ConfigField{
		{
			Name:        "tags",
			Type:        plugin.ConfigTypeTagSelector,
			Title:       plugin.MakeTranslator(i18n.ConfigTagsTitle),
			Description: plugin.MakeTranslator(i18n.ConfigTagsDescription),
			Value:       q.Config.Tags,
		},
		{
			Name:        "links_text",
			Type:        plugin.ConfigTypeTextarea,
			Title:       plugin.MakeTranslator(i18n.ConfigLinksTitle),
			Description: plugin.MakeTranslator(i18n.ConfigLinksDescription),
			Value:       q.Config.LinksText,
			UIOptions: plugin.ConfigFieldUIOptions{
				Rows:      "5",
				ClassName: "small font-monospace",
			},
		},
		{
			Name:        "menu_title",
			Type:        plugin.ConfigTypeInput,
			Title:       plugin.MakeTranslator(i18n.ConfigMenuTitleTitle),
			Description: plugin.MakeTranslator(i18n.ConfigMenuTitleDesc),
			Value:       q.Config.MenuTitle,
			UIOptions: plugin.ConfigFieldUIOptions{
				InputType: plugin.InputTypeText,
			},
		},
		{
			Name:        "menu_items",
			Type:        plugin.ConfigTypeTextarea,
			Title:       plugin.MakeTranslator(i18n.ConfigMenuItemsTitle),
			Description: plugin.MakeTranslator(i18n.ConfigMenuItemsDesc),
			Value:       q.Config.MenuItems,
			UIOptions: plugin.ConfigFieldUIOptions{
				Rows:      "12",
				ClassName: "small font-monospace",
			},
		},
	}
}

// ConfigReceiver 后台保存或启动时灌入配置。
// config 是 JSON。必须兼容官方 {"tags","links_text"}：缺省新字段时补默认，不要报错把启动打断。
// 整段 JSON 坏掉时同样回落到默认菜单（和官方 _ = json.Unmarshal 一样不让保存失败）。
func (q *CommunityMenu) ConfigReceiver(config []byte) error {
	c := &Config{}
	if len(strings.TrimSpace(string(config))) > 0 {
		_ = json.Unmarshal(config, c)
	}
	applyMenuDefaults(c)
	q.Config = c
	return nil
}

// GetSidebarConfig 给官方 GET /answer/api/v1/sidebar/config。
// 只能填 plugin.SidebarConfig 已有字段；符文卷轴走 Agent 接口，不能塞进来。
func (q *CommunityMenu) GetSidebarConfig() (sidebarConfig *plugin.SidebarConfig, err error) {
	if q.Config == nil {
		return &plugin.SidebarConfig{}, nil
	}
	return &plugin.SidebarConfig{
		Tags:      q.Config.Tags,
		LinksText: q.Config.LinksText,
	}, nil
}

// RegisterUnAuthRouter 挂到 mustUnAuthV1（前缀 /answer/api/v1），游客能读菜单。
// 完整路径：/answer/api/v1/community-menu/config。
func (q *CommunityMenu) RegisterUnAuthRouter(r *gin.RouterGroup) {
	r.GET("/community-menu/config", q.handlePublicMenuConfig)
}

// RegisterAuthUserRouter Agent 接口要求实现；本插件没有登录用户专用路由。
func (q *CommunityMenu) RegisterAuthUserRouter(_ *gin.RouterGroup) {}

// RegisterAuthAdminRouter Agent 接口要求实现；菜单配置走官方插件配置页，不另开管理 API。
func (q *CommunityMenu) RegisterAuthAdminRouter(_ *gin.RouterGroup) {}

// handlePublicMenuConfig 游客菜单。和官方 quick-links 一样：存什么就吐什么，不做条目级过滤。
// menu_items 不是合法 JSON 数组时返回 []（复用 pluginshared.AsJSONArray，同官方 Unmarshal 失败即空）。
// 插件未启用时返回空数组（Agent 的 Call 是 super，禁用插件路由仍在，这里自己拦）。
func (q *CommunityMenu) handlePublicMenuConfig(ctx *gin.Context) {
	if !plugin.StatusManager.IsEnabled(q.Info().SlugName) {
		pluginshared.WriteAPI(ctx, publicMenuConfig{MenuTitle: defaultMenuTitle, MenuItems: []MenuItem{}})
		return
	}
	cfg := q.Config
	if cfg == nil {
		cfg = defaultConfig()
	}
	pluginshared.WriteAPI(ctx, publicMenuConfig{
		MenuTitle: cfg.MenuTitle,
		MenuItems: menuItemsFromRaw(cfg.MenuItems),
	})
}

// menuItemsFromRaw 把 textarea 原文解析成 []MenuItem。空串 / 坏 JSON / 非数组 → []。
func menuItemsFromRaw(raw string) []MenuItem {
	arr := pluginshared.AsJSONArray(raw)
	var items []MenuItem
	_ = json.Unmarshal(arr, &items)
	return items
}
