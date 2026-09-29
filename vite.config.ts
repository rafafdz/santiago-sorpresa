import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Production builds are served from https://rafafdz.github.io/santiago-sorpresa/
// Override with BASE_PATH=/ (e.g. for another host) if needed.
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/santiago-sorpresa/') : '/',
  server: { host: true },
  build: { chunkSizeWarningLimit: 900 },
  test: { environment: 'node' },
}));
