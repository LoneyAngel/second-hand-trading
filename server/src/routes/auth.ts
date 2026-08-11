import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/db';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt';

export const authRouter = Router();

const registerSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  password: z.string().min(6, '密码至少6位'),
  nickname: z.string().min(2, '昵称至少2位').optional(),
});

const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入旧密码'),
  newPassword: z.string().min(6, '新密码至少6位'),
});

const changePhoneSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  password: z.string().min(1, '请输入密码验证'),
});

// 注册路由
authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { phone, password, nickname } = registerSchema.parse(req.body);

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      throw new ApiError(400, '该手机号已注册');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        nickname: nickname || `用户${phone.slice(-4)}`,
      },
    });

    const accessToken = generateAccessToken({ userId: user.id });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // 保存 refresh token 到数据库
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    });
  }),
);

// 登录路由
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { phone, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new ApiError(401, '手机号或密码错误');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new ApiError(401, '手机号或密码错误');
    }

    const accessToken = generateAccessToken({ userId: user.id });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // 删除旧的 refresh token 并创建新的
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    });
  }),
);

// 刷新 token 路由
authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);

    try {
      const payload = verifyRefreshToken(refreshToken);

      // 验证 refresh token 是否存在且未过期
      const storedToken = await prisma.refreshToken.findFirst({
        where: {
          userId: payload.userId,
          token: refreshToken,
          expiresAt: { gt: new Date() },
        },
      });

      if (!storedToken) {
        throw new ApiError(401, 'Refresh token 无效');
      }

      const newAccessToken = generateAccessToken({ userId: payload.userId });
      const newRefreshToken = generateRefreshToken({ userId: payload.userId });

      // 更新 refresh token
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await prisma.refreshToken.create({
        data: {
          userId: payload.userId,
          token: newRefreshToken,
          expiresAt,
        },
      });

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch {
      throw new ApiError(401, 'Invalid refresh token');
    }
  }),
);

// 修改密码
authRouter.post(
  '/change-password',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

    // 验证旧密码
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      throw new ApiError(404, '用户不存在');
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      throw new ApiError(401, '旧密码错误');
    }

    // 更新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { password: hashedNewPassword },
    });

    res.json({ message: '密码修改成功' });
  }),
);

// 修改手机号
authRouter.post(
  '/change-phone',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { phone, password } = changePhoneSchema.parse(req.body);

    // 验证密码
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      throw new ApiError(404, '用户不存在');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new ApiError(401, '密码错误');
    }

    // 检查新手机号是否已被使用
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser && existingUser.id !== req.user?.userId) {
      throw new ApiError(400, '该手机号已被注册');
    }

    // 更新手机号
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { phone },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  }),
);

// 登出账号
authRouter.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await prisma.refreshToken.deleteMany({
      where: { userId: req.user!.userId },
    });

    res.json({ message: '登出成功', deleted: result.count });
  }),
);

// 注销账号
authRouter.post(
  '/delete-account',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // 验证请求（这里简单处理，实际项目可以加二次确认或密码验证）
    const userId = req.user!.userId;

    // 删除相关数据（通过 Prisma 的级联删除自动处理）
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: '账号已注销' });
  }),
);
