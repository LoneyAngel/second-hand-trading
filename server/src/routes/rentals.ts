import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { sendPushToUser } from '../lib/push';

export const rentalsRouter = Router();

const createRentalSchema = z.object({
  productId: z.string(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
});

const updateRentalStatusSchema = z.object({
  status: z.enum(['pending', 'ongoing', 'completed', 'cancelled', 'disputed']),
});

// 创建租借请求
rentalsRouter.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { productId, startDate, endDate } = createRentalSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new ApiError(404, '商品不存在');
    }

    if (product.status !== 'available') {
      throw new ApiError(400, '商品不可租借');
    }

    if (product.userId === req.user?.userId) {
      throw new ApiError(400, '不能租借自己的商品');
    }

    // 根据价格单位计算总金额
    let totalAmount;
    if (product.priceUnit === 'once') {
      // 一次性价格，直接使用商品价格
      totalAmount = product.price;
    } else if (product.priceUnit === 'hour') {
      // 按小时计算（至少 1 小时）
      const diffMs = endDate.getTime() - startDate.getTime();
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
      totalAmount = product.price.mul(hours);
    } else {
      // 默认按天计算（首尾两天都算，至少 1 天）
      const diffMs = endDate.getTime() - startDate.getTime();
      const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
      totalAmount = product.price.mul(days);
    }

    const rental = await prisma.rentalRecord.create({
      data: {
        productId,
        renterId: req.user!.userId,
        ownerId: product.userId,
        startDate,
        endDate,
        totalAmount,
        deposit: product.deposit,
      },
      include: {
        product: true,
        renter: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        owner: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    // 给出租方推送新订单通知（异步，不阻塞响应）
    sendPushToUser(product.userId, {
      title: '新的租赁订单',
      body: `您的商品「${product.title}」收到一条新的租赁请求，快去处理吧！`,
      data: { type: 'new_rental', rentalId: rental.id },
    }).catch((err) => console.error('Push notification failed:', err));

    res.json(rental);
  }),
);

// 获取当前用户作为租借者的记录
rentalsRouter.get(
  '/renter',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rentals = await prisma.rentalRecord.findMany({
      where: { renterId: req.user!.userId },
      include: {
        product: true,
        owner: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rentals);
  }),
);

// 获取当前用户作为出租者的记录
rentalsRouter.get(
  '/owner',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rentals = await prisma.rentalRecord.findMany({
      where: { ownerId: req.user!.userId },
      include: {
        product: true,
        renter: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rentals);
  }),
);

// 更新租借状态
rentalsRouter.put(
  '/:id/status',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = updateRentalStatusSchema.parse(req.body);

    const rental = await prisma.rentalRecord.findUnique({
      where: { id: idParam },
    });

    if (!rental) {
      throw new ApiError(404, '租借记录不存在');
    }

    // 只有相关用户可以修改状态
    if (rental.renterId !== req.user?.userId && rental.ownerId !== req.user?.userId) {
      throw new ApiError(403, '无权操作此记录');
    }

    const updatedRental = await prisma.rentalRecord.update({
      where: { id: idParam },
      data: { status },
      include: {
        product: true,
        renter: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        owner: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    // 如果状态变为进行中，更新商品状态为已租出
    if (status === 'ongoing') {
      await prisma.product.update({
        where: { id: rental.productId },
        data: { status: 'rented' },
      });
    }

    // 如果状态变为完成或取消，更新商品状态为可租用
    if (status === 'completed' || status === 'cancelled') {
      await prisma.product.update({
        where: { id: rental.productId },
        data: { status: 'available' },
      });
    }

    res.json(updatedRental);
  }),
);

/**
 * 发起 / 确认 完成订单
 * POST /api/rentals/:id/complete
 * - 若当前没有发起方：将 completeRequestedBy 设为当前用户，等待对方确认
 * - 若发起方是对方（另一方点击确认）：将状态改为 completed
 * - 若发起方是自己（重复点击 = 撤销请求）：将 completeRequestedBy 清空
 */
rentalsRouter.post(
  '/:id/complete',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user!.userId;

    const rental = await prisma.rentalRecord.findUnique({
      where: { id: idParam },
    });

    if (!rental) {
      throw new ApiError(404, '租借记录不存在');
    }

    if (rental.renterId !== userId && rental.ownerId !== userId) {
      throw new ApiError(403, '无权操作此记录');
    }

    if (rental.status !== 'ongoing') {
      throw new ApiError(400, '当前状态不可操作');
    }

    let updatedRental;

    if (!rental.completeRequestedBy) {
      // 发起完成请求
      updatedRental = await prisma.rentalRecord.update({
        where: { id: idParam },
        data: { completeRequestedBy: userId },
        include: {
          product: true,
          renter: { select: { id: true, nickname: true, avatar: true } },
          owner: { select: { id: true, nickname: true, avatar: true } },
        },
      });
    } else if (rental.completeRequestedBy === userId) {
      // 自己取消发起
      updatedRental = await prisma.rentalRecord.update({
        where: { id: idParam },
        data: { completeRequestedBy: null },
        include: {
          product: true,
          renter: { select: { id: true, nickname: true, avatar: true } },
          owner: { select: { id: true, nickname: true, avatar: true } },
        },
      });
    } else {
      // 对方确认完成 → 状态改为 completed
      updatedRental = await prisma.rentalRecord.update({
        where: { id: idParam },
        data: {
          status: 'completed',
          completeRequestedBy: null,
        },
        include: {
          product: true,
          renter: { select: { id: true, nickname: true, avatar: true } },
          owner: { select: { id: true, nickname: true, avatar: true } },
        },
      });
      // 更新商品状态为可租用
      await prisma.product.update({
        where: { id: rental.productId },
        data: { status: 'available' },
      });
    }

    res.json(updatedRental);
  }),
);

// 获取租借记录详情
rentalsRouter.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const rental = await prisma.rentalRecord.findUnique({
      where: { id: idParam },
      include: {
        product: true,
        renter: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        owner: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    if (!rental) {
      throw new ApiError(404, '租借记录不存在');
    }

    if (rental.renterId !== req.user?.userId && rental.ownerId !== req.user?.userId) {
      throw new ApiError(403, '无权查看此记录');
    }

    res.json(rental);
  }),
);
