import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // 1. 指定你的 schema 结构文件路径
  schema: 'prisma/schema.prisma',

  migrations: {
    seed: 'tsx prisma/seed.ts',
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
