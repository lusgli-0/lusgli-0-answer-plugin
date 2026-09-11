/*
 * 把 en_US / zh_CN 交给 PluginKit.initI18nResource。
 * 命名空间是 plugin，key 形如 floating_card.frontend.* ；后台 Go 用 floating_card.backend.*。
 */
import en_US from './en_US.yaml';
import zh_CN from './zh_CN.yaml';

export default {
  en_US,
  zh_CN,
};
