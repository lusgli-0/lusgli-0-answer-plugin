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

package i18n

// 键名必须挂在 plugin.quick_links.* 下：后台已存的官方 Quicklinks 配置 JSON
// 字段名是 tags / links_text，文案键也沿用官方，换插件后管理页标签不会变成空白。
const (
	InfoName        = "plugin.quick_links.backend.info.name"
	InfoDescription = "plugin.quick_links.backend.info.description"

	ConfigTagsTitle         = "plugin.quick_links.backend.config.tags.title"
	ConfigTagsDescription   = "plugin.quick_links.backend.config.tags.description"
	ConfigLinksTitle        = "plugin.quick_links.backend.config.links.title"
	ConfigLinksDescription  = "plugin.quick_links.backend.config.links.description"
	ConfigMenuTitleTitle    = "plugin.quick_links.backend.config.menu_title.title"
	ConfigMenuTitleDesc     = "plugin.quick_links.backend.config.menu_title.description"
	ConfigMenuItemsTitle    = "plugin.quick_links.backend.config.menu_items.title"
	ConfigMenuItemsDesc     = "plugin.quick_links.backend.config.menu_items.description"
)
