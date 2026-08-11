import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/** 从 DATABASE_URL 中解析 schema 名称 */
function extractSchema(url: string): string {
  const match = url.match(/schema=([^&]+)/);
  return match ? match[1] : 'public';
}

const dbSchema = extractSchema(process.env.DATABASE_URL || '');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 最大连接数
  min: 2, // 最小连接数
  idleTimeoutMillis: 30000, // 空闲连接回收时间 30s
  connectionTimeoutMillis: 5000, // 建立连接超时 5s
  query_timeout: 10000, // 查询超时 10s
});

// 每次建立连接时设置 search_path 到目标 schema
pool.on('connect', async (client) => {
  await client.query(`SET search_path TO ${dbSchema}, public;`);
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;
