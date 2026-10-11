import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import dts from 'vite-plugin-dts';

import packageJson from './package.json';

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
      if (!css) return;

      const inject = `(function(){if(typeof document==="undefined")return;if(document.getElementById("knowledge-base-css"))return;var s=document.createElement("style");s.id="knowledge-base-css";s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();`;
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') {
          item.code = inject + item.code;
        }
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../../', import.meta.url)),
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
      external: ['react', 'react-dom', 'react-i18next', 'react-bootstrap'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-i18next': 'reactI18next',
          'react-bootstrap': 'reactBootstrap',
        },
      },
    },
  },
});
