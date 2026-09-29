import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL('./auth/', import.meta.url)),
  resolve: {
    alias: [
      { find: 'react/jsx-dev-runtime', replacement: fileURLToPath(new URL('./node_modules/react/jsx-dev-runtime.js', import.meta.url)) },
      { find: 'react/jsx-runtime', replacement: fileURLToPath(new URL('./node_modules/react/jsx-runtime.js', import.meta.url)) },
      { find: 'react', replacement: fileURLToPath(new URL('./node_modules/react/index.js', import.meta.url)) },
      { find: 'lucide-react', replacement: fileURLToPath(new URL('./node_modules/lucide-react/dist/esm/lucide-react.js', import.meta.url)) },
      { find: '@dnd-kit/core', replacement: fileURLToPath(new URL('./node_modules/@dnd-kit/core/dist/core.esm.js', import.meta.url)) },
      { find: '@dnd-kit/sortable', replacement: fileURLToPath(new URL('./node_modules/@dnd-kit/sortable/dist/sortable.esm.js', import.meta.url)) },
      { find: '@dnd-kit/utilities', replacement: fileURLToPath(new URL('./node_modules/@dnd-kit/utilities/dist/utilities.esm.js', import.meta.url)) },
    ],
  },
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
});