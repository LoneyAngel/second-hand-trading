import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { Product } from '@prisma/client';
import { reviewsRouter } from './reviews';

export const productsRouter = Router();

// 评论路由（嵌套在商品下）
productsRouter.use('/:productId/reviews', reviewsRouter);

// ========== Schema 定义 ==========
const createProductSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  deposit: z.number().positive(),
  images: z.array(z.string()).min(1),
  categoryId: z.string(),
  priceUnit: z.enum(['day', 'hour', 'once']).default('day'),
  status: z.enum(['available', 'rented', 'maintenance', 'delist']).optional(),
});

const updateProductSchema = createProductSchema.partial();

const favoriteSchema = z.object({
  productId: z.string().min(1),
});

// 获取商品列表
productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, categoryId, page = '1', limit = '10' } = req.query;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId as string;
    if (status) {
      where.status = status as string;
    } else {
      where.status = { not: 'delist' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
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

// 创建商品（需要认证）
productsRouter.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = createProductSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        ...data,
        userId: req.user!.userId,
      } as any,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        category: true,
      },
    });

    res.json(product);
  }),
);

// 搜索商品
productsRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { keyword, status, page = '1', limit = '10' } = req.query;
    console.log('search params:', { keyword, status, page, limit });

    const where: any = {};
    if (keyword) {
      where.title = {
        contains: keyword as string,
        mode: 'insensitive',
      };
    }
    if (status) {
      where.status = status as string;
    } else {
      where.status = { not: 'delist' };
    }
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
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
      total,
    });
  }),
);

// 获取个人的商品列表
productsRouter.get(
  '/mine',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { status, page = '1', limit = '10' } = req.query;
    const userId = req.user!.userId;

    const where: any = {};
    if (status && status !== 'delist') {
      where.status = status;
    } else {
      where.status = {
        not: 'delist',
      };
    }
    where.userId = userId;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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

// 获取用户发布的商品
productsRouter.get(
  '/my/list',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const products = await prisma.product.findMany({
      where: { userId: req.user!.userId },
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  }),
);

// 获取推荐商品
productsRouter.get(
  '/advise',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { sort: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    const array = [];
    for (const category of categories) {
      if (category._count.products > 0) {
        array.push({
          id: category.id,
          name: category.name,
          products: await prisma.product.findMany({
            where: { categoryId: category.id, status: { not: 'delist' } },
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true,
                },
              },
              category: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 4,
          }),
        });
      }
      if (array.length >= 3) break;
    }

    res.json(array);
  }),
);

// 获取收藏列表
productsRouter.get(
  '/favorites',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
              },
            },
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      data: favorites.map((f) => f.product),
    });
  }),
);

// 获取收藏数量
productsRouter.get(
  '/favorites/count',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;

    const count = await prisma.favorite.count({
      where: { userId },
    });

    res.json({ data: count });
  }),
);

// 收藏管理接口
productsRouter.post(
  '/favorite',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = favoriteSchema.parse(req.body);
    const productId = data.productId;
    const userId = req.user!.userId;

    const existingFavorite = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existingFavorite) {
      await prisma.favorite.delete({ where: { id: existingFavorite.id } });
      return res.json({
        success: true,
        isFavorited: false,
        message: '已取消收藏',
      });
    }

    await prisma.favorite.create({ data: { userId, productId } });
    return res.json({
      success: true,
      isFavorited: true,
      message: '收藏成功',
    });
  }),
);

// ========== 浏览记录相关 ==========

interface FootprintItem extends Product {
  viewedAt: string;
}

// 添加浏览记录
productsRouter.post(
  '/footprints',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { productId } = z.object({ productId: z.string().min(1) }).parse(req.body);
    const userId = req.user!.userId;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new ApiError(404, '商品不存在');
    }

    // 确认用户存在（避免 token 有效但用户已被删除的情况）
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError(401, '用户不存在');
    }

    const footprint = await prisma.userFootprint.findUnique({
      where: { userId },
    });

    let tracks: FootprintItem[] = [];
    if (footprint) {
      tracks = (footprint.tracks as unknown as FootprintItem[]) || [];
    }

    tracks = tracks.filter((t) => t.id !== productId);

    const newTrack: FootprintItem = {
      ...product,
      viewedAt: new Date().toISOString(),
    };
    tracks.unshift(newTrack);

    if (tracks.length > 50) {
      tracks = tracks.slice(0, 50);
    }

    const savedFootprint = await prisma.userFootprint.upsert({
      where: { userId },
      update: { tracks: tracks as unknown as any },
      create: { userId, tracks: tracks as unknown as any },
    });

    res.json({ data: savedFootprint.tracks as unknown as FootprintItem[] });
  }),
);

