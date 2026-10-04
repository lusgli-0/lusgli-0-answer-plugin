/**
 * 悬浮卡的 React 控制器。不往侧栏画按钮。
 * 拉配置、向菜单总线报到（register lite_runtime）；真正开卡走登记表 open(卡名)。
 *
 * 开卡入口 ①：菜单总线。另一个入口（data-ans-cell 全局点击）在 runtime/cellRuntime.ts。
 */
import { useEffect, useRef } from 'react';
import useSWR from 'swr';

import { createActionRegistry, MENU_ACTION_BUS_KEY } from 'plugin-shared';

import { CONFIG_API_PATH, fetchPublicConfig } from './runtime/load';
import {
  openCell,
  setPublicConfig,
  startCellRuntime,
  unloadCellRuntime,
} from './runtime/cellRuntime';
import { SLUG_NAME } from './runtime/cellConfig';

const actions = createActionRegistry(MENU_ACTION_BUS_KEY);

const Component = () => {
  const { data } = useSWR(
    CONFIG_API_PATH,
    () => fetchPublicConfig(),
    { revalidateOnFocus: false },
  );

  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (data) setPublicConfig(data);
  }, [data]);

  useEffect(() => {
    // 开卡入口 ①：菜单总线。community-menu 点按钮时 dispatch('lite_runtime', { cell_id })，
    // 菜单总线按 slug 查到这里的 handler 并执行。这里把 lite_runtime 这个 slug 登记进去。
    // 同 slug 重复 register 会覆盖，HMR 再跑也不会叠两份；
    // handler 闭包读 dataRef（ref 永远指向最新配置），所以不用在数据变化时重绑。
    actions.register<{ cell_id?: string }>(SLUG_NAME, (payload) => {
      const cellId = payload.cell_id;
      if (!cellId) return;
      const cfg = dataRef.current;
      if (cfg) setPublicConfig(cfg);
      openCell(String(cellId));
    });
  }, []);

  useEffect(() => {
    startCellRuntime();
    return unloadCellRuntime;
  }, []);

  return null;
};

export default Component;
