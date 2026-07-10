import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        '**/runner/.user-data/**',
        '**/runner/node_modules/**',
        '**/runner/dist/**',
        '**/runner/debug/**',
      ],
    },
  },
});
