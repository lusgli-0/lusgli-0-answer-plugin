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

/**
 * community-menu 前端入口。
 *
 * SideNav 只认 slug=quick_links，
 * 所以这里必须把 info.slug_name 原样导出，
 * 不能改成 community_menu。
 *
 * 不在这里自挂载 DOM：侧栏由 SideNav 的 PluginRender 渲染 Component。
 * ui\src\components\SideNav\index.tsx
 * 和另外的插件接线在 Component 里，通过菜单总线（actionRegistry）派发动作
 */
import Component from './Component';
import i18nConfig from './i18n';
import info from './info.yaml';

export default {
  info: {
    slug_name: info.slug_name,
    type: info.type,
  },
  component: Component,
  i18nConfig,
};
