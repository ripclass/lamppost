import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      // `server-only` is a runtime no-op marker from Next.js; we alias it to
      // an empty module so Server-Component utilities can be imported in
      // unit tests without the runtime guard firing.
      'server-only': resolve(__dirname, 'tests/__stubs__/server-only.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
