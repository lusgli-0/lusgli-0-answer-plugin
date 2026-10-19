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
 * 左栏内容：上半是官方 Quicklinks（标签 + title,URL），下半是「符文卷轴」按钮。
 *
 * 何时被加载：后台启用 slug=quick_links 之后，SideNav 的 PluginRender 把
 * navigate / request 传进来。本组件不自己找 DOM，也不 import 插件。
 *
 * 和另外的插件怎么接线（菜单总线，见 plugin-shared/src/actionRegistry.ts）：
 *   action=plugin 的按钮 → actions.dispatch(slug, payload, { request, navigate })
 *     目标插件在加载时已经 actions.register(slug, handler)，这里定向派发即可。
 *   action=url 的按钮 → 走本文件 openUrl，不经过总线。
 *   payload 是目标插件自己定义的参数，request / navigate 是宿主上下文，
 *   一并传给目标插件，目标插件不必自己 import 主站 request / 拼路由。
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import { createActionRegistry, MENU_ACTION_BUS_KEY } from 'plugin-shared';

/** GET /answer/api/v1/sidebar/config
 * 画左栏链接只用这两个：
 * display_name: 显示的文字
 * slug_name: 拼链接 /tags/{slug_name}
 * 对应 plugin.SidebarConfig。 */
interface Tag {
  slug_name: string;
  display_name: string;
}

interface SidebarConfigData {
  tags?: Tag[];
  links_text?: string;
}

/**
 * 符文卷轴一条。字段名和后台 textarea 里的 JSON、Go MenuItem 对齐。
 * plugin 填目标插件 slug（下划线），不是目录名 community-menu。
 */
interface MenuItem {
  id?: string;
  text?: string;
  action?: string;
  plugin?: string;
  payload?: Record<string, unknown>;
  url?: string;
}

interface MenuConfigData {
  menu_title?: string;
  menu_items?: MenuItem[];
}

export interface IProps {
  navigate: (url: string) => void;
  request: {
    instance: {
      get: (url: string) => Promise<unknown>;
    };
  };
  hasDivider?: boolean;
}

/** 菜单总线：community-menu 只按 slug 派发，不 import 目标插件。 */
const actions = createActionRegistry(MENU_ACTION_BUS_KEY);

/**
 * 游客可读的菜单接口。Agent 挂在 unauth v1 组上，完整路径是
 * /answer/api/v1/community-menu/config，不是 /quick_links/config（slug 已占用官方语义）。
 */
const MENU_CONFIG_PATH = '/answer/api/v1/community-menu/config';

/** 官方 Quicklinks 同一条，SideNav 已存在时由 GetSidebarConfig 合并出来。 */
const SIDEBAR_CONFIG_PATH = '/answer/api/v1/sidebar/config';

/**
 * 官方 quick-links 同款 handleNavigate：Quicklinks 自定义链接与卷轴 action=url 共用。
 * 站内 / 走 navigate，http(s) 新开标签，其余 console.warn。
 */
