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
 * Vite 把本插件打成 umd/es，给 Answer UI 当 workspace 包引用。
 * react / react-dom / react-i18next / react-bootstrap / swr 必须 external：
 * 和宿主 UI 共用一份，否则 SideNav 传入的 request/navigate 和 SWR 缓存会各玩各的。
 * plugin-shared 是本地共享包，走 resolve.alias 内联进 dist，不要 external。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import dts from 'vite-plugin-dts';

import packageJson from './package.json';

const here = path.dirname(fileURLToPath(import.meta.url));

// 和 random-question / floating-card 一致：answer build 会把目录从 plugin-shared
// 改成 plugin_shared，这里两个都试一下，找到哪个就用哪个。
function pluginSharedEntry(): string {
  for (const name of ['plugin-shared', 'plugin_shared'] as const) {
    const entry = path.resolve(here, '..', name, 'src', 'index.ts');
    if (fs.existsSync(entry)) {
      return entry;
    }
  }
  return path.resolve(here, '../plugin-shared/src/index.ts');
}

// https://vitejs.dev/config/
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
