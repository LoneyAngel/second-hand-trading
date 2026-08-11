import { Router } from 'express';
import multer from 'multer';
import { uploadToOSS } from '../lib/oss';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { ApiError, asyncHandler } from '../middleware/errorHandler';

export const uploadRouter = Router();

// 使用内存存储，直接把文件传到 OSS，不落地
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    // 只允许图片类型
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extName = allowedTypes.test(file.originalname.toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new ApiError(400, '只支持 jpg/png/webp 格式的图片'));
    }
  },
});

// 上传单张图片
uploadRouter.post(
  '/image',
  authMiddleware,
  upload.single('image'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      throw new ApiError(400, '请选择要上传的图片');
    }

    const { url } = await uploadToOSS(req.file.buffer, req.file.originalname, req.file.mimetype);

    res.json({
      url,
      message: '上传成功',
    });
  }),
);
