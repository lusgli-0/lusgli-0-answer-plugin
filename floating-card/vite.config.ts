/*
 * Vite 库模式：es+umd 给 PluginKit import('floating-card')。
 *
 * plugin-shared 是 npm 包，禁止 external，打 dist 时内联。
 * react-dom/client 必须 external：mountOutsideRoot 用宿主页 ReactDOM，不能打进本包。
 * 不要 file:../plugin-shared：answer build 会把目录改成 plugin_shared。
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
