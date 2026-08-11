import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { ApiError, asyncHandler } from '../middleware/errorHandler';

export const addressesRouter = Router();

// ========== Schema 定义 ==========
const createAddressSchema = z.object({
  consignee: z.string().min(1, '收货人不能为空'),
  mobile: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  detailAddress: z.string().min(1, '详细地址不能为空'),
});

const updateAddressSchema = createAddressSchema.partial();

// 获取所有地址
addressesRouter.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId!;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      code: 0,
      data: addresses,
      message: '获取成功',
    });
  }),
);

// 创建地址
addressesRouter.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId!;
    const body = createAddressSchema.parse(req.body);

    // 检查是否是第一个地址
    const addressCount = await prisma.address.count({ where: { userId } });
    const isFirst = addressCount === 0;

    const address = await prisma.address.create({
      data: {
        ...body,
        userId,
        isDefault: isFirst, // 如果是第一个地址，自动设置为默认
      },
    });

    res.status(201).json({
      code: 0,
      data: address,
      message: isFirst ? '地址创建成功，已自动设置为默认地址' : '地址创建成功',
    });
  }),
);

// 获取默认地址
addressesRouter.get(
  '/default',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId;

    const defaultAddress = await prisma.address.findFirst({
      where: { userId, isDefault: true },
    });

    res.json({
      code: 0,
      data: defaultAddress || null,
      message: '获取成功',
    });
  }),
);

// 设置默认地址
addressesRouter.put(
  '/:id/default',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId!;
    const id = req.params.id as string;

    // 验证地址所有权
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== userId) {
      throw new ApiError(404, '地址不存在或无权操作');
    }

    // 取消其他默认地址
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // 设置新的默认地址
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    res.json({
      code: 0,
      data: updatedAddress,
      message: '默认地址设置成功',
    });
  }),
);

// 修改地址
addressesRouter.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId!;
    const id = req.params.id as string;
    const body = updateAddressSchema.parse(req.body);

    // 验证地址所有权
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== userId) {
      throw new ApiError(404, '地址不存在或无权修改');
    }

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: body,
    });

    res.json({
      code: 0,
      data: updatedAddress,
      message: '地址修改成功',
    });
  }),
);

// 删除地址
addressesRouter.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId!;
    const id = req.params.id as string;

    // 验证地址所有权
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== userId) {
      throw new ApiError(404, '地址不存在或无权删除');
    }

    // 如果删除的是默认地址，需要重新设置默认地址
    if (address.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId, id: { not: id } },
        orderBy: { createdAt: 'asc' },
      });

      if (firstAddress) {
        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true },
        });
      }
    }

    await prisma.address.delete({ where: { id } });

    res.json({
      code: 0,
      message: '地址删除成功',
    });
  }),
);
