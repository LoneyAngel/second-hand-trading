import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  // OSS
  OSS_ACCESS_KEY_ID: z.string(),
  OSS_ACCESS_KEY_SECRET: z.string(),
  OSS_BUCKET_NAME: z.string(),
  OSS_ENDPOINT: z.string(),
  OSS_REGION: z.string(),
});

export const env = envSchema.parse(process.env);
