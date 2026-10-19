/*
 * 前端 i18n 入口。PluginKit.register 看到 default.i18nConfig 会调 initI18nResource。
 * 键结构是 plugin.random_question.frontend.*，给以后若要在 Component 里显示文案用。
 * 现在 Component 返回 null，这份资源主要和后台 yaml 共用同一套文件。
 */
import en_US from './en_US.yaml';
import zh_CN from './zh_CN.yaml';

export default {
  en_US,
  zh_CN,
};
