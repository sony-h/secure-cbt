import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/secure_cbt?schema=public',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      BULLMQ_REDIS_HOST: 'localhost',
      BULLMQ_REDIS_PORT: '6379',
    },
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