function openUrl(raw: string, navigate: (url: string) => void) {
  const url = raw.trim();
  if (!url) return;
  if (url.startsWith('/')) {
    navigate(url);
    return;
  }
  if (/^https?:\/\//.test(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  console.warn('Ignoring potentially unsafe URL:', url);
}

const Component = ({ navigate, request, hasDivider }: IProps) => {
  const { t } = useTranslation('plugin', {
    keyPrefix: 'quick_links.frontend',
  });

  // 官方同一条：fetcher 直接用 axios instance.get。SWR 把数组 key 展开，所以是 get(url)。
  // 拦截器已经剥掉 {code,data}，这里的 data 就是 SidebarConfig。
  const { data } = useSWR(
    [SIDEBAR_CONFIG_PATH],
    request.instance.get as (url: string) => Promise<SidebarConfigData>,
  );
  const tags = data?.tags || [];
  const links = data?.links_text?.split('\n') || [];

  const { data: menuData } = useSWR(
    [MENU_CONFIG_PATH],
    request.instance.get as (url: string) => Promise<MenuConfigData>,
  );
  const menuItems = menuData?.menu_items || [];
  const menuTitle =
    (menuData?.menu_title && menuData.menu_title.trim()) || t('rune_scroll');

  /**
   * 官方 Quicklinks 点击：读 <a href>，再按 openUrl 分流。
   * preventDefault 避免 <a> 整页跳；stopPropagation 避免外层 Nav 抢事件。
   */
  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const url = e.currentTarget.getAttribute('href');
    if (!url || url.trim() === '') return;
    openUrl(url, navigate);
  };

  /**
   * 符文卷轴 action=plugin：不跳路由，只把动作定向交给对应插件。
   *
   * 菜单侧只知道 slug（目标是谁）+ payload（目标要的参数），
   * 具体怎么处理由目标插件自己在加载时 actions.register 报到。
   * request / navigate 是「宿主上下文」，一并传下去：
   *   request  —— 目标插件调接口（含它自己的 Agent 接口）用；
   *   navigate —— 目标插件做 SPA 跳转用，和主站同一套路由。
   */
  const handlePluginAction = (item: MenuItem) => {
    const slug = (item.plugin || '').trim();
    if (!slug) {
      console.warn('community-menu: plugin action missing slug', item);
      return;
    }
    actions.dispatch(slug, item.payload, { request, navigate });
  };

  const hasQuicklinks = tags.length > 0 || Boolean(data?.links_text);
  const hasMenu = menuItems.length > 0;

  // 官方这里是「没标签且没链接就 return null」，会把符文卷轴一起藏掉。
  // 只在两块都空时才不渲染，这样仅有插件按钮时左栏仍在。
  if (!hasQuicklinks && !hasMenu) {
    return null;
  }

  return (
    <div>
      {hasDivider && <div className="border-top mt-3" />}
      {hasQuicklinks && (
        <>
          {/* class quick-link 是官方标题类名，方便站点 CSS 继续命中「快速链接」 */}
          <div className="py-2 px-3 mt-3 small fw-bold quick-link">
            {t('quick_links')}
          </div>
          {tags?.map((tag: Tag) => {
            const href = `/tags/${encodeURIComponent(tag.slug_name)}`;
            return (
              <a
                href={href}
                key={href}
                className={`nav-link ${window.location.pathname === href ? 'active' : ''}`}
                onClick={handleNavigate}>
                <span>{tag.display_name}</span>
              </a>
            );
          })}

          {links?.map((link: string) => {
            const name = link.split(',')[0];
            const url = link.split(',')[1]?.trim();
            if (!url || !name) {
              return null;
            }
            return (
              <a
                href={url}
                key={url}
                className={`nav-link ${window.location.pathname === url ? 'active' : ''}`}
                onClick={handleNavigate}>
                <span>{name}</span>
              </a>
            );
          })}
        </>
      )}

      {hasMenu && (
        /* community-menu-scroll 用来圈整块菜单、防和官方链接区样式打架 */
        <div className="community-menu-scroll">
          <div className="py-2 px-3 mt-3 small fw-bold community-menu-title">
            {menuTitle}
          </div>
          {menuItems.map((item, index) => {
            const text = (item.text || '').trim();
            if (!text) {
              return null;
            }
            const key = item.id || `menu-${index}`;
            if (item.action === 'url') {
              const href = (item.url || '').trim();
              if (!href) {
                return null;
              }
              return (
                <a
                  href={href}
                  key={key}
                  className="nav-link community-menu-item"
                  onClick={handleNavigate}>
                  <span>{text}</span>
                </a>
              );
            }
            if (item.action === 'plugin') {
              const slug = (item.plugin || '').trim();
              if (!slug) {
                return null;
              }
              return (
                <button
                  type="button"
                  key={key}
                  className="nav-link border-0 bg-transparent text-start w-100 community-menu-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handlePluginAction(item)}>
                  <span>{text}</span>
                </button>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};

export default Component;