// 获取浏览记录
productsRouter.get(
  '/footprints',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;

    const footprint = await prisma.userFootprint.findUnique({
      where: { userId },
    });

    if (!footprint) {
      return res.json({ data: [] });
    }

    res.json({ data: footprint.tracks as unknown as FootprintItem[] });
  }),
);

// 获取浏览记录数量
productsRouter.get(
  '/footprints/count',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;

    const footprint = await prisma.userFootprint.findUnique({
      where: { userId },
    });

    const count = footprint ? (footprint.tracks as unknown as any[]).length : 0;

    res.json({ count });
  }),
);

// 清空浏览记录
productsRouter.delete(
  '/footprints',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;

    await prisma.userFootprint.upsert({
      where: { userId },
      update: { tracks: [] as unknown as any },
      create: { userId, tracks: [] as unknown as any },
    });

    res.json({ message: '浏览记录已清空' });
  }),
);

// 删除单条浏览记录
productsRouter.delete(
  '/footprints/:productId',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const productIdParam = Array.isArray(req.params.productId)
      ? req.params.productId[0]
      : req.params.productId;

    const footprint = await prisma.userFootprint.findUnique({
      where: { userId },
    });

    if (!footprint) {
      return res.json({ message: '浏览记录不存在' });
    }

    const tracks = (footprint.tracks as unknown as FootprintItem[]).filter(
      (t) => t.id !== productIdParam,
    );

    await prisma.userFootprint.update({
      where: { userId },
      data: { tracks: tracks as unknown as any },
    });

    res.json({ message: '已删除该浏览记录' });
  }),
);

// 删除商品（需要认证）
productsRouter.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existingProduct = await prisma.product.findUnique({
      where: { id: idParam },
    });

    if (!existingProduct) {
      throw new ApiError(404, '商品不存在');
    }

    if (existingProduct.userId !== req.user?.userId) {
      throw new ApiError(403, '无权操作此商品');
    }

    await prisma.product.delete({ where: { id: idParam } });

    res.json({ message: '删除成功' });
  }),
);

// 更新商品（需要认证）
productsRouter.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = updateProductSchema.parse(req.body);

    const existingProduct = await prisma.product.findUnique({
      where: { id: idParam },
    });

    if (!existingProduct) {
      throw new ApiError(404, '商品不存在');
    }

    if (existingProduct.userId !== req.user?.userId) {
      throw new ApiError(403, '无权操作此商品');
    }

    const product = await prisma.product.update({
      where: { id: idParam },
      data: data as any,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        category: true,
      },
    });

    res.json(product);
  }),
);

// 获取单个商品详情
productsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userIdQuery = req.query?.userId;
    const currentUserId = Array.isArray(userIdQuery)
      ? userIdQuery[0]
      : (userIdQuery as string | undefined);
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const [product, favorite] = await Promise.all([
      prisma.product.findUnique({
        where: { id: idParam },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
          category: true,
        },
      }),
      currentUserId
        ? prisma.favorite.findUnique({
            where: {
              userId_productId: {
                userId: currentUserId as string,
                productId: idParam,
              },
            },
          })
        : Promise.resolve(null),
    ]);
    const isFollowing = currentUserId
      ? await prisma.follow.findFirst({
          where: {
            followerId: currentUserId as string,
            followingId: product?.user.id || '',
          },
        })
      : null;

    if (!product || product.status === 'delist') {
      throw new ApiError(404, '商品不存在');
    }

    // 评论统计
    const reviewAgg = await prisma.review.aggregate({
      where: { productId: idParam },
      _count: { id: true },
      _avg: { rating: true },
    });
    const reviewCount = reviewAgg._count.id || 0;
    const averageRating = reviewAgg._avg.rating ? Number(reviewAgg._avg.rating.toFixed(1)) : 0;

    res.json({
      ...product,
      isFavorited: !!favorite,
      isFollowing: !!isFollowing,
      reviewCount,
      averageRating,
    });
  }),
);
