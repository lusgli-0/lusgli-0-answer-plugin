/*
 * Vite 不把横幅打成独立网站，而是打成一个库，默认出 ESM 和 UMD 两份
 * 主站 PluginKit 用动态 import('hello-banner') 加载 ESM 那份。
 *
 * plugin-shared 是 npm 包不是插件，禁止标成外部依赖。
 * PluginKit 只加载本插件 dist，用pluginSharedEntry()把plugin-shared打进dist。
 *
 * 不要在 package.json 里写 file:../plugin-shared：
 * answer build 会把目录 plugin-shared 改名为 plugin_shared。
 * 所以改用 alias：先看有没有 plugin-shared，没有再看 plugin_shared。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import dts from 'vite-plugin-dts';

import packageJson from './package.json';

/**
 * Vite 库模式会把 CSS 抽成 dist/style.css，JS 里不 import。
 * PluginKit / webpack 只加载 .es.js，样式永远进不了页面。
 * 把 CSS 打进 JS，加载插件时插入 <style id="hello-banner-css">。
 * 设置页样式用 `?inline` 在编辑器里插入，不要和横幅 SVG 拼成一张表。
 */
function injectCssIntoLib(): Plugin {
  return {
    name: 'inject-css-into-lib',
    apply: 'build',
    enforce: 'post',
    generateBundle(_opts, bundle) {
      const css = Object.values(bundle)
        .filter(
          (item) =>
            item.type === 'asset' &&
            item.fileName.endsWith('.css') &&
            (typeof item.source === 'string' || Buffer.isBuffer(item.source)),
        )
        .map((item) =>
          typeof item.source === 'string'
            ? item.source
            : Buffer.from(item.source).toString('utf8'),
        )
        .join('\n');
      // 如果 CSS 为空，则不注入
      if (!css) return;
      //把css插进js
      const inject = `(function(){if(typeof document==="undefined")return;if(document.getElementById("hello-banner-css"))return;var s=document.createElement("style");s.id="hello-banner-css";s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();`;
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') {
          item.code = inject + item.code;
        }
      }
    },
  };
}

const here = path.dirname(fileURLToPath(import.meta.url));

function pluginSharedEntry(): string {
  for (const name of ['plugin-shared', 'plugin_shared'] as const) {
    const entry = path.resolve(here, '..', name, 'src', 'index.ts');
    if (fs.existsSync(entry)) {
      return entry;
    }
  }
  return path.resolve(here, '../plugin-shared/src/index.ts');
}

export default defineConfig({
  resolve: {
    alias: {
      'plugin-shared': pluginSharedEntry(),
    },
  },
  plugins: [
    react(),
    ViteYaml(),
    dts({
      insertTypesEntry: true,
    }),
    injectCssIntoLib(),
  ],
  build: {
    lib: {
      entry: 'index.ts',
      name: packageJson.name,
      fileName: (format) => `${packageJson.name}.${format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react-i18next',
        'react-bootstrap',
        'swr',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-dom/client': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          'react-i18next': 'reactI18next',
          'react-bootstrap': 'reactBootstrap',
          swr: 'Swr',
        },
      },
    },
  },
});
