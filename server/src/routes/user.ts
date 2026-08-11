import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';

export const usersRouter = Router();

// ========== 当前用户信息相关 ==========

const updateProfileSchema = z.object({
  nickname: z.string().min(2, '昵称至少2个字符').optional(),
  avatar: z.string().max(500, '头像地址最多500个字符').optional().or(z.literal('')),
});

// 获取当前用户信息
usersRouter.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, '用户不存在');
    }

    res.json(user);
  }),
);

// 更新用户基本信息
usersRouter.put(
  '/profile',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...data,
        ...(data.avatar !== undefined && { avatar: data.avatar || null }),
      },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  }),
);

// 更新推送 token
usersRouter.post(
  '/push-token',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { token } = z.object({ token: z.string() }).parse(req.body);

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { pushToken: token || null },
    });

    res.json({ success: true });
  }),
);

// ========== 关注相关 API ==========

const followSchema = z.object({
  userId: z.string().min(1),
});

// 关注/取消关注用户
usersRouter.post(
  '/follow',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = followSchema.parse(req.body);
    const followerId = req.user!.userId;

    // 不能关注自己
    if (followerId === userId) {
      throw new ApiError(400, '不能关注自己');
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError(404, '用户不存在');
    }

    // 检查是否已关注
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId,
        followingId: userId,
      },
    });

    if (existingFollow) {
      // 取消关注
      await prisma.follow.delete({ where: { id: existingFollow.id } });
      return res.json({ success: true, isFollowing: false, message: '已取消关注' });
    }

    // 添加关注
    await prisma.follow.create({
      data: {
        followerId,
        followingId: userId,
      },
    });
    return res.json({ success: true, isFollowing: true, message: '关注成功' });
  }),
);

// 获取我关注的人列表
usersRouter.get(
  '/following',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;

    const followingList = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log('followingList', followingList);

    res.json({
      data: followingList.map((f: any) => f.following),
    });
  }),
);

// 获取我关注的人的数量
usersRouter.get(
  '/following/count',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;

    const count = await prisma.follow.count({
      where: { followerId: userId },
    });

    res.json({ count });
  }),
);

// 获取我的粉丝列表
usersRouter.get(
  '/followers',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;

    const followersList = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      data: followersList.map((f: any) => f.follower),
    });
  }),
);

// 获取我的粉丝数量
usersRouter.get(
  '/followers/count',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;

    const count = await prisma.follow.count({
      where: { followingId: userId },
    });

    res.json({ count });
  }),
);

// 获取我是否关注某个用户
usersRouter.get(
  '/is-following/:userId',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const followingIdParam = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;

    const follow = await prisma.follow.findFirst({
      where: {
        followerId: userId,
        followingId: followingIdParam,
      },
    });
    console.log('follow', follow);

    res.json({ isFollowing: !!follow });
  }),
);

// 获取用户公开信息
usersRouter.get(
  '/:userId/public',
  asyncHandler(async (req, res) => {
    const userIdParam = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    const [user, productCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userIdParam },
        select: {
          id: true,
          nickname: true,
          avatar: true,
          createdAt: true,
        },
      }),
      prisma.product.count({ where: { userId: userIdParam } }),
    ]);

    if (!user) {
      throw new ApiError(404, '用户不存在');
    }

    res.json({
      user,
      productCount,
    });
  }),
);

// 获取用户发布的商品列表
usersRouter.get(
  '/:userId/products',
  asyncHandler(async (req, res) => {
    const userIdParam = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const { status, page = '1', limit = '10' } = req.query;

    const where: any = {
      userId: userIdParam,
    };
    if (status) where.status = status as string;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      hasMore: total > Number(page) * Number(limit),
    });
  }),
);

// 获取某个用户的粉丝数量（公开接口）
usersRouter.get(
  '/:userId/followers/count',
  asyncHandler(async (req, res) => {
    const userIdParam = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    const count = await prisma.follow.count({
      where: { followingId: userIdParam },
    });

    res.json({ count });
  }),
);

// 获取某个用户的关注数量（公开接口）
usersRouter.get(
  '/:userId/following/count',
  asyncHandler(async (req, res) => {
    const userIdParam = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    const count = await prisma.follow.count({
      where: { followerId: userIdParam },
    });

    res.json({ count });
  }),
);
