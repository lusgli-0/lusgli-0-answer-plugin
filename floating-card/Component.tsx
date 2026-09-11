/**
 * 悬浮卡的 React 控制器。不往侧栏画按钮。
 * 拉配置、向菜单总线报到（register floating_card）；真正开卡走登记表 open(卡名)。
 *
 * 开卡入口 ①：菜单总线。另一个入口（data-ans-card 全局点击）在 runtime/overlay.ts。
 */
import { useEffect, useRef } from 'react';
import useSWR from 'swr';

import { createActionRegistry, MENU_ACTION_BUS_KEY } from 'plugin-shared';

import { cardRegistry } from './cards';
import { CONFIG_API_PATH, fetchPublicConfig } from './runtime/config';
import { closeAll, setPublicConfig } from './runtime/overlay';
import { SLUG_NAME } from './runtime/cardConfig';

const actions = createActionRegistry(MENU_ACTION_BUS_KEY);

export interface IProps {
  navigate?: (url: string) => void;
  request?: {
    instance: {
      get: (url: string) => Promise<unknown>;
    };
  };
  hasDivider?: boolean;
}

const Component = ({ request }: IProps) => {
  const getter = request?.instance?.get;
  const { data } = useSWR(
    CONFIG_API_PATH,
    () => fetchPublicConfig(getter),
    { revalidateOnFocus: false },
  );

  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (data) setPublicConfig(data);
  }, [data]);

  useEffect(() => {
    // 开卡入口 ①：菜单总线。community-menu 点按钮时 dispatch('floating_card', { card_id })，
    // 菜单总线按 slug 查到这里的 handler 并执行。这里把 floating_card 这个 slug 登记进去。
    // 同 slug 重复 register 会覆盖，HMR 再跑也不会叠两份；
    // handler 闭包读 dataRef（ref 永远指向最新配置），所以不用在数据变化时重绑。
    actions.register<{ card_id?: string }>(SLUG_NAME, (payload) => {
      const cardId = payload.card_id;
      if (!cardId) return;
      const cfg = dataRef.current;
      if (cfg) setPublicConfig(cfg);
      cardRegistry.open(String(cardId));
    });
  }, []);

  useEffect(() => {
    return () => {
      closeAll();
    };
  }, []);

  return null;
};

export default Component;
