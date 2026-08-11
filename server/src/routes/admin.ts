import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/db';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { generateAccessToken } from '../lib/jwt';

export const adminRouter = Router();

// ========== 管理员登录 ==========
// 注意：这里先用普通用户表，实际项目应该有单独的管理员表
// 简单起见，用 isAdmin 字段区分（这里先用第一个注册的用户当管理员，或者直接复用登录逻辑）
const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  password: z.string(),
});

adminRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { phone, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new ApiError(401, '手机号或密码错误');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new ApiError(401, '手机号或密码错误');
    }

    // 校验管理员角色：ADMIN 或 SUPER_ADMIN
    const isAdmin = user.roles.some(
      (ur) => ur.role.name === 'ADMIN' || ur.role.name === 'SUPER_ADMIN',
    );
    if (!isAdmin) {
      throw new ApiError(403, '无管理员权限');
    }

    const accessToken = generateAccessToken({ userId: user.id });

    res.json({
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        roles: user.roles.map((ur) => ur.role.name),
      },
    });
  }),
);

// ========== 数据概览 ==========
adminRouter.get(
  '/stats/overview',
  authMiddleware,
  asyncHandler(async (_req, res) => {
    const [userCount, productCount, orderCount, todayOrders] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.rentalRecord.count(),
      prisma.rentalRecord.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    res.json({
      userCount,
      productCount,
      orderCount,
      todayOrders,
    });
  }),
);

// ========== 商品管理 ==========
adminRouter.get(
  '/products',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status as string | undefined;
    const keyword = req.query.keyword as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (keyword) {
      where.title = {
        contains: keyword,
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: true,
          user: {
            select: { id: true, nickname: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ data, total });
  }),
);

adminRouter.put(
  '/products/:id/status',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = z
      .object({ status: z.enum(['available', 'rented', 'maintenance', 'delist']) })
      .parse(req.body);

    const product = await prisma.product.findUnique({ where: { id: idParam } });
    if (!product) {
      throw new ApiError(404, '商品不存在');
    }

    const updated = await prisma.product.update({
      where: { id: idParam },
      data: { status },
    });

    res.json(updated);
  }),
);

adminRouter.delete(
  '/products/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const product = await prisma.product.findUnique({ where: { id: idParam } });
    if (!product) {
      throw new ApiError(404, '商品不存在');
    }

    await prisma.product.delete({ where: { id: idParam } });

    res.json({ message: '删除成功' });
  }),
);

// ========== 用户管理 ==========
adminRouter.get(
  '/users',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const keyword = req.query.keyword as string | undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { phone: { contains: keyword } },
        { nickname: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          phone: true,
          nickname: true,
          avatar: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data, total });
  }),
);

// ========== 订单管理 ==========
adminRouter.get(
  '/rentals',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.rentalRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: true,
          renter: { select: { id: true, nickname: true, phone: true } },
          owner: { select: { id: true, nickname: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.rentalRecord.count({ where }),
    ]);

    res.json({ data, total });
  }),
);

adminRouter.put(
  '/rentals/:id/status',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = z
      .object({
        status: z.enum(['pending', 'ongoing', 'completed', 'cancelled', 'disputed']),
      })
      .parse(req.body);

    const rental = await prisma.rentalRecord.findUnique({ where: { id: idParam } });
    if (!rental) {
      throw new ApiError(404, '订单不存在');
    }

    const updated = await prisma.rentalRecord.update({
      where: { id: idParam },
      data: { status },
      include: {
        product: true,
        renter: { select: { id: true, nickname: true, phone: true } },
        owner: { select: { id: true, nickname: true, phone: true } },
      },
    });

    // 同步更新商品状态
    if (status === 'ongoing') {
      await prisma.product.update({
        where: { id: rental.productId },
        data: { status: 'rented' },
      });
    }
    if (status === 'completed' || status === 'cancelled') {
      await prisma.product.update({
        where: { id: rental.productId },
        data: { status: 'available' },
      });
    }

    res.json(updated);
  }),
);
