import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { assistantApi } from './server/vitePlugin.js';

export default defineConfig({
  plugins: [react(), tailwindcss(), assistantApi()],
  server: {
    port: 3000,
  },
  test: {
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**', 'shared/**', 'server/**'],
      exclude: ['**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
    },
    // Server and shared code is tested in plain Node, where it runs. Only UI
    // code pays for a simulated browser.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['{server,shared}/**/*.test.ts', 'src/theme.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/theme.test.ts'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
