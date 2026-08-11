import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { ApiError, asyncHandler } from '../middleware/errorHandler';

export const reviewsRouter = Router({ mergeParams: true });

// 创建评论（需要认证，必须是完成的订单才能评论）
reviewsRouter.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const productId = req.params.productId as string;
    const userId = req.user!.userId;

    const schema = z.object({
      rentalId: z.string().min(1),
      rating: z.number().int().min(1).max(5),
      content: z.string().max(500).optional(),
      images: z.array(z.string()).max(9).optional(),
    });
    const data = schema.parse(req.body);

    // 校验订单是否存在且属于当前用户且已完成
    const rental = await prisma.rentalRecord.findUnique({
      where: { id: data.rentalId },
    });
    if (!rental) throw new ApiError(404, '订单不存在');
    if (rental.renterId !== userId && rental.ownerId !== userId) {
      throw new ApiError(403, '无权评论此订单');
    }
    if (rental.status !== 'completed') {
      throw new ApiError(400, '订单完成后才能评论');
    }
    if (rental.productId !== productId) {
      throw new ApiError(400, '订单与商品不匹配');
    }

    // 检查是否已经评论过
    const existing = await prisma.review.findUnique({
      where: { rentalId: data.rentalId },
    });
    if (existing) throw new ApiError(400, '该订单已评论过');

    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rentalId: data.rentalId,
        rating: data.rating,
        content: data.content,
        images: data.images || [],
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    res.json(review);
  }),
);

// 统计辅助：计算平均分和各星级数量
const getRatingStats = async (productId: string) => {
  const reviews = await prisma.review.findMany({
    where: { productId },
    select: { rating: true },
  });
  const total = reviews.length;
  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of reviews) {
    ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
    sum += r.rating;
  }
  const averageRating = total > 0 ? Number((sum / total).toFixed(1)) : 0;
  console.log(
    `Rating stats for product ${productId}: total=${total}, averageRating=${averageRating}, ratingCounts=${JSON.stringify(ratingCounts)}`,
  );
  return { total, averageRating, ratingCounts };
};

// 获取商品评论列表（支持按星级筛选）
reviewsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const productId = req.params.productId as string;
    const { rating, page = '1', limit = '10' } = req.query;

    const where: any = { productId };
    if (rating) {
      where.rating = Number(rating);
    }

    const [data, stats, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      getRatingStats(productId),
      prisma.review.count({ where }),
    ]);

    res.json({
      data,
      total,
      averageRating: stats.averageRating,
      ratingCounts: stats.ratingCounts,
    });
  }),
);

// 获取最新一条评论（详情页用）
reviewsRouter.get(
  '/latest',
  asyncHandler(async (req, res) => {
    const productId = req.params.productId as string;

    const [review, stats] = await Promise.all([
      prisma.review.findFirst({
        where: { productId },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      getRatingStats(productId),
    ]);
    console.log({
      data: review || null,
      averageRating: stats.averageRating,
      reviewCount: stats.total,
      ratingCounts: stats.ratingCounts,
    });
    res.json({
      data: review || null,
      averageRating: stats.averageRating,
      reviewCount: stats.total,
      ratingCounts: stats.ratingCounts,
    });
  }),
);
