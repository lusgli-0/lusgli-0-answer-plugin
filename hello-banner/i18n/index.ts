// 前端把两份 yaml 打包进去。PluginKit 看到 i18nConfig 会注册到 i18n。
// 本插件横幅文案来自后端 API，这里主要给后台插件名用。
import en_US from './en_US.yaml';
import zh_CN from './zh_CN.yaml';

export default {
  en_US,
  zh_CN,
};
