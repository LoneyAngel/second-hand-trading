import OSS from 'ali-oss';
import { env } from '../config/env';
import crypto from 'crypto';
import path from 'path';

const ossClient = new OSS({
  accessKeyId: env.OSS_ACCESS_KEY_ID,
  accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
  bucket: env.OSS_BUCKET_NAME,
  endpoint: env.OSS_ENDPOINT,
  secure: true,
});

/**
 * 生成 OSS 存储路径
 * 格式：products/{yyyyMMdd}/{randomHash}.{ext}
 */
function generateObjectName(originalName: string): string {
  const ext = path.extname(originalName) || '.jpg';
  const date = new Date();
  const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  const randomStr = crypto.randomBytes(16).toString('hex');
  return `products/${dateStr}/${randomStr}${ext}`;
}

/**
 * 上传 Buffer 到 OSS
 */
export async function uploadToOSS(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<{ url: string; objectName: string }> {
  const objectName = generateObjectName(originalName);

  const result = await ossClient.put(objectName, buffer, {
    mime: mimeType,
    headers: {
      'Cache-Control': 'max-age=31536000',
    },
  });

  return {
    url: result.url,
    objectName,
  };
}

/**
 * 从 OSS 删除文件
 */
export async function deleteFromOSS(objectName: string): Promise<void> {
  try {
    await ossClient.delete(objectName);
  } catch (error) {
    console.error('Failed to delete from OSS:', error);
    // 删除失败不抛出，避免影响主流程
  }
}

export default ossClient;
